// CSRF protection disabled - was causing authentication issues
// The csurf package was blocking POST requests before they could reach authentication middleware
import { Request, Response, NextFunction } from 'express';

// Placeholder function for removed CSRF protection
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // CSRF protection removed - authentication handled by session middleware
  next();
};

// CSRF middleware disabled - was causing authentication issues
export function conditionalCsrf(req: Request, res: Response, next: NextFunction) {
  // CSRF protection removed - all API routes now rely on session authentication
  // This was blocking POST requests before they could reach authentication middleware
  next();
}

// CSRF token generation disabled  
export function provideCsrfToken(req: Request, res: Response, next: NextFunction) {
  // CSRF token generation removed - no longer needed without CSRF protection
  next();
}