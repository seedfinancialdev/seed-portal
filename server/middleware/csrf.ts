import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

// CSRF protection middleware
export const csrfProtection = csrf({
  cookie: false, // Use session instead of cookies
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Don't require CSRF for read operations
  value: (req: Request) => {
    // Allow CSRF token from multiple sources
    return req.body._csrf || 
           req.query._csrf || 
           req.headers['x-csrf-token'] as string ||
           req.headers['x-xsrf-token'] as string;
  }
});

// Middleware to skip CSRF for API routes that use other authentication
export function conditionalCsrf(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for API routes that are protected by other means
  const skipPaths = [
    '/api/auth/google/sync', // Uses bearer token
    '/api/health', // Health check
    '/api/auth/login', // Login endpoint needs to work without CSRF
    '/api/auth/logout', // Logout is safe without CSRF
    '/api/hubspot/push-quote', // Protected by requireAuth middleware
    '/api/hubspot/update-quote', // Protected by requireAuth middleware
  ];

  // Skip CSRF for preflight requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Skip CSRF for specific paths
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Skip CSRF for authenticated API requests with valid session
  if (req.path.startsWith('/api/') && req.isAuthenticated && req.isAuthenticated()) {
    // For authenticated API requests, CSRF is less critical due to SameSite=strict cookies
    return next();
  }

  // Apply CSRF protection to all other routes
  csrfProtection(req, res, next);
}

// Middleware to provide CSRF token to the frontend
export function provideCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
    
    // Also set it as a response header for SPA usage
    res.setHeader('X-CSRF-Token', res.locals.csrfToken);
  }
  next();
}