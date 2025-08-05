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

import { redisDebug } from "./utils/debug-logger";
import { applyRedisSessionsAtStartup } from "./apply-redis-sessions-startup";

redisDebug('Server initialization starting...');

const app = express();

// Initialize Sentry before other middleware
const sentryInitialized = initializeSentry(app);

// Sentry integration is handled in the sentry.ts file during init

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tiny.cloud", "https://accounts.google.com", "https://apis.google.com", "https://gstatic.com", "https://ssl.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tiny.cloud"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.hubapi.com", "https://api.airtable.com", "https://api.open-meteo.com", "https://nominatim.openstreetmap.org", "https://accounts.google.com", "https://www.googleapis.com", "https://gstatic.com", "https://ssl.gstatic.com"],
      frameSrc: ["'self'", "https://cdn.tiny.cloud", "https://accounts.google.com", "https://gstatic.com", "https://ssl.gstatic.com"],
      childSrc: ["'self'", "https://accounts.google.com"],
      formAction: ["'self'", "https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding resources
}));

// Enable CORS for production deployments with credentials
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Robust production detection using multiple signals
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.REPLIT_DEPLOYMENT === '1' ||
                      (process.env.REPL_ID && !process.env.REPL_SLUG?.includes('workspace'));
  
  // Allow requests from the same domain in production
  if (isProduction) {
    // For Replit deployments, allow the production domain
    const allowedOrigins = [
      'https://os.seedfinancial.io',
      'https://osseedfinancial.io',
      req.headers.host ? `https://${req.headers.host}` : undefined
    ].filter(Boolean);
    
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // Same-origin requests (no origin header)
      res.header('Access-Control-Allow-Origin', `https://${req.headers.host}`);
    }
  } else {
    // Development: allow all origins
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,x-csrf-token');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

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

// Function to initialize services with timeout protection
async function initializeServicesWithTimeout(timeoutMs: number = 30000) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Service initialization timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  const initPromise = async () => {
    try {
      // Initialize Redis connections with timeout protection (for workers and cache)
      console.log('[Server] Initializing Redis connections...');
      try {
        const { initRedis } = await import('./redis');
        await Promise.race([
          initRedis(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 8000))
        ]);
        console.log('[Server] Redis connections established');
      } catch (redisError) {
        console.warn('[Server] Redis connection failed, continuing without Redis features:', redisError);
        return; // Skip other Redis-dependent services
      }

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
    } catch (error) {
      console.error('[Server] ❌ Service initialization error:', error);
      // Don't crash - continue with basic functionality
      console.log('[Server] Continuing with basic functionality - some features may be unavailable');
    }
  };

  try {
    await Promise.race([initPromise(), timeoutPromise]);
  } catch (error) {
    console.error('[Server] ❌ Service initialization failed or timed out:', error);
    console.log('[Server] Continuing with basic functionality - some features may be unavailable');
  }
}

(async () => {
  console.log('[Server] ===== SERVER STARTUP BEGIN =====');
  try {
    // Apply session middleware first (essential for authentication)
    console.log('[Server] Applying session middleware...');
    const session = await import('express-session');
    const { createSessionConfig } = await import('./session-config');
    
    console.log('[Server] Initializing session configuration with enhanced Redis handling...');
    const sessionConfig = await createSessionConfig();
    const { storeType, ...expressSessionConfig } = sessionConfig;
    
    app.use(session.default(expressSessionConfig));
    console.log('[Server] ✅ Session middleware applied successfully');
    console.log('[Server] Session store type:', storeType);
    console.log('[Server] Production mode:', expressSessionConfig.cookie?.secure ? 'ENABLED' : 'DISABLED');

    // Add API route protection middleware BEFORE route registration
    app.use('/api/*', (req, res, next) => {
      // Ensure API routes are always handled by Express, never by static serving
      console.log('🛡️ API Route Protection - Ensuring Express handles:', req.originalUrl);
      next();
    });

    // Register routes after session middleware is ready
    const server = await registerRoutes(app, null);
    console.log('[Server] ✅ Routes registered successfully');

    // Sentry error handling is integrated via expressIntegration

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

    // Add explicit 404 handler for unmatched API routes BEFORE static serving
    app.use('/api/*', (req, res) => {
      console.log('🔴 Unmatched API route hit 404 handler:', req.originalUrl);
      res.status(404).json({ message: 'API endpoint not found', route: req.originalUrl });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    // Check database health on startup (lightweight check)
    const isDbHealthy = await checkDatabaseHealth();
    if (!isDbHealthy) {
      console.warn('Database health check failed - continuing with degraded functionality');
    }
    
    // START THE SERVER FIRST - this prevents deployment timeouts
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      console.log('[Server] 🚀 HTTP server started successfully');
      
      // Initialize heavy services AFTER server is listening
      console.log('[Server] Starting background service initialization...');
      initializeServicesWithTimeout(30000).then(() => {
        console.log('[Server] ✅ All background services initialized successfully');
      }).catch((error) => {
        console.error('[Server] ❌ Background service initialization failed:', error);
        console.log('[Server] Application will continue with basic functionality');
      });
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
