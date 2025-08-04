import session from "express-session";
import Redis from "ioredis";
import RedisStore from "connect-redis";
import MemoryStore from "memorystore";

// Simple Redis session configuration
export async function createSessionConfig(): Promise<session.SessionOptions> {
  console.log('[SessionConfig] Creating session configuration...');
  
  let sessionStore: any;
  let storeType: string;
  
  // Try to create Redis store if REDIS_URL is available
  if (process.env.REDIS_URL) {
    try {
      console.log('[SessionConfig] Attempting Redis connection...');
      
      const redisClient = new Redis(process.env.REDIS_URL, {
        keyPrefix: '',
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: false,
      });
      
      // Test the connection
      await redisClient.ping();
      console.log('[SessionConfig] ✅ Redis ping successful');
      
      // Create Redis store with the same configuration that worked in the test
      sessionStore = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 24 * 60 * 60, // 24 hours
      });
      
      storeType = 'RedisStore';
      console.log('[SessionConfig] ✅ Redis session store created:', sessionStore.constructor.name);
      
    } catch (error) {
      console.warn('[SessionConfig] ❌ Redis connection failed:', error.message);
      sessionStore = null;
      storeType = 'Failed';
    }
  } else {
    console.log('[SessionConfig] No REDIS_URL provided');
  }
  
  // Fall back to MemoryStore if Redis failed
  if (!sessionStore) {
    const MemoryStoreClass = MemoryStore(session);
    sessionStore = new MemoryStoreClass({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    storeType = 'MemoryStore';
    console.log('[SessionConfig] ⚠️ Using MemoryStore as fallback');
  }
  
  console.log('[SessionConfig] Final session store type:', storeType);
  
  return {
    secret: process.env.SESSION_SECRET || 'dev-only-seed-financial-secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Secure in production only
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for production cross-origin, 'lax' for dev
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain: undefined // Let browser determine domain automatically
    }
  };
}