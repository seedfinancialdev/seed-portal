import session from "express-session";
import RedisStore from "connect-redis";
import MemoryStore from "memorystore";

// Global augmentations for session store visibility across the app
declare global {
  // eslint-disable-next-line no-var
  var sessionStoreType: string | undefined;
  // eslint-disable-next-line no-var
  var sessionStore: any;
}

// Enhanced Redis session configuration with better error handling
export async function createSessionConfig(): Promise<session.SessionOptions & { storeType: string }> {
  console.log('[SessionConfig] Creating session configuration...');
  
  let sessionStore: any;
  let storeType: string;
  
  // Try to create Redis store via central Redis connections if REDIS_URL is available
  if (process.env.REDIS_URL) {
    try {
      console.log('[SessionConfig] Attempting to use central Redis connections');
      const { getRedisAsync } = await import('./redis');
      const connections = await getRedisAsync();

      if (connections?.sessionRedis) {
        const redisClient = connections.sessionRedis;

        // Best-effort ping for diagnostics (non-fatal)
        try {
          const pingResult = await redisClient.ping();
          console.log('[SessionConfig] ✅ Redis ping result:', pingResult);
        } catch (e: any) {
          console.warn('[SessionConfig] ⚠️ Redis ping failed, continuing:', e?.message || String(e));
        }

        // Create Redis store with explicit error handling and debugging
        sessionStore = new RedisStore({
          client: redisClient as any,
          prefix: 'sess:',
          ttl: 24 * 60 * 60, // 24 hours
          disableTouch: false,
          disableTTL: false
        });

        // Add session store operation debugging
        const originalGet = sessionStore.get.bind(sessionStore);
        const originalSet = sessionStore.set.bind(sessionStore);
        const originalDestroy = sessionStore.destroy.bind(sessionStore);

        sessionStore.get = function(sid: string, callback: (err: any, session?: session.SessionData | null) => void) {
          console.log('[SessionStore] 🔍 GET operation:', { sid: sid?.substring(0, 10) + '...' });
          return originalGet(sid, (err: any, session: session.SessionData | null) => {
            console.log('[SessionStore] 🔍 GET result:', { 
              sid: sid?.substring(0, 10) + '...', 
              hasSession: !!session, 
              error: err?.message,
              sessionKeys: session ? Object.keys(session) : []
            });
            callback(err, session);
          });
        };

        sessionStore.set = function(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
          console.log('[SessionStore] 🔍 SET operation:', { 
            sid: sid?.substring(0, 10) + '...', 
            sessionKeys: Object.keys((sessionData as any) || {}),
            hasPassport: !!(sessionData as any)?.passport
          });
          return originalSet(sid, sessionData, (err: any) => {
            console.log('[SessionStore] 🔍 SET result:', { 
              sid: sid?.substring(0, 10) + '...', 
              error: err?.message,
              success: !err
            });
            callback && callback(err);
          });
        };

        sessionStore.destroy = function(sid: string, callback: (err?: any) => void) {
          console.log('[SessionStore] 🔍 DESTROY operation:', { sid: sid?.substring(0, 10) + '...' });
          return originalDestroy(sid, (err: any) => {
            console.log('[SessionStore] 🔍 DESTROY result:', { 
              sid: sid?.substring(0, 10) + '...', 
              error: err?.message,
              success: !err
            });
            callback && callback(err);
          });
        };

        console.log('[SessionConfig] ✅ Redis session store created successfully');
        storeType = 'RedisStore';
      } else {
        console.warn('[SessionConfig] Central Redis connections unavailable - will fall back to MemoryStore');
        sessionStore = null;
        storeType = 'RedisUnavailable';
      }
    } catch (error) {
      const e = error as any;
      console.error('[SessionConfig] ❌ Redis setup via central connections failed:', {
        message: e?.message || String(e),
        code: e?.code,
        stack: typeof e?.stack === 'string' ? e.stack.split('\n').slice(0, 3).join('\n') : undefined
      });
      sessionStore = null;
      storeType = `RedisFailure: ${e?.message || String(e)}`;
    }
  } else {
    console.log('[SessionConfig] No REDIS_URL provided - using memory store');
    storeType = 'NoRedisURL';
  }
  
  // Fall back to MemoryStore if Redis failed - with enhanced debugging
  if (!sessionStore) {
    console.log('[SessionConfig] 🚨 CREATING MEMORYSTORE FALLBACK');
    const MemoryStoreClass = MemoryStore(session);
    sessionStore = new MemoryStoreClass({
      checkPeriod: 86400000, // prune expired entries every 24h
      stale: false, // Don't return stale sessions
      max: 500, // Limit memory usage
      ttl: 24 * 60 * 60 * 1000, // 24 hours TTL
    });
    
    // Add debugging wrapper for MemoryStore operations
    const originalMemGet = sessionStore.get.bind(sessionStore);
    const originalMemSet = sessionStore.set.bind(sessionStore);
    const originalMemDestroy = sessionStore.destroy.bind(sessionStore);

    sessionStore.get = function(sid: string, callback: (err: any, session?: session.SessionData | null) => void) {
      console.log('[MemoryStore] 🔍 GET operation:', { sid: sid?.substring(0, 10) + '...' });
      return originalMemGet(sid, (err: any, session: session.SessionData | null) => {
        console.log('[MemoryStore] 🔍 GET result:', { 
          sid: sid?.substring(0, 10) + '...', 
          hasSession: !!session, 
          error: err?.message,
          sessionKeys: session ? Object.keys(session) : [],
          hasPassport: !!(session as any)?.passport
        });
        callback(err, session);
      });
    };

    sessionStore.set = function(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void) {
      console.log('[MemoryStore] 🔍 SET operation:', { 
        sid: sid?.substring(0, 10) + '...', 
        sessionKeys: Object.keys((sessionData as any) || {}),
        hasPassport: !!(sessionData as any)?.passport,
        passportUser: (sessionData as any)?.passport?.user
      });
      return originalMemSet(sid, sessionData, (err: any) => {
        console.log('[MemoryStore] 🔍 SET result:', { 
          sid: sid?.substring(0, 10) + '...', 
          error: err?.message,
          success: !err
        });
        callback && callback(err);
      });
    };

    sessionStore.destroy = function(sid: string, callback: (err?: any) => void) {
      console.log('[MemoryStore] 🔍 DESTROY operation:', { sid: sid?.substring(0, 10) + '...' });
      return originalMemDestroy(sid, (err: any) => {
        console.log('[MemoryStore] 🔍 DESTROY result:', { 
          sid: sid?.substring(0, 10) + '...', 
          error: err?.message,
          success: !err
        });
        callback && callback(err);
      });
    };
    
    if (storeType.startsWith('RedisFailure:')) {
      storeType = `MemoryStore (Redis failed: ${storeType.replace('RedisFailure: ', '')})`;
    } else {
      storeType = 'MemoryStore';
    }
    console.log('[SessionConfig] ⚠️ Using MemoryStore as fallback. Store type:', storeType);
  }
  
  console.log('[SessionConfig] Final session store type:', storeType);
  
  // Store the type globally for access by health checks
  globalThis.sessionStoreType = storeType;
  globalThis.sessionStore = sessionStore;
  
  // Simple production detection
  const isProduction = process.env.NODE_ENV === 'production';
  console.log('[SessionConfig] Production detection:', {
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    PORT: process.env.PORT || 'NOT SET',
    isProduction
  });

  // Environment-driven cookie configuration for cross-origin compatibility
  const isCrossSite = process.env.COOKIE_CROSS_SITE === '1';
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

  const cookieConfig: session.CookieOptions = {
    // For cross-site cookies, must be secure + sameSite 'none'
    secure: isCrossSite ? true : false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: cookieDomain, // Explicit domain for cross-subdomain when provided
    path: '/', // Explicitly set path to root
    sameSite: (isCrossSite ? 'none' : 'lax'),
  };

  console.log('[SessionConfig] 🍪 COOKIE CONFIG', {
    isCrossSite,
    domain: cookieConfig.domain || 'AUTO',
    sameSite: cookieConfig.sameSite,
    secure: cookieConfig.secure,
  });

  const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'dev-only-seed-financial-secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    name: 'oseed.sid', // Custom session name to avoid conflicts
    cookie: cookieConfig,
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