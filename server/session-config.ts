import session from "express-session";
import Redis from "ioredis";
import RedisStore from "connect-redis";
import MemoryStore from "memorystore";

// Enhanced Redis session configuration with better error handling
export async function createSessionConfig(): Promise<session.SessionOptions & { storeType: string }> {
  console.log('[SessionConfig] Creating session configuration...');
  
  let sessionStore: any;
  let storeType: string;
  
  // Try to create Redis store if REDIS_URL is available
  if (process.env.REDIS_URL) {
    try {
      console.log('[SessionConfig] Attempting Redis connection with REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');
      
      const redisClient = new Redis(process.env.REDIS_URL, {
        keyPrefix: '',
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: false, // Connect immediately for better error detection
        connectTimeout: 15000,
        commandTimeout: 5000,
        keepAlive: true,
        family: 4,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
      });
      
      // Wait for Redis to be fully ready
      console.log('[SessionConfig] Waiting for Redis to be ready...');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout after 15 seconds'));
        }, 15000);
        
        redisClient.on('ready', () => {
          clearTimeout(timeout);
          console.log('[SessionConfig] ✅ Redis ready event received');
          resolve(true);
        });
        
        redisClient.on('error', (err) => {
          clearTimeout(timeout);
          console.error('[SessionConfig] ❌ Redis error during connection:', err);
          reject(err);
        });
      });
      
      // Double-check with ping
      const pingResult = await redisClient.ping();
      console.log('[SessionConfig] ✅ Redis ping result:', pingResult);
      
      // Create Redis store with explicit error handling
      sessionStore = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 24 * 60 * 60, // 24 hours
        disableTouch: false,
        disableTTL: false,
      });
      
      // Verify the store was created correctly
      const storeName = sessionStore.constructor.name;
      console.log('[SessionConfig] ✅ Redis session store created successfully');
      console.log('[SessionConfig] Store constructor name:', storeName);
      console.log('[SessionConfig] Store type check:', sessionStore instanceof RedisStore);
      
      storeType = 'RedisStore';
      
      // Test store functionality
      try {
        await new Promise((resolve, reject) => {
          sessionStore.set('test-session-key', { test: true }, (err: any) => {
            if (err) {
              console.warn('[SessionConfig] ⚠️ Redis store test failed:', err);
              reject(err);
            } else {
              console.log('[SessionConfig] ✅ Redis store test successful');
              // Clean up test data
              sessionStore.destroy('test-session-key', () => {});
              resolve(true);
            }
          });
        });
      } catch (storeTestError) {
        console.warn('[SessionConfig] ⚠️ Redis store test failed, but continuing:', storeTestError);
        // Continue with Redis store even if test fails
      }
      
    } catch (error) {
      console.error('[SessionConfig] ❌ Redis connection/setup failed:', {
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      sessionStore = null;
      storeType = `RedisFailure: ${error.message}`;
    }
  } else {
    console.log('[SessionConfig] No REDIS_URL provided - using memory store');
    storeType = 'NoRedisURL';
  }
  
  // Fall back to MemoryStore if Redis failed
  if (!sessionStore) {
    const MemoryStoreClass = MemoryStore(session);
    sessionStore = new MemoryStoreClass({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    if (storeType.startsWith('RedisFailure:')) {
      storeType = `MemoryStore (Redis failed: ${storeType.replace('RedisFailure: ', '')})`;
    } else {
      storeType = 'MemoryStore';
    }
    console.log('[SessionConfig] ⚠️ Using MemoryStore as fallback. Store type:', storeType);
  }
  
  console.log('[SessionConfig] Final session store type:', storeType);
  
  // Store the type globally for access by health checks
  global.sessionStoreType = storeType;
  global.sessionStore = sessionStore;
  
  // Simplified production detection (removing PORT check that was causing issues)
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.REPLIT_DEPLOYMENT === '1';
  
  console.log('[SessionConfig] Production detection:', {
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT || 'NOT SET',
    REPL_ID: process.env.REPL_ID ? 'EXISTS' : 'NOT SET',
    REPL_SLUG: process.env.REPL_SLUG || 'NOT SET',
    PORT: process.env.PORT || 'NOT SET',
    isProduction
  });

  const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'dev-only-seed-financial-secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    name: 'oseed.sid', // Custom session name to avoid conflicts
    cookie: {
      secure: isProduction, // Enable secure cookies in production
      httpOnly: true,
      sameSite: isProduction ? 'lax' : 'lax', // Use 'lax' for better compatibility
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain: undefined // Let browser determine domain automatically
    },
    storeType // Include storeType in return value
  };

  console.log('[SessionConfig] Session configuration completed:', {
    storeType,
    isProduction,
    cookieSecure: sessionConfig.cookie.secure,
    cookieSameSite: sessionConfig.cookie.sameSite,
    sessionName: sessionConfig.name
  });

  return sessionConfig;
}