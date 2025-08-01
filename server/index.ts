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

const app = express();

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
  const server = await registerRoutes(app);

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
})();
