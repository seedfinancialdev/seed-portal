import { Request, Response, NextFunction } from 'express';
import csrf from 'csurf';

// Standard CSRF protection with session-based storage
export const csrfProtection = csrf({
  sessionKey: 'session',
  value: req => req.headers['x-csrf-token'] as string
});

// Conditional CSRF middleware - bypasses CSRF for specific endpoints
export function conditionalCsrf(req: Request, res: Response, next: NextFunction) {
  // Bypass CSRF for quote creation endpoint until properly integrated
  if (req.path === '/quotes' && req.method === 'POST') {
    console.log('🔒 Bypassing CSRF for quote creation endpoint');
    return next();
  }
  
  // Apply CSRF protection for all other endpoints
  try {
    return csrfProtection(req, res, next);
  } catch (error) {
    console.error('🔒 CSRF middleware error:', error);
    return res.status(500).json({ message: 'CSRF configuration error' });
  }
}

// CSRF token generation middleware
export function provideCsrfToken(req: Request, res: Response, next: NextFunction) {
  // Only set token if CSRF protection is active (req.csrfToken exists)
  if (req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
}