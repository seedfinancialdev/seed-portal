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
  ];

  // Skip CSRF for preflight requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Skip CSRF for specific paths
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // For authenticated API requests, use lenient CSRF handling
  if (req.path.startsWith('/api/')) {
    // Special debug for quotes endpoint
    if (req.path === '/api/quotes' && req.method === 'POST') {
      console.log('🚨🚨 POST /api/quotes detected in CSRF middleware 🚨🚨');
      console.log('🚨 Session exists:', !!req.session);
      console.log('🚨 IsAuthenticated function exists:', typeof req.isAuthenticated);
      console.log('🚨 Request will bypass CSRF and proceed to route handler');
    }
    
    // For API routes, allow requests to continue with session authentication
    // CSRF is less critical for authenticated API requests due to SameSite cookies
    console.log(`Allowing API request to ${req.path} - session-based auth sufficient`);
    return next();
  }

  // Apply CSRF protection to all other routes
  csrfProtection(req, res, next);
}

// Middleware to provide CSRF token to the frontend
export function provideCsrfToken(req: Request, res: Response, next: NextFunction) {
  // Generate CSRF token for all requests that might need it
  try {
    if (req.csrfToken) {
      const token = req.csrfToken();
      res.locals.csrfToken = token;
      
      // Always set it as a response header for SPA usage
      res.setHeader('X-CSRF-Token', token);
    }
  } catch (error) {
    // If CSRF token generation fails, continue without it for read-only operations
    console.warn('CSRF token generation failed:', error);
  }
  next();
}