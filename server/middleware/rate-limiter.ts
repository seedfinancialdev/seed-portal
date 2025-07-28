/**
 * Rate limiting middleware to prevent abuse and improve performance
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};
const WINDOW_SIZE = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 100; // requests per window

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export function createRateLimit(options: {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
} = {}) {
  const windowMs = options.windowMs || WINDOW_SIZE;
  const max = options.max || MAX_REQUESTS;
  const keyGenerator = options.keyGenerator || ((req: Request) => req.ip || 'unknown');
  const skipSuccessfulRequests = options.skipSuccessfulRequests || false;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Initialize or reset if window expired
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    // Check if limit exceeded
    if (store[key].count >= max) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
      });
    }

    // Increment counter (unless we're skipping successful requests)
    if (!skipSuccessfulRequests) {
      store[key].count++;
    } else {
      // Track the original end method to detect success
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]) {
        if (res.statusCode < 400) {
          store[key].count++;
        }
        return (originalEnd as any).apply(this, args);
      };
    }

    // Add headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - store[key].count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(store[key].resetTime / 1000));

    next();
  };
}

// Specific rate limiters
export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // requests per window per IP
});

export const searchRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute per IP
  keyGenerator: (req: Request) => `search:${req.ip}:${(req as any).user?.id || 'anonymous'}`
});

export const enhancementRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 enhancements per minute per user
  keyGenerator: (req: Request) => `enhance:${(req as any).user?.id || req.ip}`
});