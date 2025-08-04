// Automatic Redis session application at startup
import { Express } from "express";
import Redis from "ioredis";
import RedisStore from "connect-redis";
import session from "express-session";

export async function applyRedisSessionsAtStartup(app: Express): Promise<void> {
  console.log('[RedisStartup] ============= APPLYING REDIS SESSIONS AT STARTUP =============');
  
  if (!process.env.REDIS_URL) {
    console.log('[RedisStartup] No REDIS_URL, skipping Redis session setup');
    return;
  }

  try {
    console.log('[RedisStartup] Creating Redis connection...');
    const redisClient = new Redis(process.env.REDIS_URL);
    await redisClient.ping();
    console.log('[RedisStartup] ✅ Redis ping successful');
    
    // Create RedisStore
    const redisStore = new RedisStore({
      client: redisClient,
      prefix: 'sess:',
      ttl: 24 * 60 * 60, // 24 hours
    });
    
    console.log('[RedisStartup] ✅ RedisStore created:', redisStore.constructor.name);
    
    // Apply session middleware with Redis store
    app.use(session({
      secret: process.env.SESSION_SECRET || 'dev-only-seed-financial-secret',
      resave: false,
      saveUninitialized: false,
      rolling: true, // Extend session on each request
      store: redisStore,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-site cookies for Replit domains
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }));
    
    console.log('[RedisStartup] ✅ Redis session middleware applied successfully');
    
  } catch (error) {
    console.error('[RedisStartup] ❌ Redis session setup failed:', error);
    console.log('[RedisStartup] Continuing without Redis sessions');
  }
}