// Disable Redis OpenTelemetry instrumentation before any imports
import "./disable-redis-instrumentation";

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseHealth, closeDatabaseConnections } from "./db";
import { initializeSentry } from "./sentry";
import { logger, requestLogger } from "./logger";
import Redis from "ioredis";
import "./jobs"; // Initialize job workers and cron jobs

console.log('[Index] ===============================================');
console.log('[Index] server/index.ts file loaded at top level');
console.log('[Index] REDIS_URL available:', !!process.env.REDIS_URL);
console.log('[Index] ===============================================');

// Redis handshake function - ensures Redis is ready before app starts
async function redisHandshake(): Promise<Redis | null> {
  const redisUrl = process.env.REDIS_URL;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!redisUrl) {
    const message = 'REDIS_URL environment variable not set';
    if (isDevelopment) {
      console.warn(`[Redis Handshake] ${message} - falling back to MemoryStore`);
      return null;
    } else {
      throw new Error(`[Redis Handshake] ${message} - Redis required in production`);
    }
  }

  try {
    console.log('[Redis Handshake] Connecting to Redis...');
    const redis = new Redis(redisUrl, {
      keyPrefix: '', // No prefix for session redis
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: false, // Connect immediately
    });

    // Wait for connection and send PING
    console.log('[Redis Handshake] Sending PING...');
    const pong = await redis.ping();
    
    if (pong === 'PONG') {
      console.log('[Redis Handshake] ✓ Redis connection successful');
      return redis;
    } else {
      throw new Error(`Unexpected PING response: ${pong}`);
    }
  } catch (error) {
    const message = `Redis handshake failed: ${error}`;
    console.error(`[Redis Handshake] Full error:`, error);
    
    if (isDevelopment) {
      console.warn(`[Redis Handshake] ${message} - falling back to MemoryStore`);
      return null;
    } else {
      console.error(`[Redis Handshake] ${message} - crashing in production`);
      throw new Error(message);
    }
  }
}

const app = express();

// SUPER EARLY DEBUG - Before ANY other middleware
app.use((req, res, next) => {
  if (req.method === 'POST' && req.url === '/api/quotes') {
    console.error('🚨🚨🚨 SUPER EARLY: POST /api/quotes detected in index.ts 🚨🚨🚨');
    console.error('🚨 Time:', new Date().toISOString());
    console.error('🚨 Headers:', JSON.stringify(req.headers, null, 2));
    console.error('🚨 Process ID:', process.pid);
    console.error('🚨 Port:', process.env.PORT || 5000);
    console.error('🚨 TRACE: Request reaching index.ts middleware');
  }
  next();
});

// Initialize Sentry before other middleware
const sentryInitialized = initializeSentry(app);

