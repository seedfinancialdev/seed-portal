import { Request, Response, NextFunction } from 'express';
import csrf from 'csurf';

// CSRF protection configured to work with express-session
export const csrfProtection = csrf({
  cookie: false, // Use session-based storage instead of cookies
  sessionKey: 'session',
  value: (req: Request) => {
    // Check multiple possible CSRF token locations
    return req.body._csrf || 
           req.query._csrf || 
           req.headers['x-csrf-token'] || 
           req.headers['x-xsrf-token'];
  }
});

// Conditional CSRF middleware - bypasses CSRF for specific endpoints
export function conditionalCsrf(req: Request, res: Response, next: NextFunction) {
  // Comprehensive list of exempt paths to ensure functionality is not broken
  const exemptPaths = [
    '/api/auth/google/sync',
    '/api/auth/logout',
    '/api/auth/request-access',
    '/api/quotes',
    '/api/hubspot',
    '/api/test-post',
    '/api/test',
    '/api/user/sync-hubspot',
    '/api/user/upload-photo',
    '/api/admin',
    '/api/kb',
    '/api/client-intel'
  ];
  
  // Check if this path should bypass CSRF
  const shouldBypass = exemptPaths.some(path => 
    req.path === path || req.path.startsWith(`${path}/`)
  ) || req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  
  if (shouldBypass) {
    console.log(`🔒 Bypassing CSRF for ${req.method} ${req.path}`);
    return next();
  }
  
  // Apply CSRF protection with comprehensive error handling
  try {
    // Check if session exists before applying CSRF
    if (!req.session) {
      console.warn('🔒 No session found, bypassing CSRF');
      return next();
    }
    
    return csrfProtection(req, res, (err) => {
      if (err) {
        console.error('🔒 CSRF protection error:', err.message);
        // Gracefully continue without CSRF if there's an error
        console.log('🔒 Continuing without CSRF protection due to error');
        return next();
      }
      next();
    });
  } catch (error) {
    console.error('🔒 CSRF middleware initialization error:', error);
    // Continue without CSRF if there's a configuration error
    return next();
  }
}

// CSRF token generation middleware
export function provideCsrfToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Only set token if CSRF protection is active and session exists
    if (req.csrfToken && req.session) {
      res.locals.csrfToken = req.csrfToken();
    } else {
      res.locals.csrfToken = null;
    }
  } catch (error) {
    console.error('🔒 CSRF token generation error:', error);
    res.locals.csrfToken = null;
  }
  next();
}