// The Sentry request handler must be the first middleware (only if initialized)
if (sentryInitialized && Sentry.Handlers?.requestHandler) {
  app.use(Sentry.Handlers.requestHandler());
}

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tiny.cloud", "https://accounts.google.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tiny.cloud"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.hubapi.com", "https://api.airtable.com", "https://api.open-meteo.com", "https://nominatim.openstreetmap.org", "https://accounts.google.com", "https://www.googleapis.com"],
      frameSrc: ["'self'", "https://cdn.tiny.cloud", "https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding resources
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add structured logging
app.use(requestLogger());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('[Server] ===== SERVER STARTUP BEGIN =====');
  try {
    console.log('[Server] Starting Redis handshake...');
    // Perform Redis handshake before setting up the server
    const sessionRedis = await redisHandshake();
    console.log('[Server] Redis handshake completed, sessionRedis:', !!sessionRedis);
    
    // Apply Redis sessions before registering routes
    console.log('[Server] Applying Redis sessions at startup...');
    const { applyRedisSessionsAtStartup } = await import('./apply-redis-sessions-startup');
    await applyRedisSessionsAtStartup(app);
    console.log('[Server] Redis sessions startup configuration completed');
    
    // Initialize Redis connections first
    console.log('[Server] Initializing Redis connections...');
    const { initRedis } = await import('./redis');
    await initRedis();
    console.log('[Server] Redis connections established');
    
    // Initialize BullMQ queue and start workers
    console.log('[Server] Initializing BullMQ queue system...');
    const { initializeQueue } = await import('./queue');
    await initializeQueue();
    console.log('[Server] Queue initialized, starting workers...');
    
    const { startAIInsightsWorker } = await import('./workers/ai-insights-worker');
    const worker = await startAIInsightsWorker();
    
    // Initialize HubSpot background jobs
    console.log('[Server] Initializing HubSpot background jobs...');
    const { initializeHubSpotQueue, scheduleRecurringSync } = await import('./hubspot-background-jobs.js');
    const { startHubSpotSyncWorker } = await import('./workers/hubspot-sync-worker.js');
    await initializeHubSpotQueue();
    const hubspotWorker = await startHubSpotSyncWorker();
    await scheduleRecurringSync();
    console.log('[Server] HubSpot background jobs initialized successfully');
    
    // Initialize cache pre-warming
    console.log('[Server] Initializing cache pre-warming...');
    const { initializePreWarmQueue, scheduleNightlyPreWarm } = await import('./cache-prewarming.js');
    const { initializePreWarmWorker } = await import('./workers/cache-prewarming-worker.js');
    await initializePreWarmQueue();
    await initializePreWarmWorker();
    await scheduleNightlyPreWarm();
    
    // Initialize CDN and asset optimization
    console.log('[Server] Initializing CDN and asset optimization...');
    const { assetOptimization, setCacheHeaders, servePrecompressed } = await import('./middleware/asset-optimization.js');
    const { cdnService } = await import('./cdn.js');
    
    // Apply asset optimization middleware
    app.use(assetOptimization.getCompressionMiddleware());
    app.use(assetOptimization.trackCompressionStats());
    app.use(setCacheHeaders);
    app.use(servePrecompressed);
    
    // Initialize CDN service
    await cdnService.initialize();
    cdnService.setupCDNMiddleware(app);
    
    console.log('[Server] CDN and asset optimization initialized successfully');
    console.log('[Server] BullMQ workers and cache pre-warming started successfully');
    
    const server = await registerRoutes(app, sessionRedis);
    console.log('[Server] ✅ Routes registered successfully');
    console.log('[Server] App object type:', typeof app);
    console.log('[Server] App has _router?', !!app._router);
    
    // ROUTE MAP - List all registered routes to find duplicates
    function listRoutes(app: any) {
      console.log('\n🗺️  ROUTE MAP ------------------------');
      console.log('Router exists:', !!app._router);
      console.log('Router stack exists:', !!app._router?.stack);
      console.log('Router stack length:', app._router?.stack?.length || 0);
      
      if (app._router && app._router.stack) {
        const routes = app._router.stack.filter((r: any) => r.route);
        console.log('Total routes found:', routes.length);
        routes.forEach((r: any) => {
          const path = r.route?.path;
          const methods = Object.keys(r.route.methods).join(',').toUpperCase();
          console.log(`${methods.padEnd(7)} ${path}`);
        });
      } else {
        console.log('❌ No routes found - router structure may be different');
      }
      console.log('------------------------------------\n');
    }
    listRoutes(app);
    
    // SIMPLE TEST ROUTE to confirm this Express app is handling requests
    app.get('/api/test-server-identity', (req, res) => {
      console.log('🆔 SERVER IDENTITY TEST ROUTE HIT - This confirms the right Express app');
      res.json({ message: 'This is the correct Express server instance', timestamp: new Date().toISOString() });
    });

    // The Sentry error handler must be before any other error middleware (only if initialized)
    if (sentryInitialized && Sentry.Handlers?.errorHandler) {
      app.use(Sentry.Handlers.errorHandler());
    }

  // Enhanced error handler with database error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Handle database connection errors gracefully
    if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND' || 
        err.message?.includes('connection') || err.message?.includes('timeout')) {
      console.error('Database connection error:', err);
      message = "Database temporarily unavailable. Please try again.";
      res.status(503).json({ message });
      return; // Don't throw - just log and return error response
    }

    console.error('Server error:', err);
    res.status(status).json({ message });
    
    // Only throw for critical errors that should crash the app
    if (status >= 500 && !err.message?.includes('connection')) {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const currentEnv = process.env.NODE_ENV || app.get("env");
  console.log(`[Server] Environment check: NODE_ENV="${process.env.NODE_ENV}" app.get("env")="${app.get("env")}" using="${currentEnv}"`);
  
  if (currentEnv === "development") {
    console.log('[Server] Setting up Vite development middleware...');
    await setupVite(app, server);
    console.log('[Server] ✅ Vite development middleware setup complete');
  } else {
    console.log('[Server] Setting up static file serving for production...');
    serveStatic(app);
    console.log('[Server] ✅ Static file serving setup complete');
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Check database health on startup
  const isDbHealthy = await checkDatabaseHealth();
  if (!isDbHealthy) {
    console.warn('Database health check failed - continuing with degraded functionality');
  }
  
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });

  } catch (error) {
    console.error('[Server] ❌ CRITICAL STARTUP ERROR:', error);
    console.error('[Server] Full error details:', error);
    process.exit(1);
  }
})();

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully');
  await closeDatabaseConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully');
  await closeDatabaseConnections();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejections - just log them
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // For database errors, try to recover instead of crashing
  if (error.message?.includes('connection') || error.message?.includes('timeout')) {
    console.log('Database connection error detected - attempting recovery');
    return; // Don't exit
  }
  process.exit(1); // Exit for other critical errors
});
