import type { Express } from "express";
import { createServer, type Server } from "http";
import type Redis from "ioredis";
import { storage } from "./storage";
import { 
  insertQuoteSchema, updateQuoteSchema, updateProfileSchema, changePasswordSchema,
  insertKbCategorySchema, insertKbArticleSchema, insertKbBookmarkSchema, insertKbSearchHistorySchema
} from "@shared/schema";
import { z } from "zod";
import { sendSystemAlert } from "./slack";
import { hubSpotService } from "./hubspot";
import { setupAuth, requireAuth } from "./auth";
import passport from "passport";
import { registerAdminRoutes } from "./admin-routes";
import { calculateCombinedFees } from "@shared/pricing";
import { clientIntelEngine } from "./client-intel";
import { apiRateLimit, searchRateLimit, enhancementRateLimit } from "./middleware/rate-limiter";
import { conditionalCsrf, provideCsrfToken } from "./middleware/csrf";
import multer from "multer";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import path from "path";
import { promises as fs } from "fs";
import express from "express";
import { cache, CacheTTL, CachePrefix } from "./cache";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { hubspotSync } from "./hubspot-sync";

// Helper function to generate 4-digit approval codes
function generateApprovalCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
      try {
        await fs.mkdir(uploadsDir, { recursive: true });
        cb(null, uploadsDir);
      } catch (error) {
        cb(error as Error, uploadsDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Password utilities
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const bcrypt = await import('bcryptjs');
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if this is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    // Use bcrypt for comparison
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(supplied, stored);
  }
  
  // Legacy scrypt hash format (hash.salt)
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    throw new Error('Invalid password hash format');
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function registerRoutes(app: Express, sessionRedis?: Redis | null): Promise<Server> {
  console.log('[Routes] ============= REGISTERROUTES CALLED =============');
  console.log('[Routes] Function entry point reached');
  console.log('[Routes] sessionRedis parameter:', !!sessionRedis);
  console.log('[Routes] REDIS_URL available:', !!process.env.REDIS_URL);
  console.log('[Routes] 🚀 Starting direct session setup...');
  
  // Session setup is now centralized and handled elsewhere
  console.log('[Routes] Session setup handled centrally, proceeding with routes...');
  
  // Setup authentication after sessions
  await setupAuth(app, null);
  console.log('[Routes] ✅ Auth setup completed');

  // Apply CSRF protection after sessions are initialized
  app.use((req, res, next) => {
    console.log('Before CSRF - Request:', {
      method: req.method,
      url: req.url,
      headers: req.headers['x-csrf-token'] ? 'CSRF token present' : 'No CSRF token'
    });
    next();
  });
  // Apply CSRF protection, but skip for user creation endpoint
  app.use((req, res, next) => {
    if (req.path === '/api/create-user') {
      return next(); // Skip CSRF for user creation
    }
    conditionalCsrf(req, res, next);
  });
  app.use((req, res, next) => {
    console.log('After CSRF - Request passed CSRF check');
    next();
  });
  app.use(provideCsrfToken);

  // Debug middleware to track all API requests
  app.use('/api', (req, res, next) => {
    if (req.method === 'POST' && req.url.includes('quotes') && !req.url.includes('check-existing')) {
      console.log('🔴🔴🔴 QUOTES POST MIDDLEWARE HIT:', {
        method: req.method,
        url: req.url,
        path: req.path,
        originalUrl: req.originalUrl,
        query: req.query,
        timestamp: new Date().toISOString()
      });
    }
    console.log('API Debug - Request intercepted:', {
      method: req.method,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    next();
  });

  // Apply rate limiting to all API routes
  app.use('/api', apiRateLimit);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // CSRF token endpoint for SPAs
  app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken ? req.csrfToken() : null });
  });
  

  
  // Login endpoint - FIXED to use proper passport authentication
  app.post("/api/login", (req, res, next) => {
    console.log('[Login] 🔑 Starting PASSPORT authentication for:', req.body.email);
    console.log('[Login] Environment debug:', {
      NODE_ENV: process.env.NODE_ENV,
      REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
      sessionId: req.sessionID,
      cookieSecure: req.session?.cookie?.secure,
      cookieSameSite: req.session?.cookie?.sameSite
    });

    // Use passport.authenticate() instead of manual authentication
    passport.authenticate('local', (err, user, info) => {
      console.log('[Login] 🔑 Passport authentication callback:', {
        hasError: !!err,
        hasUser: !!user,
        userEmail: user?.email,
        info: info,
        timestamp: new Date().toISOString()
      });
      
      if (err) {
        console.error('[Login] ❌ Passport authentication error:', err);
        return res.status(500).json({ message: "Authentication error" });
      }
      
      if (!user) {
        console.log('[Login] ❌ Authentication failed - no user returned');
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // CRITICAL: Use req.login() to properly serialize user into session
      console.log('[Login] 🔑 Calling req.login() for user:', user.email);
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('[Login] ❌ req.login() failed:', loginErr);
          return res.status(500).json({ message: "Login session creation failed" });
        }

        console.log('[Login] 🔑 ✅ req.login() successful - user should be serialized now');
        console.log('[Login] Session state after login:', {
          sessionId: req.sessionID,
          isAuthenticated: req.isAuthenticated(),
          passport: (req.session as any).passport,
          userInReq: req.user ? req.user.email : 'NONE'
        });
        
        // Force session save and respond after save completes
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('[Login] ❌ Session save error:', saveErr);
            return res.status(500).json({ message: "Session save failed" });
          }
          
          console.log('[Login] 🔑 ✅ Session saved successfully');
          console.log('[Login] Post-save session verification:', {
            passport: (req.session as any).passport,
            user: req.user ? req.user.email : 'NONE',
            sessionId: req.sessionID,
            isAuthenticated: req.isAuthenticated()
          });
          
          console.log('[Login] Authentication successful for:', user.email);
          // Don't return the password hash
          const { password: _, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      });
    })(req, res, next);
  });

  // Logout endpoint 
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('[Logout] Error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error('[Logout] Session destroy error:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        
        res.clearCookie('oseed.sid'); // Clear the custom session cookie
        res.clearCookie('connect.sid'); // Clear default session cookie as backup
        console.log('[Logout] User logged out successfully');
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Get user endpoint for frontend
  app.get("/api/user", (req, res) => {
    console.log('🔐 /api/user endpoint called');
    
    // CRITICAL: Log incoming cookie details for debugging
    console.log('🔐 🍪 INCOMING COOKIE DEBUG:', {
      hasCookieHeader: !!req.headers.cookie,
      cookieHeader: req.headers.cookie?.substring(0, 100) + '...',
      oseedSidPresent: req.headers.cookie?.includes('oseed.sid'),
      userAgent: req.headers['user-agent']?.substring(0, 50),
      origin: req.headers.origin,
      referer: req.headers.referer
    });
    
    console.log('🔐 Session ID:', req.sessionID);
    console.log('🔐 Session exists:', !!req.session);
    console.log('🔐 Session store type:', req.session.constructor.name);
    console.log('🔐 Session data keys:', Object.keys(req.session));
    console.log('🔐 Raw session dump:', req.session);
    console.log('🔐 Serialized session:', JSON.stringify(req.session, null, 2));
    console.log('🔐 Authenticated:', req.isAuthenticated());
    console.log('🔐 User:', req.user ? `${req.user.email} (${req.user.id})` : 'None');
    console.log('🔐 Session passport:', (req.session as any)?.passport);
    console.log('🔐 Session user:', (req.session as any)?.user);
    console.log('🔐 Session isImpersonating:', (req.session as any)?.isImpersonating);
    console.log('🔐 Session originalUser:', (req.session as any)?.originalUser);
    console.log('🔐 Cookie details:', {
      secure: req.session?.cookie?.secure,
      httpOnly: req.session?.cookie?.httpOnly,
      sameSite: req.session?.cookie?.sameSite,
      domain: req.session?.cookie?.domain,
      path: req.session?.cookie?.path
    });
    
    // Check both passport and manual session
    const user = req.user || (req.session as any)?.user;
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      // Add impersonation status from session
      const isImpersonating = !!(req.session as any)?.isImpersonating;
      const originalUser = (req.session as any)?.originalUser;
      const userData = {
        ...userWithoutPassword,
        isImpersonating,
        originalUser
      };
      
      console.log('🔐 Final user data:', {
        id: userData.id,
        email: userData.email,
        isImpersonating: userData.isImpersonating,
        originalUser: userData.originalUser ? userData.originalUser.email : null
      });
      
      res.json(userData);
    } else {
      console.log('❌ User not authenticated, returning 401');
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Simple user creation endpoint for initial setup - CSRF exempt for testing
  app.post("/api/create-user", (req, res, next) => {
    req.csrfToken = () => 'skip'; // Skip CSRF for this endpoint
    next();
  }, async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (!email.endsWith('@seedfinancial.io')) {
        return res.status(403).json({ message: "Access restricted to @seedfinancial.io domain" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Create user with hashed password
      const user = await storage.createUser({
        email,
        password,
        firstName: firstName || '',
        lastName: lastName || '',
        role: 'service' as const,
      });

      // Don't return the password hash
      const { password: _, ...userWithoutPassword } = user;
      
      console.log('[CreateUser] User created successfully:', user.email);
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('[CreateUser] Error:', error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Session health monitoring endpoint
  app.get("/api/session-health", (req, res) => {
    // Use global storeType from session configuration instead of trying to read from session store
    const storeType = (global as any).sessionStoreType || 
                     req.session?.store?.constructor?.name || 
                     'Unknown';
    
    const sessionHealth = {
      hasSession: !!req.session,
      sessionId: req.sessionID,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      storeType: storeType,
      cookieConfig: {
        secure: req.session?.cookie?.secure,
        httpOnly: req.session?.cookie?.httpOnly,
        sameSite: req.session?.cookie?.sameSite,
        maxAge: req.session?.cookie?.maxAge
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'NOT SET',
        replitDeployment: process.env.REPLIT_DEPLOYMENT || 'NOT SET',
        hasReplId: !!process.env.REPL_ID,
        port: process.env.PORT || 'NOT SET'
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('[SessionHealth] Store type from global:', (global as any).sessionStoreType);
    console.log('[SessionHealth] Store type from session:', req.session?.store?.constructor?.name);
    console.log('[SessionHealth] Final store type:', storeType);
    
    res.json(sessionHealth);
  });

  // Simple test endpoint to verify API routing
  app.get("/api/test/simple", (req, res) => {
    console.log('[SimpleTest] API endpoint hit successfully');
    res.json({ 
      message: "API routing works", 
      timestamp: new Date().toISOString(),
      redisUrl: !!process.env.REDIS_URL 
    });
  });

  // Test endpoint to check global variables
  app.get("/api/test/globals", (req, res) => {
    console.log('[GlobalTest] Checking global variables...');
    console.log('[GlobalTest] sessionStoreType:', (global as any).sessionStoreType);
    console.log('[GlobalTest] sessionStore exists:', !!(global as any).sessionStore);
    
    res.json({
      globalStoreType: (global as any).sessionStoreType || 'NOT SET',
      globalStoreExists: !!(global as any).sessionStore,
      sessionStoreFromReq: req.session?.store?.constructor?.name || 'NOT DETECTED',
      timestamp: new Date().toISOString()
    });
  });

  // Cookie verification endpoint for Step 2 debugging
  app.get("/api/test/cookie-verification", (req, res) => {
    console.log('[CookieTest] Testing cookie transmission...');
    console.log('[CookieTest] Incoming cookies:', req.headers.cookie || 'NONE');
    console.log('[CookieTest] Session ID:', req.sessionID);
    console.log('[CookieTest] Session exists:', !!req.session);
    
    // Set a test cookie explicitly
    res.cookie('test-cookie', 'cookie-works', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1',
      sameSite: 'lax',
      maxAge: 60000 // 1 minute
    });
    
    // Set a test value in session
    if (req.session) {
      req.session.testValue = 'session-persistence-test';
    }
    
    const result = {
      message: 'Cookie test performed',
      incomingCookies: req.headers.cookie || 'NONE',
      sessionId: req.sessionID,
      hasSession: !!req.session,
      testCookieSet: true,
      sessionTestValue: req.session?.testValue || 'NOT SET',
      isProduction: process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1',
      cookieSecure: process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1',
      timestamp: new Date().toISOString()
    };
    
    console.log('[CookieTest] Response data:', result);
    res.json(result);
  });

  // Redis session status endpoint (using shared Redis connections)
  app.get("/api/admin/redis-session-status", async (req, res) => {
    console.log('[RedisStatus] Checking Redis session status...');
    
    if (!process.env.REDIS_URL) {
      return res.json({ 
        status: 'no-redis-url',
        message: 'REDIS_URL not configured - using fallback session store'
      });
    }
    
    try {
      // Use shared Redis connection with async initialization
      const { getRedisAsync } = await import('./redis');
      const connections = await getRedisAsync();
      
      if (!connections?.sessionRedis) {
        return res.json({ 
          status: 'redis-not-initialized',
          message: 'Redis connections failed to initialize'
        });
      }
      
      await connections.sessionRedis.ping();
      
      res.json({
        status: 'redis-available',
        message: 'Redis connection successful - sessions using Redis store',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[RedisStatus] Error:', error);
      res.json({ 
        status: 'redis-failed',
        message: 'Redis connection failed - using fallback session store',
        error: error.message 
      });
    }
  });

  // Test Redis sessions directly (using shared connections)
  app.get("/api/test/redis-session", async (req, res) => {
    try {
      console.log('[TestRedis] Testing direct Redis session...');
      
      if (!process.env.REDIS_URL) {
        return res.json({ error: 'REDIS_URL not set' });
      }
      
      // Use shared Redis connection with async initialization
      const { getRedisAsync } = await import('./redis');
      const connections = await getRedisAsync();
      
      if (!connections?.sessionRedis) {
        return res.json({ error: 'Redis connections failed to initialize' });
      }
      
      await connections.sessionRedis.ping();
      console.log('[TestRedis] Redis ping successful using shared connection');
      
      const RedisStore = (await import('connect-redis')).default;
      
      // Create a Redis session store using existing connection
      const store = new RedisStore({
        client: connections.sessionRedis,
        prefix: 'sess:',  // Use production prefix
        ttl: 24 * 60 * 60, // 24 hours like production
      });
      
      console.log('[TestRedis] RedisStore created:', store.constructor.name);
      
      // Test session store functionality
      console.log('[TestRedis] Testing Redis session store functionality...');
      
      // Test storing a session
      const sessionId = 'test-session-123';
      const sessionData = { userId: 1, username: 'test', timestamp: Date.now() };
      
      await new Promise((resolve, reject) => {
        store.set(sessionId, sessionData, (err) => {
          if (err) reject(err);
          else resolve(null);
        });
      });
      
      console.log('[TestRedis] Session stored successfully');
      
      // Test retrieving the session
      const retrievedData = await new Promise((resolve, reject) => {
        store.get(sessionId, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      
      console.log('[TestRedis] Session retrieved:', retrievedData);
      
      // No need to quit() - using shared connection
      
      res.json({ 
        success: true, 
        storeType: store.constructor.name,
        sessionData: retrievedData 
      });
      
    } catch (error) {
      console.error('[TestRedis] Error:', error);
      res.json({ error: error.message });
    }
  });

  // Comprehensive session diagnostic endpoint
  app.get("/api/debug/session-comprehensive", async (req, res) => {
    console.log('[SessionDiag] Comprehensive session diagnostic running...');
    
    // Check if we can use shared Redis connections
    let manualRedisTest = 'Not tested';
    if (process.env.REDIS_URL) {
      try {
        console.log('[SessionDiag] Testing shared Redis connection...');
        const { getRedisAsync } = await import('./redis');
        const connections = await getRedisAsync();
        
        if (!connections?.sessionRedis) {
          manualRedisTest = 'FAILED: Redis connections failed to initialize';
        } else {
          const RedisStore = (await import('connect-redis')).default;
          
          await connections.sessionRedis.ping();
          
          const testStore = new RedisStore({
            client: connections.sessionRedis,
            prefix: 'test:diagnostic:',
            ttl: 300, // 5 minutes
          });
          
          manualRedisTest = `SUCCESS: ${testStore.constructor.name}`;
          console.log('[SessionDiag] Shared Redis connection test successful:', testStore.constructor.name);
        }
      } catch (error) {
        manualRedisTest = `FAILED: ${error.message}`;
        console.log('[SessionDiag] Shared Redis connection test failed:', error.message);
      }
    }
    
    // Get session information
    const sessionStore = req.session?.store;
    const storeType = sessionStore?.constructor?.name || 'Unknown';
    const sessionData = {
      sessionId: req.sessionID,
      hasSession: !!req.session,
      storeConstructor: sessionStore?.constructor?.name,
      storeString: sessionStore?.toString(),
      storeKeys: sessionStore ? Object.keys(sessionStore) : [],
      sessionKeys: req.session ? Object.keys(req.session) : []
    };
    
    console.log('[SessionDiag] Session store details:', sessionData);
    
    res.json({
      storeType,
      sessionData,
      manualRedisTest,
      redisUrl: !!process.env.REDIS_URL,
      timestamp: new Date().toISOString()
    });
  });

  // Debug endpoint to check session store type
  app.get("/api/debug/session-store", async (req, res) => {
    // Get the actual session store from Express session middleware
    const sessionStore = req.session?.store;
    const storeType = sessionStore?.constructor?.name || 'Unknown';
    const hasRedis = storeType.includes('Redis');
    
    console.log('[Debug] Session store type:', storeType);
    console.log('[Debug] Session store constructor:', sessionStore?.constructor?.name);
    console.log('[Debug] Has Redis:', hasRedis);
    
    // Test direct Redis connection
    let redisTestResult = 'Not tested';
    if (process.env.REDIS_URL) {
      try {
        const Redis = (await import('ioredis')).default;
        const testClient = new Redis(process.env.REDIS_URL);
        
        // Test basic operations with ioredis
        await testClient.set('test:ping', 'pong');
        const value = await testClient.get('test:ping');
        await testClient.del('test:ping');
        await testClient.quit();
        
        redisTestResult = 'Connected and working';
      } catch (err: any) {
        redisTestResult = `Error: ${err.message}`;
      }
    }
    
    // Check redis module status
    const { redis: redisConfig } = await import('./redis');
    
    res.json({
      storeType,
      isRedisStore: hasRedis,
      sessionId: req.sessionID,
      sessionExists: !!req.session,
      redisUrl: process.env.REDIS_URL ? 'Set' : 'Not set',
      redisDirectTest: redisTestResult,
      redisModuleStatus: {
        redisConfigExists: !!redisConfig,
        sessionRedis: !!redisConfig?.sessionRedis,
        cacheRedis: !!redisConfig?.cacheRedis,
        queueRedis: !!redisConfig?.queueRedis
      }
    });
  });

  // OAuth sync endpoint removed - handled in auth.ts

  // Request portal access endpoint
  app.post("/api/auth/request-access", async (req, res) => {
    try {
      const { email, name } = req.body;
      
      if (!email || !name) {
        return res.status(400).json({ message: "Email and name are required" });
      }

      // Log the access request (Slack integration temporarily disabled)
      console.log(`🔐 Portal Access Request - User: ${name}, Email: ${email}`);
      console.log('Access request logged. Admin should be notified via Slack (currently disabled due to channel config issues)');

      // Always respond successfully - access request is "received" even if Slack fails
      res.json({ message: "Access request sent to admin" });
    } catch (error) {
      console.error('Error processing access request:', error);
      // Still respond successfully - the core function (logging the request) works
      res.json({ message: "Access request received" });
    }
  });

  // Removed duplicate logout endpoint - using /api/logout from auth.ts instead

  // Test endpoint for database operations
  app.get("/api/test/db-quote", requireAuth, async (req, res) => {
    console.log('🔵 TEST DB ENDPOINT - Testing direct database operations');
    try {
      // Test direct database query
      const testQuote = {
        contactEmail: 'test@example.com',
        companyName: 'Test Company',
        monthlyFee: '100.00',
        setupFee: '200.00',
        taasMonthlyFee: '0.00',
        taasPriorYearsFee: '0.00',
        ownerId: req.user!.id,
        includesBookkeeping: true,
        includesTaas: false,
        archived: false,
        quoteType: 'bookkeeping',
        entityType: 'LLC',
        numEntities: 1,
        customNumEntities: null,
        statesFiled: 1,
        customStatesFiled: null,
        internationalFiling: false,
        numBusinessOwners: 1,
        customNumBusinessOwners: null,
        monthlyRevenueRange: '10K-25K',
        monthlyTransactions: '100-300',
        industry: 'Professional Services',
        cleanupMonths: 8,
        cleanupComplexity: '0.25',
        cleanupOverride: false,
        overrideReason: '',
        customOverrideReason: '',
        customSetupFee: '',
        serviceBookkeeping: true,
        serviceTaas: false,
        servicePayroll: false,
        serviceApArLite: false,
        serviceFpaLite: false,
        contactFirstName: 'Test',
        contactLastName: 'User',
        clientStreetAddress: '',
        clientCity: '',
        clientState: 'CO',
        clientZipCode: '',
        accountingBasis: 'Cash'
      };
      
      console.log('🔵 TESTING storage.createQuote directly...');
      const result = await storage.createQuote(testQuote);
      console.log('🟢 TEST RESULT:', {
        hasResult: !!result,
        resultType: typeof result,
        resultId: result?.id,
        resultStringified: JSON.stringify(result)
      });
      
      res.json({ 
        success: true, 
        testResult: result,
        message: 'Database test completed'
      });
    } catch (error) {
      console.error('🚨 TEST ERROR:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new quote (protected)
  app.post("/api/quotes", (req, res, next) => {
    console.log('🟡 QUOTES MIDDLEWARE - Before requireAuth');
    next();
  }, requireAuth, async (req, res) => {
    console.log('🟢 POST /api/quotes - HANDLER EXECUTING');
    try {
      console.log('=== QUOTE CREATION DEBUG ===');
      console.log('User:', req.user?.email, 'ID:', req.user?.id);
      
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Extract service flags with defaults
      const includesBookkeeping = req.body.includesBookkeeping !== false; // Default to true
      const includesTaas = req.body.includesTaas === true;
      
      // Prepare data for validation (without ownerId since schema omits it)
      const validationData = {
        ...req.body,
        // Use the frontend-calculated values directly
        monthlyFee: req.body.monthlyFee || "0",
        setupFee: req.body.setupFee || "0", 
        taasMonthlyFee: req.body.taasMonthlyFee || "0",
        taasPriorYearsFee: req.body.taasPriorYearsFee || "0",
        // For TaaS-only quotes, provide defaults for bookkeeping-required fields
        monthlyTransactions: req.body.monthlyTransactions || "N/A",
        cleanupComplexity: req.body.cleanupComplexity || "0",
        cleanupMonths: req.body.cleanupMonths || 0,
      };
      
      console.log('Processing quote data for:', req.body.contactEmail);
      console.log('Validation data (first 500 chars):', JSON.stringify(validationData).substring(0, 500));
      
      // Validate the data first (without ownerId)
      const validatedQuoteData = insertQuoteSchema.parse(validationData);
      
      // Add ownerId after validation passes
      const quoteData = {
        ...validatedQuoteData,
        ownerId: req.user.id,
      };
      console.log('Quote data validated successfully');
      
      console.log('🔵 CALLING storage.createQuote with data...');
      const quote = await storage.createQuote(quoteData);
      console.log('🟢 STORAGE RETURNED:', {
        hasQuote: !!quote,
        quoteType: typeof quote,
        quoteKeys: quote ? Object.keys(quote) : 'N/A',
        quoteId: quote?.id,
        quoteSerialized: JSON.stringify(quote)
      });
      
      if (!quote) {
        console.error('🚨 CRITICAL: Storage returned null/undefined quote');
        return res.status(500).json({ message: "Quote creation failed - no data returned" });
      }
      
      console.log('🔵 PREPARING RESPONSE - Quote object details:');
      console.log('Quote ID:', quote.id);
      console.log('Quote contact email:', quote.contactEmail);
      console.log('Quote monthly fee:', quote.monthlyFee);
      console.log('Quote object stringified:', JSON.stringify(quote).substring(0, 200) + '...');
      
      console.log('🚀 SENDING RESPONSE via res.json()');
      res.json(quote);
    } catch (error) {
      console.error('Quote creation error:', error);
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors);
        res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      } else {
        console.error('Database or other error:', error.message);
        res.status(500).json({ message: "Failed to create quote" });
      }
    }
  });

  // Get all quotes with optional search and sort (protected)
  app.get("/api/quotes", (req, res, next) => {
    console.log('====== QUOTES ENDPOINT HIT ======');
    console.log('Quotes API - Request received:', {
      method: req.method,
      url: req.url,
      query: req.query,
      user: req.user?.email || 'no user'
    });
    console.log('====== QUOTES ENDPOINT PROCESSING ======');
    next();
  }, requireAuth, async (req, res) => {
    try {
      const email = req.query.email as string;
      const search = req.query.search as string;
      const sortField = req.query.sortField as string;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';
      
      console.log('Quotes API - Query params:', { email, search, sortField, sortOrder });
      console.log('Quotes API - User ID:', req.user?.id);
      
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (email) {
        console.log('Quotes API - Getting quotes by email:', email);
        // Get quotes by specific email (filtered by owner)
        const quotes = await storage.getQuotesByEmail(email);
        // Filter by owner
        const userQuotes = quotes.filter(quote => quote.ownerId === req.user!.id);
        console.log('Quotes API - Found', userQuotes.length, 'quotes for email');
        res.json(userQuotes);
      } else if (search) {
        console.log('Quotes API - Searching quotes by email:', search);
        console.log('Quotes API - User ID for search:', req.user.id);
        try {
          // Search quotes by email (using search parameter for email filtering)
          const quotes = await storage.getAllQuotes(req.user.id, search, sortField, sortOrder);
          console.log('Quotes API - Found', quotes.length, 'quotes matching search');
          console.log('Quotes API - Sending response...');
          res.json(quotes);
          console.log('Quotes API - Response sent successfully');
        } catch (dbError: any) {
          console.error('Quotes API - Database error during search:', dbError);
          console.error('Quotes API - Error details:', {
            message: dbError.message,
            code: dbError.code,
            stack: dbError.stack?.split('\n')[0]
          });
          throw dbError; // Re-throw to be caught by outer catch
        }
      } else {
        console.log('Quotes API - Getting all quotes for user');
        // Get all quotes for the authenticated user
        const quotes = await storage.getAllQuotes(req.user.id, undefined, sortField, sortOrder);
        console.log('Quotes API - Found', quotes.length, 'total quotes');
        res.json(quotes);
      }
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      res.status(500).json({ message: "Failed to fetch quotes", error: error.message });
    }
  });

  // Update a quote (protected)
  app.put("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid quote ID" });
        return;
      }
      
      const quoteData = updateQuoteSchema.parse({ ...req.body, id });
      const quote = await storage.updateQuote(quoteData);
      res.json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update quote" });
      }
    }
  });

  // Archive a quote (protected)
  app.patch("/api/quotes/:id/archive", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid quote ID" });
        return;
      }
      
      const quote = await storage.archiveQuote(id);
      res.json(quote);
    } catch (error) {
      res.status(500).json({ message: "Failed to archive quote" });
    }
  });

  // Get a specific quote (protected)
  app.get("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid quote ID" });
        return;
      }
      
      const quote = await storage.getQuote(id);
      if (!quote) {
        res.status(404).json({ message: "Quote not found" });
        return;
      }
      
      res.json(quote);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Request approval code for cleanup override
  app.post("/api/approval/request", async (req, res) => {
    try {
      const { contactEmail, quoteData } = req.body;
      
      if (!contactEmail || !quoteData) {
        res.status(400).json({ message: "Contact email and quote data are required" });
        return;
      }

      // Generate a 4-digit approval code
      const approvalCode = generateApprovalCode();
      
      // Set expiration to 1 hour from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Store the approval code
      await storage.createApprovalCode({
        code: approvalCode,
        contactEmail,
        used: false,
        expiresAt
      });

      // Send Slack notification with approval code including custom override reason
      try {
        console.log('Sending Slack notification with data:', {
          overrideReason: quoteData.overrideReason,
          customOverrideReason: quoteData.customOverrideReason
        });
        
        await sendSystemAlert(
          'Quote Cleanup Override',
          `Approval code: ${approvalCode}\nContact: ${contactEmail}\nCompany: ${quoteData.companyName}\nReason: ${quoteData.customOverrideReason || quoteData.overrideReason}`,
          'medium'
        );
      } catch (slackError) {
        console.error('Failed to send Slack notification:', slackError);
      }

      res.json({ message: "Approval request sent. Check Slack for approval code." });
    } catch (error) {
      console.error('Error requesting approval:', error);
      res.status(500).json({ message: "Failed to request approval" });
    }
  });

  // Validate approval code
  app.post("/api/approval/validate", async (req, res) => {
    try {
      const { code, contactEmail } = req.body;
      
      if (!code || !contactEmail) {
        res.status(400).json({ message: "Code and contact email are required" });
        return;
      }

      const isValid = await storage.validateApprovalCode(code, contactEmail);
      
      if (isValid) {
        // Mark the code as used
        await storage.markApprovalCodeUsed(code, contactEmail);
        res.json({ valid: true });
      } else {
        res.json({ valid: false, message: "Invalid or expired approval code" });
      }
    } catch (error) {
      console.error('Error validating approval code:', error);
      res.status(500).json({ message: "Failed to validate approval code" });
    }
  });

  // Check for existing quotes by email
  app.post("/api/quotes/check-existing", requireAuth, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }

      const existingQuotes = await storage.getQuotesByEmail(email);
      
      res.json({ 
        hasExistingQuotes: existingQuotes.length > 0,
        count: existingQuotes.length,
        quotes: existingQuotes
      });
    } catch (error) {
      console.error('Error checking existing quotes:', error);
      res.status(500).json({ message: "Failed to check existing quotes" });
    }
  });

  // HubSpot integration endpoints
  
  // Verify contact email in HubSpot
  app.post("/api/hubspot/verify-contact", requireAuth, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }

      if (!hubSpotService) {
        res.json({ verified: false, error: "HubSpot integration not configured" });
        return;
      }

      // Use cache for contact verification
      const cacheKey = cache.generateKey(CachePrefix.HUBSPOT_CONTACT, email);
      const result = await cache.wrap(
        cacheKey,
        () => hubSpotService.verifyContactByEmail(email),
        { ttl: CacheTTL.HUBSPOT_CONTACT }
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error verifying contact:', error);
      res.status(500).json({ message: "Failed to verify contact" });
    }
  });

  // Debug endpoint: Verify HubSpot product IDs
  app.get("/api/hubspot/debug/products", requireAuth, async (req, res) => {
    try {
      if (!hubSpotService) {
        res.status(400).json({ message: "HubSpot integration not configured" });
        return;
      }

      console.log('🔍 DEBUG: Checking HubSpot product IDs');
      const productIds = await hubSpotService.verifyAndGetProductIds();
      
      // Also fetch all products for reference
      const allProducts = await hubSpotService.getProducts();
      
      res.json({
        productIds,
        totalProducts: allProducts.length,
        sampleProducts: allProducts.slice(0, 5).map(p => ({
          id: p.id,
          name: p.properties?.name,
          sku: p.properties?.hs_sku
        }))
      });
    } catch (error) {
      console.error('Error debugging products:', error);
      res.status(500).json({ message: "Failed to debug products" });
    }
  });

  // Push quote to HubSpot (create deal and quote)
  app.post("/api/hubspot/push-quote", requireAuth, async (req, res) => {
    console.log('🚀 HUBSPOT PUSH START - Quote ID:', req.body.quoteId);
    console.log('🚀 User authenticated:', req.user?.email);
    console.log('🚀 HubSpot service available:', !!hubSpotService);
    
    try {
      const { quoteId } = req.body;
      
      if (!quoteId) {
        console.log('❌ Missing quote ID');
        res.status(400).json({ message: "Quote ID is required" });
        return;
      }

      if (!req.user) {
        console.log('❌ User not authenticated');
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      if (!hubSpotService) {
        console.log('❌ HubSpot service not configured');
        res.status(400).json({ message: "HubSpot integration not configured" });
        return;
      }

      // Get the quote from database
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        res.status(404).json({ message: "Quote not found" });
        return;
      }

      // First verify the contact exists
      const contactResult = await hubSpotService.verifyContactByEmail(quote.contactEmail);
      if (!contactResult.verified || !contactResult.contact) {
        res.status(400).json({ message: "Contact not found in HubSpot. Please ensure the contact exists before pushing to HubSpot." });
        return;
      }

      const contact = contactResult.contact;
      const companyName = contact.properties.company || quote.companyName || 'Unknown Company';

      // Get the HubSpot owner ID for the user
      const ownerId = await hubSpotService.getOwnerByEmail(req.user!.email);

      // Create deal in HubSpot - FIXED: Use serviceBookkeeping/serviceTaas for deal creation too
      const dealIncludesBookkeeping = quote.serviceBookkeeping || quote.includesBookkeeping;
      const dealIncludesTaas = quote.serviceTaas || quote.includesTaas;
      
      console.log(`🔧 Deal creation: Using includesBookkeeping=${dealIncludesBookkeeping}, includesTaas=${dealIncludesTaas}`);
      
      const deal = await hubSpotService.createDeal(
        contact.id,
        companyName,
        parseFloat(quote.monthlyFee),
        parseFloat(quote.setupFee),
        ownerId || undefined,
        dealIncludesBookkeeping,
        dealIncludesTaas
      );

      if (!deal) {
        res.status(500).json({ message: "Failed to create deal in HubSpot" });
        return;
      }

      // For combined quotes, calculate individual service fees for separate line items
      // For single service quotes, use the saved quote values to preserve custom overrides
      let bookkeepingMonthlyFee = parseFloat(quote.monthlyFee);
      let bookkeepingSetupFee = parseFloat(quote.setupFee);
      
      // FIXED: Use serviceBookkeeping/serviceTaas for fee calculation
      const hasBothServices = (quote.serviceBookkeeping || quote.includesBookkeeping) && (quote.serviceTaas || quote.includesTaas);
      
      if (hasBothServices) {
        // Combined quote - need to separate fees
        console.log('🔧 Combined service quote detected - separating fees');
        const pricingData = {
          ...quote,
          numEntities: quote.numEntities || 1,
          statesFiled: quote.statesFiled || 1,
          numBusinessOwners: quote.numBusinessOwners || 1,
          priorYearsUnfiled: quote.priorYearsUnfiled || 0,
          cleanupComplexity: quote.cleanupComplexity || "0",
          internationalFiling: quote.internationalFiling ?? false,
          include1040s: quote.include1040s ?? false,
          alreadyOnSeedBookkeeping: quote.alreadyOnSeedBookkeeping ?? false,
          cleanupOverride: quote.cleanupOverride ?? false,
          entityType: quote.entityType || "LLC",
          bookkeepingQuality: quote.bookkeepingQuality || "Clean (Seed)"
        };
        const fees = calculateCombinedFees(pricingData);
        bookkeepingMonthlyFee = fees.bookkeeping.monthlyFee;
        bookkeepingSetupFee = fees.bookkeeping.setupFee;
        console.log(`🔧 Separated fees - BK Monthly: $${bookkeepingMonthlyFee}, BK Setup: $${bookkeepingSetupFee}`);
      }
      // For single service quotes, keep the saved values to preserve custom setup fees
      
      // Create quote/note in HubSpot - FIXED: Use serviceBookkeeping/serviceTaas instead of includes* fields
      console.log('🔧 DEBUG: Service fields for HubSpot quote creation');
      console.log(`📊 includesBookkeeping: ${quote.includesBookkeeping}`);
      console.log(`📊 includesTaas: ${quote.includesTaas}`);
      console.log(`📊 serviceBookkeeping: ${quote.serviceBookkeeping}`);
      console.log(`📊 serviceTaas: ${quote.serviceTaas}`);
      
      // Use the correct service fields - serviceBookkeeping/serviceTaas instead of includes*
      const actualIncludesBookkeeping = quote.serviceBookkeeping || quote.includesBookkeeping;
      const actualIncludesTaas = quote.serviceTaas || quote.includesTaas;
      
      console.log(`🔧 CORRECTED: Using actualIncludesBookkeeping=${actualIncludesBookkeeping}, actualIncludesTaas=${actualIncludesTaas}`);
      
      const hubspotQuote = await hubSpotService.createQuote(
        deal.id,
        companyName,
        parseFloat(quote.monthlyFee),
        parseFloat(quote.setupFee),
        req.user!.email,
        req.user!.firstName || '',
        req.user!.lastName || '',
        actualIncludesBookkeeping,
        actualIncludesTaas,
        quote.taasMonthlyFee ? parseFloat(quote.taasMonthlyFee) : undefined,
        quote.taasPriorYearsFee ? parseFloat(quote.taasPriorYearsFee) : undefined,
        bookkeepingMonthlyFee,
        bookkeepingSetupFee,
        quote // Pass the complete quote data for scope assumptions
      );

      if (!hubspotQuote) {
        res.status(500).json({ message: "Failed to create quote in HubSpot" });
        return;
      }

      // Update HubSpot contact AND company properties with quote data for 2-way sync
      try {
        // Update contact properties (name, address, company name)
        const contactUpdateProperties: any = {};
        
        if (quote.companyName && quote.companyName !== contact.properties.company) {
          contactUpdateProperties.company = quote.companyName;
        }
        if (quote.contactFirstName && quote.contactFirstName !== contact.properties.firstname) {
          contactUpdateProperties.firstname = quote.contactFirstName;
        }
        if (quote.contactLastName && quote.contactLastName !== contact.properties.lastname) {
          contactUpdateProperties.lastname = quote.contactLastName;
        }
        
        // Update contact address information if available
        if (quote.clientStreetAddress) {
          contactUpdateProperties.address = quote.clientStreetAddress;
        }
        if (quote.clientCity) {
          contactUpdateProperties.city = quote.clientCity;
        }
        if (quote.clientState) {
          contactUpdateProperties.state = quote.clientState;
        }
        if (quote.clientZipCode) {
          contactUpdateProperties.zip = quote.clientZipCode;
        }
        
        // Update contact properties if there are changes
        if (Object.keys(contactUpdateProperties).length > 0) {
          await hubSpotService.updateContactProperties(contact.id, contactUpdateProperties);
          console.log('Updated HubSpot contact properties:', contactUpdateProperties);
        }

        // Handle company properties (industry, revenue, entity type)
        await hubSpotService.updateOrCreateCompanyFromQuote(contact.id, quote);
        
      } catch (updateError) {
        console.error('Failed to update HubSpot contact/company properties:', updateError);
        // Don't fail the entire operation if updates fail
      }

      // Update the quote in our database with HubSpot IDs
      const updatedQuote = await storage.updateQuote({
        id: quoteId,
        hubspotContactId: contact.id,
        hubspotDealId: deal.id,
        hubspotQuoteId: hubspotQuote.id,
        hubspotContactVerified: true,
        companyName: companyName
      });

      // Invalidate cache after creating new deal/quote
      await cache.del(`${CachePrefix.HUBSPOT_METRICS}*`);
      await cache.del(`${CachePrefix.HUBSPOT_DEALS_LIST}*`);
      
      res.json({
        success: true,
        hubspotDealId: deal.id,
        hubspotQuoteId: hubspotQuote.id,
        dealName: deal.properties.dealname,
        message: "Successfully pushed to HubSpot"
      });
    } catch (error: any) {
      console.error('❌ HUBSPOT PUSH ERROR:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      console.error('❌ Error response:', error?.response?.data);
      console.error('❌ Error status:', error?.response?.status);
      
      // Send more detailed error response
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to push quote to HubSpot";
      const statusCode = error?.response?.status || 500;
      
      res.status(statusCode).json({ 
        message: errorMessage,
        details: error?.response?.data || null,
        errorType: error?.name || 'Unknown'
      });
    }
  });

  // Update existing HubSpot quote
  app.post("/api/hubspot/update-quote", async (req, res) => {
    try {
      const { quoteId, currentFormData } = req.body;
      
      if (!quoteId) {
        res.status(400).json({ message: "Quote ID is required" });
        return;
      }

      if (!hubSpotService) {
        res.status(400).json({ message: "HubSpot integration not configured" });
        return;
      }

      // Get the quote from database
      const quote = await storage.getQuote(quoteId);
      if (!quote || !quote.hubspotQuoteId) {
        res.status(404).json({ message: "Quote not found or not linked to HubSpot" });
        return;
      }

      const companyName = quote.companyName || 'Unknown Company';
      
      // If current form data is provided, update database with form data (preserve custom fees)
      let monthlyFee = parseFloat(quote.monthlyFee);
      let setupFee = parseFloat(quote.setupFee);
      let taasMonthlyFee = parseFloat(quote.taasMonthlyFee || "0");
      let taasPriorYearsFee = parseFloat(quote.taasPriorYearsFee || "0");
      
      if (currentFormData) {
        // Use form data values directly to preserve custom overrides
        monthlyFee = parseFloat(currentFormData.monthlyFee || quote.monthlyFee);
        setupFee = parseFloat(currentFormData.setupFee || quote.setupFee);
        taasMonthlyFee = parseFloat(currentFormData.taasMonthlyFee || "0");
        taasPriorYearsFee = parseFloat(currentFormData.taasPriorYearsFee || "0");
        
        console.log(`Using form data fees - Monthly: $${monthlyFee}, Setup: $${setupFee}, TaaS Monthly: $${taasMonthlyFee}, TaaS Setup: $${taasPriorYearsFee}`);
        console.log(`Current form data includes TaaS: ${currentFormData.includesTaas}, TaaS monthly: ${currentFormData.taasMonthlyFee}, TaaS setup: ${currentFormData.taasPriorYearsFee}`);
        
        // Update the quote in our database with current form data (preserve calculated fees)
        const updateData = {
          id: quoteId,
          ...currentFormData,
          monthlyFee: monthlyFee.toString(),
          setupFee: setupFee.toString(),
          taasMonthlyFee: taasMonthlyFee.toString(),
          taasPriorYearsFee: taasPriorYearsFee.toString()
        };
        
        await storage.updateQuote(updateData);
        console.log(`Updated quote ${quoteId} in database with form data`);

        // Update HubSpot contact properties with new quote data for 2-way sync
        if (quote.hubspotContactId && hubSpotService) {
          try {
            const contactUpdateProperties: any = {};
            
            // Map updated quote data to HubSpot contact properties
            if (currentFormData.industry && currentFormData.industry !== quote.industry) {
              contactUpdateProperties.hs_industry_group = currentFormData.industry;
            }
            if (currentFormData.monthlyRevenueRange && currentFormData.monthlyRevenueRange !== quote.monthlyRevenueRange) {
              contactUpdateProperties.monthly_revenue_range = currentFormData.monthlyRevenueRange;
            }
            if (currentFormData.entityType && currentFormData.entityType !== quote.entityType) {
              contactUpdateProperties.entity_type = currentFormData.entityType;
            }
            if (currentFormData.companyName && currentFormData.companyName !== quote.companyName) {
              contactUpdateProperties.company = currentFormData.companyName;
            }
            if (currentFormData.contactFirstName && currentFormData.contactFirstName !== quote.contactFirstName) {
              contactUpdateProperties.firstname = currentFormData.contactFirstName;
            }
            if (currentFormData.contactLastName && currentFormData.contactLastName !== quote.contactLastName) {
              contactUpdateProperties.lastname = currentFormData.contactLastName;
            }
            
            // Update address information if changed
            if (currentFormData.clientStreetAddress && currentFormData.clientStreetAddress !== quote.clientStreetAddress) {
              contactUpdateProperties.address = currentFormData.clientStreetAddress;
            }
            if (currentFormData.clientCity && currentFormData.clientCity !== quote.clientCity) {
              contactUpdateProperties.city = currentFormData.clientCity;
            }
            if (currentFormData.clientState && currentFormData.clientState !== quote.clientState) {
              contactUpdateProperties.state = currentFormData.clientState;
            }
            if (currentFormData.clientZipCode && currentFormData.clientZipCode !== quote.clientZipCode) {
              contactUpdateProperties.zip = currentFormData.clientZipCode;
            }
            
            // Only update if there are properties to change
            if (Object.keys(contactUpdateProperties).length > 0) {
              await hubSpotService.updateContactProperties(quote.hubspotContactId, contactUpdateProperties);
              console.log('Updated HubSpot contact properties during quote update:', contactUpdateProperties);
            }
          } catch (contactUpdateError) {
            console.error('Failed to update HubSpot contact properties during quote update:', contactUpdateError);
            // Don't fail the entire operation if contact update fails
          }
        }
      }

      // Use the form data fees directly instead of recalculating
      const updateTaasMonthlyFee = taasMonthlyFee;
      const updateTaasPriorYearsFee = taasPriorYearsFee;
      
      const updateBookkeepingMonthlyFee = monthlyFee - updateTaasMonthlyFee;
      const updateBookkeepingSetupFee = setupFee - updateTaasPriorYearsFee;
      
      console.log(`Calculated individual service fees - Bookkeeping Monthly: $${updateBookkeepingMonthlyFee}, Bookkeeping Setup: $${updateBookkeepingSetupFee}, TaaS Monthly: $${updateTaasMonthlyFee}, TaaS Setup: $${updateTaasPriorYearsFee}`);

      // 🔧 FIXED: Use correct service field mapping for HubSpot integration
      // Use serviceBookkeeping/serviceTaas from form data instead of includes* fields
      const currentServiceBookkeeping = currentFormData?.serviceBookkeeping === true;
      const currentServiceTaas = currentFormData?.serviceTaas === true;
      
      console.log(`🔵 UPDATE QUOTE - Service field mapping:`);
      console.log(`   Database serviceBookkeeping: ${currentFormData?.serviceBookkeeping}`);
      console.log(`   Database serviceTaas: ${currentFormData?.serviceTaas}`);
      console.log(`   Mapped to HubSpot includesBookkeeping: ${currentServiceBookkeeping}`);
      console.log(`   Mapped to HubSpot includesTaas: ${currentServiceTaas}`);
      
      const success = await hubSpotService.updateQuote(
        quote.hubspotQuoteId,
        companyName,
        monthlyFee,
        setupFee,
        currentServiceBookkeeping, // ✅ Fixed: Use serviceBookkeeping instead of includesBookkeeping
        currentServiceTaas, // ✅ Fixed: Use serviceTaas instead of includesTaas
        updateTaasMonthlyFee,
        updateTaasPriorYearsFee,
        updateBookkeepingMonthlyFee,
        updateBookkeepingSetupFee,
        quote.hubspotDealId || undefined, // Pass deal ID for updating deal name and value
        currentFormData // Pass the complete current form data for scope assumptions
      );

      if (success) {
        res.json({
          success: true,
          message: "Successfully updated quote in HubSpot"
        });
      } else {
        // Quote is no longer active, create a new one
        res.json({
          success: false,
          needsNewQuote: true,
          message: "Quote is no longer active in HubSpot. A new quote will need to be created."
        });
      }
    } catch (error) {
      console.error('Error updating HubSpot quote:', error);
      res.status(500).json({ message: "Failed to update quote in HubSpot" });
    }
  });

  // HubSpot OAuth callback endpoint for redirect URL
  app.get('/api/hubspot/oauth/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      console.log('HubSpot OAuth callback received:', { code: code ? 'present' : 'missing', state });
      
      // In a real implementation, you'd exchange the code for tokens here
      // For now, just return success since we're using private app tokens
      res.send(`
        <html>
          <body>
            <h1>HubSpot OAuth Callback</h1>
            <p>Authorization code received successfully.</p>
            <p>You can close this window and return to your app configuration.</p>
            <script>
              // Optional: Auto-close window after 3 seconds
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send('OAuth callback failed');
    }
  });

  // Sales Inbox API endpoints
  
  // Get active leads for sales inbox
  app.get("/api/sales-inbox/leads", requireAuth, async (req, res) => {
    try {
      if (!hubSpotService) {
        res.status(400).json({ message: "HubSpot integration not configured" });
        return;
      }

      const { limit = '8', showAll = 'false' } = req.query;
      
      // For debugging, allow showing all leads regardless of owner
      const userEmail = showAll === 'true' ? undefined : req.user?.email;
      
      const leads = await hubSpotService.getSalesInboxLeads(userEmail, parseInt(limit.toString()));

      res.json({ leads });
    } catch (error) {
      console.error('Error fetching sales inbox leads:', error);
      res.status(500).json({ message: "Failed to fetch sales inbox leads" });
    }
  });

  // Client Intel API endpoints
  
  // Search for clients/prospects using HubSpot with owner filtering
  app.get("/api/client-intel/search", requireAuth, searchRateLimit, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 3) {
        return res.json([]);
      }

      // Get the logged-in user's email for owner filtering
      const userEmail = (req as any).user?.email;
      
      console.log(`[Search] Searching for: "${query}" by user: ${userEmail}`);
      
      let results;
      try {
        // Try to use cache for HubSpot search results
        const cacheKey = cache.generateKey(CachePrefix.HUBSPOT_CONTACT, { query, userEmail });
        results = await cache.wrap(
          cacheKey,
          () => clientIntelEngine.searchHubSpotContacts(query, userEmail),
          { ttl: CacheTTL.HUBSPOT_CONTACT }
        );
      } catch (cacheError) {
        console.log('[Search] Cache unavailable, searching directly:', cacheError.message);
        // Fallback to direct search without cache
        results = await clientIntelEngine.searchHubSpotContacts(query, userEmail);
      }
      
      console.log(`[Search] Found ${results?.length || 0} results`);
      res.json(results || []);
    } catch (error) {
      console.error('Client search error:', error);
      res.status(500).json({ message: "Search failed", error: error.message });
    }
  });

  // Enhance prospect data endpoint
  app.post('/api/client-intel/enhance/:contactId', requireAuth, enhancementRateLimit, async (req, res) => {
    const { contactId } = req.params;
    
    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID required' });
    }

    try {
      if (!hubSpotService) {
        return res.status(500).json({ error: 'HubSpot service not available' });
      }

      // Fetch the full contact data from HubSpot
      const contact = await hubSpotService.getContactById(contactId);
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Enhance the contact's company data using public method
      await clientIntelEngine.searchHubSpotContacts(contact.properties?.email || contact.properties?.company || '', req.user?.email);
      
      // Return the enhanced data including Airtable fields
      const companyName = contact.properties?.company;
      const { airtableService } = await import('./airtable.js');
      const airtableData = companyName ? await airtableService.getEnrichedCompanyData(companyName, contact.properties?.email) : null;
      
      res.json({ 
        success: true, 
        message: 'Contact data enhanced successfully',
        airtableData: airtableData
      });
    } catch (error) {
      console.error('Data enhancement error:', error);
      res.status(500).json({ error: 'Enhancement failed' });
    }
  });

  // Generate AI insights for a client using async queue processing
  app.post("/api/client-intel/generate-insights", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.body;
      
      if (!clientId) {
        return res.status(400).json({ message: "Client ID is required" });
      }

      // Check cache first for immediate response
      const cacheKey = cache.generateKey(CachePrefix.OPENAI_ANALYSIS, clientId);
      const cachedInsights = await cache.get(cacheKey);
      
      if (cachedInsights) {
        console.log('Cache hit - returning cached insights for client:', clientId);
        return res.json(cachedInsights);
      }

      // Check if job is already in progress
      const jobStatusKey = `job:insights:${clientId}`;
      const existingJobId = await cache.get(jobStatusKey);
      
      if (existingJobId) {
        // Return job status if already processing
        const { aiInsightsQueue } = await import('./queue.js');
        const job = await aiInsightsQueue.getJob(existingJobId);
        
        if (job && (await job.getState()) === 'active') {
          return res.json({
            status: 'processing',
            progress: job.progress,
            jobId: existingJobId,
            message: 'AI insights are being generated. Check back shortly.'
          });
        }
      }

      // Get client data from HubSpot first
      let clientData: any = {};
      
      try {
        if (hubSpotService) {
          const contact = await hubSpotService.getContactById(clientId);
          if (contact) {
            clientData = {
              companyName: contact.properties.company || 'Unknown Company',
              industry: contact.properties.industry || null,
              revenue: contact.properties.annualrevenue,
              employees: parseInt(contact.properties.numemployees) || undefined,
              lifecycleStage: contact.properties.lifecyclestage || 'lead',
              services: await clientIntelEngine.getContactServices(clientId),
              hubspotProperties: contact.properties,
              lastActivity: contact.properties.lastmodifieddate,
              recentActivities: [] // Would fetch from activities API
            };
          }
        }
      } catch (hubspotError) {
        console.error('HubSpot data fetch failed:', hubspotError);
        // Continue with limited data for analysis
      }

      // Queue the expensive AI analysis
      const { getAIInsightsQueue } = await import('./queue.js');
      const aiInsightsQueue = getAIInsightsQueue();
      
      if (!aiInsightsQueue) {
        return res.status(503).json({ message: "Queue service unavailable" });
      }
      
      const job = await aiInsightsQueue.add('generate-insights', {
        contactId: clientId,
        clientData,
        userId: req.user?.id || 0,
        timestamp: Date.now()
      }, {
        priority: 1, // High priority
        delay: 0,
      });

      // Store job ID temporarily for status checks
      await cache.set(jobStatusKey, job.id, 300); // 5 minutes

      console.log(`[Queue] 🔄 Queued AI insights job ${job.id} for client ${clientId}`);

      // Return job status for polling
      res.json({
        status: 'queued',
        jobId: job.id,
        progress: 0,
        message: 'AI insights queued for processing. Check back shortly.'
      });

    } catch (error) {
      console.error('Insight generation error:', error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // Job status endpoint for polling AI insights progress
  app.get("/api/jobs/:jobId/status", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const { getAIInsightsQueue } = await import('./queue.js');
      const aiInsightsQueue = getAIInsightsQueue();
      
      if (!aiInsightsQueue) {
        return res.status(503).json({ message: "Queue service unavailable" });
      }
      
      const job = await aiInsightsQueue.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const state = await job.getState();
      const progress = job.progress || 0;

      if (state === 'completed') {
        const result = job.returnvalue;
        // Cache the result for future requests
        const { contactId } = job.data;
        const cacheKey = cache.generateKey(CachePrefix.OPENAI_ANALYSIS, contactId);
        await cache.set(cacheKey, result, CacheTTL.OPENAI_ANALYSIS);
        
        res.json({
          status: 'completed',
          progress: 100,
          result
        });
      } else if (state === 'failed') {
        res.json({
          status: 'failed',
          progress: 100,
          error: job.failedReason
        });
      } else {
        res.json({
          status: state,
          progress,
          message: state === 'active' ? 'Processing AI insights...' : 'Job in queue'
        });
      }
    } catch (error) {
      console.error('Job status error:', error);
      res.status(500).json({ message: "Failed to get job status" });
    }
  });

  // Queue metrics endpoint
  app.get("/api/queue/metrics", requireAuth, async (req, res) => {
    try {
      const { getQueueMetrics } = await import('./queue.js');
      const metrics = getQueueMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Queue metrics error:', error);
      res.status(500).json({ message: "Failed to get queue metrics" });
    }
  });

  // Cache statistics endpoint
  app.get("/api/cache/stats", requireAuth, async (req, res) => {
    try {
      const stats = await cache.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Cache stats error:', error);
      res.status(500).json({ message: "Failed to get cache stats" });
    }
  });

  // Cache management endpoints
  app.post("/api/cache/clear", requireAuth, async (req, res) => {
    try {
      await cache.clearAll();
      res.json({ message: "Cache cleared successfully" });
    } catch (error) {
      console.error('Cache clear error:', error);
      res.status(500).json({ message: "Failed to clear cache" });
    }
  });

  app.post("/api/cache/reset-stats", requireAuth, async (req, res) => {
    try {
      cache.resetStats();
      res.json({ message: "Cache statistics reset" });
    } catch (error) {
      console.error('Cache reset stats error:', error);
      res.status(500).json({ message: "Failed to reset cache statistics" });
    }
  });

  // Test Slack integration endpoint
  app.post("/api/test-slack", requireAuth, async (req, res) => {
    try {
      await sendSystemAlert(
        'Infrastructure Test Alert',
        'Testing Slack integration from Seed Financial Portal. All systems operational.',
        'low'
      );
      res.json({ message: "Test Slack message sent successfully" });
    } catch (error) {
      console.error('Test Slack error:', error);
      res.status(500).json({ message: "Failed to send test Slack message", error: error.message });
    }
  });

  // Sync profile data from HubSpot
  app.post("/api/user/sync-hubspot", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hubSpotService) {
        return res.status(500).json({ message: "HubSpot service not available" });
      }

      const hubspotData = await hubSpotService.getUserDetails(req.user.email);
      
      if (!hubspotData) {
        return res.status(404).json({ message: "User not found in HubSpot" });
      }

      // Update user with HubSpot data (name and email only)
      const updateData = {
        firstName: hubspotData.firstName,
        lastName: hubspotData.lastName,
        lastHubspotSync: new Date().toISOString()
      };

      const updatedUser = await storage.updateUserProfile(req.user.id, updateData);
      
      // Update the session with the new user data
      req.user = updatedUser;
      
      res.json({
        success: true,
        message: "Profile synced with HubSpot",
        syncedFields: Object.keys(updateData).filter(key => key !== 'lastHubspotSync'),
        data: {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          lastHubspotSync: updatedUser.lastHubspotSync
        }
      });
    } catch (error) {
      console.error('HubSpot sync error:', error);
      res.status(500).json({ message: "Failed to sync with HubSpot" });
    }
  });

  // Update user profile
  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const profileData = updateProfileSchema.parse(req.body);
      
      // If address information is provided, geocode to get coordinates
      let updateData: any = { ...profileData };
      
      if (profileData.address || profileData.city || profileData.state) {
        try {
          const fullAddress = `${profileData.address || ''}, ${profileData.city || ''}, ${profileData.state || ''} ${profileData.zipCode || ''}`.trim();
          
          if (fullAddress.length > 3) { // Basic validation
            const geocodeResponse = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(fullAddress)}&count=1&language=en&format=json`
            );
            
            if (geocodeResponse.ok) {
              const geocodeData = await geocodeResponse.json();
              if (geocodeData.results && geocodeData.results.length > 0) {
                const result = geocodeData.results[0];
                updateData = {
                  ...updateData,
                  latitude: result.latitude.toString(),
                  longitude: result.longitude.toString()
                };
              }
            }
          }
        } catch (geocodeError) {
          console.error('Geocoding failed, continuing without coordinates:', geocodeError);
        }
      }

      const updatedUser = await storage.updateUserProfile(req.user.id, updateData);
      
      // Update the session with the new user data
      req.user = updatedUser;
      
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        profilePhoto: updatedUser.profilePhoto,
        phoneNumber: updatedUser.phoneNumber,
        address: updatedUser.address,
        city: updatedUser.city,
        state: updatedUser.state,
        zipCode: updatedUser.zipCode,
        country: updatedUser.country,
        latitude: updatedUser.latitude,
        longitude: updatedUser.longitude,
        lastWeatherUpdate: updatedUser.lastWeatherUpdate,
        lastHubspotSync: updatedUser.lastHubspotSync
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      } else {
        console.error('Profile update error:', error);
        res.status(500).json({ message: "Failed to update profile" });
      }
    }
  });

  // Change password endpoint
  app.post("/api/user/change-password", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const passwordData = changePasswordSchema.parse(req.body);
      
      // Get current user with password hash
      const currentUser = await storage.getUserWithPassword(req.user.id);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePasswords(passwordData.currentPassword, currentUser.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(passwordData.newPassword);
      
      // Update password in database
      await storage.updateUserPassword(req.user.id, hashedNewPassword);
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid password data", errors: error.errors });
      } else {
        console.error('Password change error:', error);
        res.status(500).json({ message: "Failed to change password" });
      }
    }
  });

  // Upload profile photo
  app.post("/api/user/upload-photo", requireAuth, upload.single('photo'), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }

      // Generate URL for uploaded file
      const photoUrl = `/uploads/profiles/${req.file.filename}`;

      // Update user profile with new photo URL
      const updatedUser = await storage.updateUserProfile(req.user.id, { profilePhoto: photoUrl });
      
      // Update the session with the new user data
      req.user = updatedUser;

      res.json({ photoUrl });
    } catch (error) {
      console.error('Photo upload error:', error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Get dashboard metrics for the logged-in user
  app.get("/api/dashboard/metrics", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hubSpotService) {
        return res.status(500).json({ message: "HubSpot integration not configured" });
      }

      // Use cache for dashboard metrics
      const cacheKey = cache.generateKey(CachePrefix.HUBSPOT_METRICS, req.user.email);
      const metrics = await cache.wrap(
        cacheKey,
        () => hubSpotService.getDashboardMetrics(req.user.email),
        { ttl: CacheTTL.HUBSPOT_METRICS }
      );
      
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Test Airtable connection endpoint
  app.get('/api/test-airtable', async (req, res) => {
    try {
      // Import airtable service
      const { airtableService } = await import('./airtable.js');
      
      console.log('Testing Airtable connection...');
      const testResult = await airtableService.findCompanyByName('Test Company');
      
      res.json({
        success: true,
        message: 'Airtable connection test completed',
        hasBase: !!airtableService,
        testResult: testResult ? 'Found record' : 'No record found',
        credentials: {
          apiKey: process.env.AIRTABLE_API_KEY ? 'Present' : 'Missing',
          baseId: process.env.AIRTABLE_BASE_ID ? 'Present' : 'Missing'
        }
      });
    } catch (error) {
      console.error('Airtable test error:', error);
      res.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        credentials: {
          apiKey: process.env.AIRTABLE_API_KEY ? 'Present' : 'Missing',
          baseId: process.env.AIRTABLE_BASE_ID ? 'Present' : 'Missing'
        }
      });
    }
  });

  // Knowledge Base API endpoints
  
  // Get all categories
  app.get("/api/kb/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getKbCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Create new category
  app.post("/api/kb/categories", requireAuth, async (req, res) => {
    try {
      const categoryData = insertKbCategorySchema.parse(req.body);
      const category = await storage.createKbCategory(categoryData);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid category data", errors: error.errors });
      } else {
        console.error('Error creating category:', error);
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  // Get articles (with optional filters)
  app.get("/api/kb/articles", requireAuth, async (req, res) => {
    try {
      const { categoryId, status, featured, title } = req.query;
      
      const articles = await storage.getKbArticles(
        categoryId ? parseInt(categoryId as string) : undefined,
        status as string,
        featured === 'true' ? true : featured === 'false' ? false : undefined,
        title as string
      );
      
      res.json(articles);
    } catch (error) {
      console.error('Error fetching articles:', error);
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  // Get single article by ID
  app.get("/api/kb/articles/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getKbArticle(parseInt(id));
      
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Increment view count
      await storage.incrementArticleViews(parseInt(id));
      
      res.json(article);
    } catch (error) {
      console.error('Error fetching article:', error);
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // Get article by slug
  app.get("/api/kb/articles/slug/:slug", requireAuth, async (req, res) => {
    try {
      const { slug } = req.params;
      const article = await storage.getKbArticleBySlug(slug);
      
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Increment view count
      await storage.incrementArticleViews(article.id);
      
      res.json(article);
    } catch (error) {
      console.error('Error fetching article:', error);
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // Create new article
  app.post("/api/kb/articles", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Ensure proper data types before validation
      const requestBody = {
        ...req.body,
        categoryId: parseInt(req.body.categoryId),
        authorId: req.user.id,
        tags: Array.isArray(req.body.tags) ? req.body.tags : 
              (req.body.tags ? req.body.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [])
      };

      const articleData = insertKbArticleSchema.parse(requestBody);

      // Generate unique slug if not provided or check for duplicates
      if (!articleData.slug) {
        const baseSlug = articleData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        
        // Add timestamp to ensure uniqueness
        articleData.slug = `${baseSlug}-${Date.now()}`;
      }

      // Check for duplicate slug
      const existingBySlug = await storage.getKbArticleBySlug(articleData.slug);
      if (existingBySlug) {
        // Generate a new unique slug with timestamp
        const baseSlug = articleData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        articleData.slug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // Check for duplicate title by same author (prevent accidental duplicates)
      const existingByTitle = await storage.getKbArticles(undefined, undefined, undefined, articleData.title);
      const duplicateByAuthor = existingByTitle.find(article => article.authorId === req.user!.id);
      
      if (duplicateByAuthor) {
        return res.status(409).json({ 
          message: "Article with this title already exists", 
          existingArticleId: duplicateByAuthor.id 
        });
      }

      const article = await storage.createKbArticle(articleData);
      res.json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Article validation errors:', error.errors);
        res.status(400).json({ message: "Invalid article data", errors: error.errors });
      } else {
        console.error('Error creating article:', error);
        res.status(500).json({ message: "Failed to create article" });
      }
    }
  });

  // Update article
  app.patch("/api/kb/articles/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const article = await storage.updateKbArticle(parseInt(id), updateData);
      res.json(article);
    } catch (error) {
      console.error('Error updating article:', error);
      res.status(500).json({ message: "Failed to update article" });
    }
  });

  // Delete article (permanently removes from database)
  app.delete("/api/kb/articles/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const articleId = parseInt(id);
      
      // Get article details for audit log
      const article = await storage.getKbArticle(articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Log deletion attempt
      console.log(`🗑️ ARTICLE DELETION AUDIT: User ${req.user.email} permanently deleted article "${article.title}" (ID: ${articleId}) at ${new Date().toISOString()}`);
      
      await storage.deleteKbArticle(articleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting article:', error);
      res.status(500).json({ message: "Failed to delete article" });
    }
  });

  // Archive article (sets status to archived)
  app.patch("/api/kb/articles/:id/archive", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const articleId = parseInt(id);
      
      // Get article details for audit log
      const article = await storage.getKbArticle(articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Log archive attempt
      console.log(`📦 ARTICLE ARCHIVE AUDIT: User ${req.user.email} archived article "${article.title}" (ID: ${articleId}) at ${new Date().toISOString()}`);
      
      await storage.archiveKbArticle(articleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error archiving article:', error);
      res.status(500).json({ message: "Failed to archive article" });
    }
  });

  // Undelete article (restore from archive)
  app.patch("/api/kb/articles/:id/undelete", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const articleId = parseInt(id);
      
      // Get article details for audit log
      const article = await storage.getKbArticle(articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Log undelete attempt
      console.log(`♻️ ARTICLE RESTORE AUDIT: User ${req.user.email} restored article "${article.title}" (ID: ${articleId}) at ${new Date().toISOString()}`);
      
      await storage.undeleteKbArticle(articleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error restoring article:', error);
      res.status(500).json({ message: "Failed to restore article" });
    }
  });

  // Search articles
  app.get("/api/kb/search", requireAuth, searchRateLimit, async (req, res) => {
    try {
      const { q: query } = req.query;
      
      if (!query || typeof query !== 'string' || query.length < 2) {
        return res.json([]);
      }

      const articles = await storage.searchKbArticles(query, req.user?.id);
      
      // Record search history
      if (req.user) {
        await storage.recordKbSearch({
          userId: req.user.id,
          query,
          resultsCount: articles.length
        });
      }
      
      res.json(articles);
    } catch (error) {
      console.error('Error searching articles:', error);
      res.status(500).json({ message: "Failed to search articles" });
    }
  });

  // Get user bookmarks
  app.get("/api/kb/bookmarks", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const bookmarks = await storage.getUserKbBookmarks(req.user.id);
      res.json(bookmarks);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  });

  // Create bookmark
  app.post("/api/kb/bookmarks", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const bookmarkData = insertKbBookmarkSchema.parse({
        ...req.body,
        userId: req.user.id
      });

      const bookmark = await storage.createKbBookmark(bookmarkData);
      res.json(bookmark);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid bookmark data", errors: error.errors });
      } else {
        console.error('Error creating bookmark:', error);
        res.status(500).json({ message: "Failed to create bookmark" });
      }
    }
  });

  // Delete bookmark
  app.delete("/api/kb/bookmarks/:articleId", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { articleId } = req.params;
      await storage.deleteKbBookmark(req.user.id, parseInt(articleId));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      res.status(500).json({ message: "Failed to delete bookmark" });
    }
  });

  // AI Article Generator endpoints
  
  // Get available templates
  app.get("/api/kb/ai/templates", requireAuth, async (req, res) => {
    try {
      const { anthropicService } = await import('./services/anthropic.js');
      const templates = anthropicService.getAvailableTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Generate article outline
  app.post("/api/kb/ai/generate-outline", requireAuth, async (req, res) => {
    try {
      const { anthropicService } = await import('./services/anthropic.js');
      const result = await anthropicService.generateArticleOutline(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error generating outline:', error);
      res.status(500).json({ message: "Failed to generate outline" });
    }
  });

  // Generate article draft
  app.post("/api/kb/ai/generate-draft", requireAuth, async (req, res) => {
    try {
      const { anthropicService } = await import('./services/anthropic.js');
      const { outline, ...requestData } = req.body;
      const result = await anthropicService.generateArticleDraft(requestData, outline);
      res.json(result);
    } catch (error) {
      console.error('Error generating draft:', error);
      res.status(500).json({ message: "Failed to generate draft" });
    }
  });

  // Polish article
  app.post("/api/kb/ai/polish", requireAuth, async (req, res) => {
    try {
      const { anthropicService } = await import('./services/anthropic.js');
      const { draft, ...requestData } = req.body;
      const result = await anthropicService.polishArticle(draft, requestData);
      res.json(result);
    } catch (error) {
      console.error('Error polishing article:', error);
      res.status(500).json({ message: "Failed to polish article" });
    }
  });

  // Re-draft with selected improvements
  app.post("/api/kb/ai/redraft-with-improvements", requireAuth, async (req, res) => {
    try {
      const { anthropicService } = await import('./services/anthropic.js');
      const { currentContent, selectedImprovements, ...requestData } = req.body;
      const result = await anthropicService.redraftWithImprovements(currentContent, selectedImprovements, requestData);
      res.json(result);
    } catch (error) {
      console.error('Error re-drafting with improvements:', error);
      res.status(500).json({ message: "Failed to re-draft with improvements" });
    }
  });

  // Generate multiple audience versions
  app.post("/api/kb/ai/generate-versions", requireAuth, async (req, res) => {
    try {
      const { anthropicService } = await import('./services/anthropic.js');
      const { baseContent, ...requestData } = req.body;
      const result = await anthropicService.generateMultipleVersions(requestData, baseContent);
      res.json(result);
    } catch (error) {
      console.error('Error generating versions:', error);
      res.status(500).json({ message: "Failed to generate versions" });
    }
  });

  // Analyze content quality
  app.post("/api/kb/ai/analyze", requireAuth, async (req, res) => {
    try {
      const { anthropicService } = await import('./services/anthropic.js');
      const { content } = req.body;
      const result = await anthropicService.analyzeContent(content);
      res.json(result);
    } catch (error) {
      console.error('Error analyzing content:', error);
      res.status(500).json({ message: "Failed to analyze content" });
    }
  });

  // Generate article metadata (excerpt and tags)
  app.post("/api/kb/ai/generate-metadata", requireAuth, async (req, res) => {
    try {
      const { anthropicService } = await import('./services/anthropic.js');
      const { content, title } = req.body;
      const result = await anthropicService.generateMetadata(content, title);
      res.json(result);
    } catch (error) {
      console.error('Error generating metadata:', error);
      res.status(500).json({ message: "Failed to generate metadata" });
    }
  });

  // Test Sentry error tracking (remove in production)
  app.get("/api/test-sentry", (_req, res) => {
    throw new Error("Test Sentry error - this is intentional!");
  });

  // Stripe routes for revenue data
  app.get("/api/stripe/revenue", requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ 
          status: 'error', 
          message: 'Stripe not configured - missing STRIPE_SECRET_KEY' 
        });
      }

      const Stripe = await import('stripe');
      const stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });

      // Get current date and calculate time ranges
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Fetch all revenue data from Stripe with pagination to get all transactions
      const fetchAllCharges = async (params: any) => {
        let allCharges = [];
        let hasMore = true;
        let startingAfter = undefined;
        
        while (hasMore) {
          const response = await stripe.charges.list({
            ...params,
            limit: 100,
            starting_after: startingAfter,
          });
          
          allCharges.push(...response.data);
          hasMore = response.has_more;
          if (hasMore && response.data.length > 0) {
            startingAfter = response.data[response.data.length - 1].id;
          }
        }
        
        return { data: allCharges };
      };

      const [currentMonthCharges, yearToDateCharges, lastMonthCharges] = await Promise.all([
        fetchAllCharges({
          created: {
            gte: Math.floor(startOfMonth.getTime() / 1000),
          },
          expand: ['data.balance_transaction'],
        }),
        fetchAllCharges({
          created: {
            gte: Math.floor(startOfYear.getTime() / 1000),
          },
          expand: ['data.balance_transaction'],
        }),
        fetchAllCharges({
          created: {
            gte: Math.floor(lastMonth.getTime() / 1000),
            lt: Math.floor(endOfLastMonth.getTime() / 1000),
          },
          expand: ['data.balance_transaction'],
        }),
      ]);

      console.log('=== STRIPE REVENUE DEBUG ===');
      console.log(`Current Month: ${currentMonthCharges.data.length} total, ${currentMonthCharges.data.filter((c: any) => c.status === 'succeeded').length} succeeded`);
      console.log(`Year to Date: ${yearToDateCharges.data.length} total, ${yearToDateCharges.data.filter((c: any) => c.status === 'succeeded').length} succeeded`);
      console.log(`Last Month: ${lastMonthCharges.data.length} total, ${lastMonthCharges.data.filter((c: any) => c.status === 'succeeded').length} succeeded`);
      
      console.log('=== YEAR TO DATE BREAKDOWN ===');
      console.log(`Live mode: ${yearToDateCharges.data.filter((c: any) => c.livemode === true).length}`);
      console.log(`Test mode: ${yearToDateCharges.data.filter((c: any) => c.livemode === false).length}`);
      console.log(`Live + Succeeded: ${yearToDateCharges.data.filter((c: any) => c.status === 'succeeded' && c.livemode === true).length}`);
      console.log(`Failed: ${yearToDateCharges.data.filter((c: any) => c.status === 'failed').length}`);
      console.log(`Refunded: ${yearToDateCharges.data.filter((c: any) => c.refunded === true).length}`);
      
      // Log ALL charges for year to date to see what we're getting
      console.log('=== ALL YTD CHARGES ===');
      const succeededCharges = yearToDateCharges.data
        .filter((c: any) => c.status === 'succeeded' && c.livemode === true)
        .sort((a: any, b: any) => b.created - a.created); // Sort by most recent first
      
      console.log(`Found ${succeededCharges.length} successful live charges:`);
      succeededCharges.forEach((charge: any, index: number) => {
        const chargeType = charge.id.startsWith('ch_') ? 'CHARGE' : 
                          charge.id.startsWith('py_') ? 'PAYMENT' : 
                          charge.id.startsWith('pi_') ? 'INTENT' : 'OTHER';
        const originalAmount = charge.amount / 100;
        const currency = charge.currency.toLowerCase();
        
        // Use Stripe's balance_transaction for actual converted amounts
        const balanceTransaction = charge.balance_transaction;
        const convertedAmount = balanceTransaction ? 
          (balanceTransaction.amount / 100) : // Use Stripe's converted amount
          originalAmount; // Fallback to original if no balance transaction
        
        const displayAmount = currency === 'usd' ? 
          `$${originalAmount.toFixed(2)} USD` :
          `${originalAmount.toFixed(2)} ${currency.toUpperCase()} (Stripe converted: $${convertedAmount.toFixed(2)} USD)`;
        
        console.log(`${index + 1}. ${charge.id} (${chargeType}): ${displayAmount}, ${new Date(charge.created * 1000).toLocaleDateString()}, ${charge.description || 'No description'}`);
      });
      console.log('=== END CHARGES ===');

      // Calculate totals using Stripe's actual converted amounts from balance_transaction
      const calculateRevenue = (charges: any) => {
        return charges.data
          .filter((charge: any) => charge.status === 'succeeded' && charge.livemode === true)
          .reduce((sum: number, charge: any) => {
            // Use Stripe's balance_transaction for actual converted amount
            const balanceTransaction = charge.balance_transaction;
            if (balanceTransaction) {
              // Stripe's balance_transaction.amount is in your account's default currency (USD)
              return sum + (balanceTransaction.amount / 100);
            } else {
              // Fallback: assume it's already in USD if no balance transaction
              return sum + (charge.amount / 100);
            }
          }, 0);
      };

      const calculateTransactionCount = (charges: any) => {
        return charges.data.filter((c: any) => c.status === 'succeeded' && c.livemode === true).length;
      };

      const currentMonthRevenue = calculateRevenue(currentMonthCharges);
      const yearToDateRevenue = calculateRevenue(yearToDateCharges);
      const lastMonthRevenue = calculateRevenue(lastMonthCharges);

      // Calculate growth percentage
      const monthOverMonthGrowth = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      res.json({
        currentMonth: {
          revenue: currentMonthRevenue,
          transactions: calculateTransactionCount(currentMonthCharges),
        },
        lastMonth: {
          revenue: lastMonthRevenue,
          transactions: calculateTransactionCount(lastMonthCharges),
        },
        yearToDate: {
          revenue: yearToDateRevenue,
          transactions: calculateTransactionCount(yearToDateCharges),
        },
        growth: {
          monthOverMonth: monthOverMonthGrowth,
        },
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Stripe revenue fetch error:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch revenue data from Stripe',
        error: error.message 
      });
    }
  });

  app.get("/api/stripe/recent-transactions", requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ 
          status: 'error', 
          message: 'Stripe not configured - missing STRIPE_SECRET_KEY' 
        });
      }

      const Stripe = await import('stripe');
      const stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });

      const charges = await stripe.charges.list({
        limit: 10,
      });

      const transactions = charges.data.map((charge: any) => ({
        id: charge.id,
        amount: charge.amount / 100, // Convert from cents
        currency: charge.currency.toUpperCase(),
        status: charge.status,
        description: charge.description || 'No description',
        customer: charge.billing_details?.name || 'Unknown',
        created: new Date(charge.created * 1000).toISOString(),
        receipt_url: charge.receipt_url,
      }));

      res.json({
        transactions,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Stripe transactions fetch error:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch recent transactions from Stripe',
        error: error.message 
      });
    }
  });

  // CDN and Asset Optimization endpoints
  
  // Get compression statistics
  app.get("/api/cdn/compression-stats", requireAuth, async (req, res) => {
    try {
      const { assetOptimization } = await import('./middleware/asset-optimization.js');
      const stats = assetOptimization.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Compression stats error:', error);
      res.status(500).json({ message: "Failed to get compression stats" });
    }
  });

  // Reset compression statistics
  app.post("/api/cdn/reset-compression-stats", requireAuth, async (req, res) => {
    try {
      const { assetOptimization } = await import('./middleware/asset-optimization.js');
      assetOptimization.resetStats();
      res.json({ message: "Compression statistics reset successfully" });
    } catch (error) {
      console.error('Reset compression stats error:', error);
      res.status(500).json({ message: "Failed to reset compression statistics" });
    }
  });

  // Get CDN performance metrics
  app.get("/api/cdn/performance", requireAuth, async (req, res) => {
    try {
      const { cdnService } = await import('./cdn.js');
      const manifest = cdnService.getManifest();
      
      const totalAssets = Object.keys(manifest).length;
      const totalSize = Object.values(manifest).reduce((sum, asset) => sum + asset.size, 0);
      const averageSize = totalAssets > 0 ? totalSize / totalAssets : 0;
      
      res.json({
        totalAssets,
        totalSize,
        averageSize,
        lastUpdated: new Date().toISOString(),
        cacheHeaders: 'enabled',
        compression: 'enabled'
      });
    } catch (error) {
      console.error('CDN performance error:', error);
      res.status(500).json({ message: "Failed to get CDN performance metrics" });
    }
  });

  // Rebuild asset manifest
  app.post("/api/cdn/rebuild-manifest", requireAuth, async (req, res) => {
    try {
      const { cdnService } = await import('./cdn.js');
      await cdnService.initialize();
      res.json({ message: "Asset manifest rebuilt successfully" });
    } catch (error) {
      console.error('Rebuild manifest error:', error);
      res.status(500).json({ message: "Failed to rebuild asset manifest" });
    }
  });

  // HubSpot Background Jobs endpoints
  
  // Get HubSpot queue metrics
  app.get("/api/hubspot/queue-metrics", requireAuth, async (req, res) => {
    try {
      const { getHubSpotQueueMetrics } = await import('./hubspot-background-jobs.js');
      const metrics = await getHubSpotQueueMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('HubSpot queue metrics error:', error);
      res.status(500).json({ message: "Failed to get HubSpot queue metrics" });
    }
  });

  // Schedule HubSpot sync jobs
  app.post("/api/hubspot/schedule-sync", requireAuth, async (req, res) => {
    try {
      const { type, contactId, dealId } = req.body;
      const { 
        scheduleFullSync, 
        scheduleIncrementalSync, 
        scheduleContactEnrichment, 
        scheduleDealSync 
      } = await import('./hubspot-background-jobs.js');
      
      let jobId = null;
      
      switch (type) {
        case 'full-sync':
          jobId = await scheduleFullSync(req.user?.id);
          break;
        case 'incremental-sync':
          jobId = await scheduleIncrementalSync();
          break;
        case 'contact-enrichment':
          if (!contactId) {
            return res.status(400).json({ message: "Contact ID required for contact enrichment" });
          }
          jobId = await scheduleContactEnrichment(contactId, req.user?.id);
          break;
        case 'deal-sync':
          jobId = await scheduleDealSync(dealId);
          break;
        default:
          return res.status(400).json({ message: "Invalid sync type" });
      }
      
      if (jobId) {
        res.json({ message: `${type} scheduled successfully`, jobId });
      } else {
        res.status(500).json({ message: `Failed to schedule ${type}` });
      }
    } catch (error) {
      console.error('Schedule HubSpot sync error:', error);
      res.status(500).json({ message: "Failed to schedule HubSpot sync" });
    }
  });

  // Check HubSpot API health
  app.get("/api/hubspot/health", requireAuth, async (req, res) => {
    try {
      const { checkHubSpotApiHealth } = await import('./hubspot-background-jobs.js');
      const isHealthy = await checkHubSpotApiHealth();
      
      res.json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        hasApiAccess: isHealthy
      });
    } catch (error) {
      console.error('HubSpot health check error:', error);
      res.status(500).json({ 
        status: 'error',
        message: "Failed to check HubSpot health",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Search HubSpot contacts
  app.post("/api/hubspot/search-contacts", requireAuth, async (req, res) => {
    try {
      const { searchTerm } = req.body;
      
      if (!searchTerm || searchTerm.length < 2) {
        return res.json({ contacts: [] });
      }

      const { HubSpotService } = await import('./hubspot.js');
      const hubspotService = new HubSpotService();
      
      // Get the current user's email from session
      const userEmail = req.user?.email;
      console.log(`Searching HubSpot contacts for term: "${searchTerm}", user: ${userEmail}`);
      
      // Search contacts using the advanced method with optional user filtering
      // First try without user filtering to ensure basic search works
      const contacts = await hubspotService.searchContacts(searchTerm);
      console.log(`Found ${contacts.length} contacts for search term: "${searchTerm}"`);
      
      res.json({ contacts });
    } catch (error) {
      console.error('HubSpot search contacts error:', error);
      res.status(500).json({ 
        message: "Failed to search HubSpot contacts",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Clean up HubSpot queue
  app.post("/api/hubspot/cleanup-queue", requireAuth, async (req, res) => {
    try {
      const { cleanupHubSpotQueue } = await import('./hubspot-background-jobs.js');
      await cleanupHubSpotQueue();
      res.json({ message: "HubSpot queue cleanup completed successfully" });
    } catch (error) {
      console.error('HubSpot queue cleanup error:', error);
      res.status(500).json({ message: "Failed to cleanup HubSpot queue" });
    }
  });

  // Commission tracking routes
  
  // Get sales reps
  app.get("/api/sales-reps", requireAuth, async (req, res) => {
    try {
      // Use raw SQL to handle schema mismatch
      const result = await db.execute(sql`
        SELECT 
          sr.id,
          sr.user_id,
          sr.first_name,
          sr.last_name,
          sr.email,
          sr.hubspot_user_id,
          sr.is_active,
          sr.created_at,
          sr.updated_at,
          u.name as user_name
        FROM sales_reps sr
        LEFT JOIN users u ON sr.user_id = u.id
        WHERE sr.is_active = true
        ORDER BY sr.id ASC
      `);
      
      // Transform to match expected frontend structure
      const salesReps = result.rows.map((rep: any) => ({
        id: rep.id,
        userId: rep.user_id,
        name: rep.first_name && rep.last_name ? `${rep.first_name} ${rep.last_name}` : rep.user_name || 'Unknown',
        email: rep.email,
        hubspotUserId: rep.hubspot_user_id,
        isActive: rep.is_active,
        createdAt: rep.created_at,
        updatedAt: rep.updated_at
      }));
      
      res.json(salesReps);
    } catch (error) {
      console.error('Error fetching sales reps:', error);
      // Return empty array instead of 500 error to prevent console errors
      res.json([]);
    }
  });

  // Get current user's sales rep profile
  app.get("/api/sales-reps/me", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }
      
      const salesRep = await storage.getSalesRepByUserId(req.user.id);
      res.json(salesRep || null);
    } catch (error) {
      console.error('Error fetching current sales rep:', error);
      res.status(500).json({ message: "Failed to fetch sales rep profile" });
    }
  });

  // Get deals
  app.get("/api/deals", requireAuth, async (req, res) => {
    try {
      const { salesRepId } = req.query;
      
      let dealsData: any[] = [];
      
      // Use raw SQL to handle schema mismatch
      if (salesRepId) {
        const result = await db.execute(sql`
          SELECT 
            id,
            hubspot_deal_id,
            deal_name,
            amount,
            monthly_value,
            setup_fee,
            close_date,
            deal_stage,
            deal_owner,
            sales_rep_id,
            company_name,
            service_type,
            is_collected,
            created_at,
            updated_at
          FROM deals 
          WHERE sales_rep_id = ${parseInt(salesRepId as string)}
          ORDER BY updated_at DESC
        `);
        dealsData = result.rows;
      } else {
        const result = await db.execute(sql`
          SELECT 
            id,
            hubspot_deal_id,
            deal_name,
            amount,
            monthly_value,
            setup_fee,
            close_date,
            deal_stage,
            deal_owner,
            sales_rep_id,
            company_name,
            service_type,
            is_collected,
            created_at,
            updated_at
          FROM deals 
          ORDER BY updated_at DESC
        `);
        dealsData = result.rows;
      }
      
      // Transform to match expected frontend structure
      const transformedDeals = dealsData.map((deal: any) => ({
        id: deal.id,
        hubspotDealId: deal.hubspot_deal_id,
        dealName: deal.deal_name,
        amount: parseFloat((deal.amount || 0).toString()),
        monthlyValue: parseFloat((deal.monthly_value || 0).toString()),
        setupFee: parseFloat((deal.setup_fee || 0).toString()),
        closeDate: deal.close_date,
        dealStage: deal.deal_stage,
        dealOwner: deal.deal_owner,
        salesRepId: deal.sales_rep_id,
        companyName: deal.company_name,
        serviceType: deal.service_type,
        isCollected: deal.is_collected,
        createdAt: deal.created_at,
        updatedAt: deal.updated_at
      }));
      
      res.json(transformedDeals);
    } catch (error) {
      console.error('Error fetching deals:', error);
      // Return empty array instead of 500 error to prevent console errors
      res.json([]);
    }
  });

  // Get commissions
  app.get("/api/commissions", requireAuth, async (req, res) => {
    try {
      const { salesRepId } = req.query;
      
      let commissionsData: any[] = [];
      
      // Use raw SQL to handle schema mismatch
      if (salesRepId) {
        const result = await db.execute(sql`
          SELECT 
            id,
            deal_id,
            sales_rep_id,
            commission_type,
            commission_amount,
            is_paid,
            paid_at,
            month_number,
            created_at,
            rate,
            base_amount
          FROM commissions 
          WHERE sales_rep_id = ${parseInt(salesRepId as string)}
          ORDER BY created_at DESC
        `);
        commissionsData = result.rows;
      } else if (req.user && req.user.role === 'admin') {
        // Admin users get all commissions with proper company/contact info
        const result = await db.execute(sql`
          SELECT 
            c.id,
            c.hubspot_invoice_id,
            c.sales_rep_id,
            c.type as commission_type,
            c.amount,
            c.status,
            c.month_number,
            c.service_type,
            c.date_earned,
            c.created_at,
            hi.company_name,
            CONCAT(sr.first_name, ' ', sr.last_name) as sales_rep_name,
            string_agg(DISTINCT hil.name, ', ') as service_names
          FROM commissions c
          LEFT JOIN hubspot_invoices hi ON c.hubspot_invoice_id = hi.id
          LEFT JOIN sales_reps sr ON c.sales_rep_id = sr.id
          LEFT JOIN hubspot_invoice_line_items hil ON hi.id = hil.invoice_id
          GROUP BY c.id, c.hubspot_invoice_id, c.sales_rep_id, c.type, c.amount, c.status, 
                   c.month_number, c.service_type, c.date_earned, c.created_at, 
                   hi.company_name, sr.first_name, sr.last_name
          ORDER BY c.created_at DESC
        `);
        commissionsData = result.rows;
      } else {
        // Regular users get their own commissions
        const salesRepResult = await db.execute(sql`
          SELECT id FROM sales_reps WHERE user_id = ${req.user!.id} AND is_active = true LIMIT 1
        `);
        
        if (salesRepResult.rows.length > 0) {
          const userSalesRepId = (salesRepResult.rows[0] as any).id;
          const result = await db.execute(sql`
            SELECT 
              id,
              deal_id,
              sales_rep_id,
              commission_type,
              commission_amount,
              is_paid,
              paid_at,
              month_number,
              created_at,
              rate,
              base_amount
            FROM commissions 
            WHERE sales_rep_id = ${userSalesRepId}
            ORDER BY created_at DESC
          `);
          commissionsData = result.rows;
        }
      }
      
      // Enhance commission data with deal and sales rep information
      const commissionsWithDetails = await Promise.all(
        commissionsData.map(async (comm: any) => {
          // Get deal information
          const dealResult = await db.execute(sql`
            SELECT deal_name, company_name, service_type 
            FROM deals 
            WHERE id = ${comm.deal_id} 
            LIMIT 1
          `);
          
          // Get sales rep information  
          const salesRepResult = await db.execute(sql`
            SELECT first_name, last_name 
            FROM sales_reps 
            WHERE id = ${comm.sales_rep_id} 
            LIMIT 1
          `);
          
          const deal = dealResult.rows[0] as any;
          const salesRep = salesRepResult.rows[0] as any;
          
          return {
            id: comm.id,
            deal_id: comm.deal_id,
            deal_name: deal?.deal_name || `Commission ${comm.id}`,
            company_name: deal?.company_name || 'Unknown Company',
            sales_rep_id: comm.sales_rep_id,
            sales_rep_name: salesRep ? `${salesRep.first_name} ${salesRep.last_name}` : 'Unknown Rep',
            service_type: deal?.service_type || 'bookkeeping',
            type: comm.commission_type || 'month_1', 
            amount: parseFloat((comm.commission_amount || 0).toString()),
            status: comm.is_paid ? 'paid' : 'pending',
            month_number: comm.month_number || 1,
            date_earned: new Date(comm.created_at).toISOString().split('T')[0],
            date_paid: comm.paid_at ? new Date(comm.paid_at).toISOString().split('T')[0] : null,
            hubspot_deal_id: deal?.hubspot_deal_id || null,
            commission_type: comm.commission_type,
            rate: parseFloat((comm.rate || 0).toString()),
            base_amount: parseFloat((comm.base_amount || 0).toString()),
            created_at: comm.created_at
          };
        })
      );
      
      console.log(`📊 Returning ${commissionsWithDetails.length} commissions to frontend`);
      console.log('Commission sample:', JSON.stringify(commissionsWithDetails[0], null, 2));
      res.set('Cache-Control', 'no-cache');
      res.set('ETag', Date.now().toString());
      res.json(commissionsWithDetails);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      // Return empty array instead of 500 error to prevent console errors
      res.json([]);
    }
  });

  // Initialize HubSpot sync on server startup
  async function initializeHubSpotSync() {
    try {
      console.log('🚀 Starting initial HubSpot commission sync...');
      
      // Check if we already have data
      const existingData = await db.execute(sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`);
      const salesRepCount = (existingData.rows[0] as any).count;
      
      if (salesRepCount === 0) {
        console.log('📦 No existing data found. Performing full sync...');
        const results = await hubspotSync.performFullSync();
        console.log('✅ Initial HubSpot sync completed:', results);
      } else {
        console.log(`📊 Found ${salesRepCount} existing sales reps. Skipping initial sync.`);
      }
    } catch (error) {
      console.error('❌ Initial HubSpot sync failed:', error);
      // Don't fail server startup if sync fails
    }
  }

  // Trigger initial sync after a short delay to ensure server is ready
  setTimeout(initializeHubSpotSync, 3000);

  // Debug endpoint to directly search HubSpot invoices
  app.get("/api/debug/hubspot-invoices", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { HubSpotService } = await import('./hubspot.js');
      const hubspotService = new HubSpotService();
      
      console.log('🔍 Searching for all invoices in HubSpot...');
      
      // Search for all invoices (multiple approaches)
      const searches = [
        // Approach 1: Search invoices object
        hubspotService.makeRequest('/crm/v3/objects/invoices?limit=100&properties=hs_invoice_amount,hs_invoice_number,hs_invoice_status,hs_createdate,hs_lastmodifieddate,hs_associated_deal,associated_deal_id'),
        
        // Approach 2: Search with different properties 
        hubspotService.makeRequest('/crm/v3/objects/invoices?limit=100&properties=amount,invoice_number,status,createdate,lastmodifieddate,deal_id'),
        
        // Approach 3: Search for line items (which might be what you have)
        hubspotService.makeRequest('/crm/v3/objects/line_items?limit=100&properties=name,price,quantity,amount,createdate,hs_associated_deal'),
        
        // Approach 4: Search products 
        hubspotService.makeRequest('/crm/v3/objects/products?limit=100&properties=name,price,description,createdate'),
      ];
      
      const results = await Promise.allSettled(searches);
      
      let foundData = {
        invoices_approach1: [],
        invoices_approach2: [], 
        line_items: [],
        products: [],
        summary: {}
      };
      
      // Process each result
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value?.results) {
          const data = result.value.results;
          switch(index) {
            case 0: foundData.invoices_approach1 = data; break;
            case 1: foundData.invoices_approach2 = data; break;
            case 2: foundData.line_items = data; break;
            case 3: foundData.products = data; break;
          }
        }
      });
      
      // Create summary
      foundData.summary = {
        invoices_count_approach1: foundData.invoices_approach1.length,
        invoices_count_approach2: foundData.invoices_approach2.length,
        line_items_count: foundData.line_items.length,
        products_count: foundData.products.length,
        total_found: foundData.invoices_approach1.length + foundData.invoices_approach2.length + foundData.line_items.length + foundData.products.length
      };
      
      console.log('📊 HubSpot Invoice Search Results:', foundData.summary);
      
      res.json(foundData);
      
    } catch (error) {
      console.error('❌ Error searching HubSpot invoices:', error);
      res.status(500).json({ message: "Failed to search HubSpot invoices", error: error.message });
    }
  });

  // Sync real commission data from HubSpot invoices using our comprehensive sync system
  app.post("/api/commissions/sync-hubspot", requireAuth, async (req, res) => {
    try {
      // Only allow admin users to trigger sync
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('🔄 Starting comprehensive HubSpot sync with real invoice data...');
      
      // Use our dedicated HubSpot sync class with detailed logging
      const results = await hubspotSync.performFullSync();
      
      console.log('✅ HubSpot sync completed with results:', results);
      
      res.json({
        success: true,
        message: "Real HubSpot commission data synced successfully",
        results: {
          salesRepsProcessed: results.salesReps,
          invoicesProcessed: results.invoicesProcessed || 0,
          dealsProcessed: 0, // We're using invoices now, not deals
          commissionsCreated: results.commissions
        }
      });
      
    } catch (error) {
      console.error('❌ HubSpot sync failed:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to sync HubSpot data", 
        error: error.message 
      });
    }
  });

  // Get monthly bonuses
  app.get("/api/monthly-bonuses", requireAuth, async (req, res) => {
    try {
      const { salesRepId } = req.query;
      
      let bonuses;
      if (salesRepId) {
        bonuses = await storage.getMonthlyBonusesBySalesRep(parseInt(salesRepId as string));
      } else {
        // If no specific sales rep, try to get for current user
        const salesRep = await storage.getSalesRepByUserId(req.user!.id);
        if (salesRep) {
          bonuses = await storage.getMonthlyBonusesBySalesRep(salesRep.id);
        } else {
          bonuses = [];
        }
      }
      
      res.json(bonuses);
    } catch (error) {
      console.error('Error fetching monthly bonuses:', error);
      res.status(500).json({ message: "Failed to fetch monthly bonuses" });
    }
  });

  // Get milestone bonuses
  app.get("/api/milestone-bonuses", requireAuth, async (req, res) => {
    try {
      const { salesRepId } = req.query;
      
      let bonuses;
      if (salesRepId) {
        bonuses = await storage.getMilestoneBonusesBySalesRep(parseInt(salesRepId as string));
      } else {
        // If no specific sales rep, try to get for current user
        const salesRep = await storage.getSalesRepByUserId(req.user!.id);
        if (salesRep) {
          bonuses = await storage.getMilestoneBonusesBySalesRep(salesRep.id);
        } else {
          bonuses = [];
        }
      }
      
      res.json(bonuses);
    } catch (error) {
      console.error('Error fetching milestone bonuses:', error);
      res.status(500).json({ message: "Failed to fetch milestone bonuses" });
    }
  });

  // Process HubSpot invoices endpoint (for admin button)
  app.post("/api/commissions/process-hubspot", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ message: "Admin access required" });
        return;
      }

      // Calculate current period (14th to 13th cycle)
      const getCurrentPeriod = () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const currentDay = today.getDate();
        
        let periodStartMonth, periodStartYear, periodEndMonth, periodEndYear;
        
        if (currentDay >= 14) {
          periodStartMonth = currentMonth;
          periodStartYear = currentYear;
          periodEndMonth = currentMonth + 1;
          periodEndYear = currentYear;
          
          if (periodEndMonth > 11) {
            periodEndMonth = 0;
            periodEndYear = currentYear + 1;
          }
        } else {
          periodStartMonth = currentMonth - 1;
          periodStartYear = currentYear;
          periodEndMonth = currentMonth;
          periodEndYear = currentYear;
          
          if (periodStartMonth < 0) {
            periodStartMonth = 11;
            periodStartYear = currentYear - 1;
          }
        }
        
        const periodStart = new Date(periodStartYear, periodStartMonth, 14);
        const periodEnd = new Date(periodEndYear, periodEndMonth, 13);
        
        return {
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0]
        };
      };

      const currentPeriod = getCurrentPeriod();
      
      // Import HubSpot service and commission calculator
      const { HubSpotService } = await import('./hubspot.js');
      const { calculateCommissionFromInvoice } = await import('../shared/commission-calculator.js');
      const hubspotService = new HubSpotService();
      
      // Get all paid invoices from HubSpot for the current period (all reps)
      const paidInvoices = await hubspotService.getPaidInvoicesInPeriod(
        currentPeriod.periodStart, 
        currentPeriod.periodEnd
      );

      console.log(`🧾 Admin processing: Found ${paidInvoices.length} total paid invoices for all reps`);

      // Get all sales reps to map invoices to reps
      const allSalesReps = await storage.getAllSalesReps();
      const salesRepMap = new Map(allSalesReps.map(rep => [rep.hubspot_user_id, rep]));

      // Process each invoice and store commission records
      let processedInvoices = 0;
      let totalCommissions = 0;

      for (const invoice of paidInvoices) {
        try {
          // Find the sales rep for this invoice
          const salesRep = salesRepMap.get(invoice.owner_id);
          if (!salesRep) {
            console.log(`⚠️ No sales rep found for HubSpot user ID: ${invoice.owner_id}`);
            continue;
          }

          // Calculate commission for this invoice
          const commissionResult = calculateCommissionFromInvoice(
            invoice.amount,
            invoice.description || invoice.name || 'Invoice payment',
            invoice.date_paid
          );

          // Store commission in database
          const commissionData = {
            sales_rep_id: salesRep.id,
            deal_id: invoice.deal_id || null,
            deal_name: invoice.name || 'Invoice Payment',
            company_name: invoice.company_name || 'Unknown Company',
            service_type: 'bookkeeping', // Default, could be parsed from description
            amount: commissionResult.amount,
            type: commissionResult.type,
            status: 'approved',
            date_earned: invoice.date_paid,
            hubspot_deal_id: invoice.deal_id,
            notes: `Processed from HubSpot invoice: ${invoice.id}`
          };

          await storage.createCommission(commissionData);
          processedInvoices++;
          totalCommissions += commissionResult.amount;
          
          console.log(`✅ Processed invoice ${invoice.id}: $${commissionResult.amount} commission for ${salesRep.name}`);
        } catch (error) {
          console.error(`❌ Error processing invoice ${invoice.id}:`, error);
        }
      }

      res.json({
        success: true,
        processed_invoices: processedInvoices,
        total_invoices: paidInvoices.length,
        total_commissions: totalCommissions,
        period: currentPeriod
      });

    } catch (error) {
      console.error('🚨 Error processing HubSpot commissions:', error);
      res.status(500).json({ 
        message: "Failed to process HubSpot commissions", 
        error: error.message 
      });
    }
  });

  // Admin endpoint: Process all HubSpot commissions and store in database
  app.post("/api/admin/commissions/process-hubspot", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ message: "Admin access required" });
        return;
      }

      // Calculate current period (14th to 13th cycle)
      const getCurrentPeriod = () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const currentDay = today.getDate();
        
        let periodStartMonth, periodStartYear, periodEndMonth, periodEndYear;
        
        if (currentDay >= 14) {
          periodStartMonth = currentMonth;
          periodStartYear = currentYear;
          periodEndMonth = currentMonth + 1;
          periodEndYear = currentYear;
          
          if (periodEndMonth > 11) {
            periodEndMonth = 0;
            periodEndYear = currentYear + 1;
          }
        } else {
          periodStartMonth = currentMonth - 1;
          periodStartYear = currentYear;
          periodEndMonth = currentMonth;
          periodEndYear = currentYear;
          
          if (periodStartMonth < 0) {
            periodStartMonth = 11;
            periodStartYear = currentYear - 1;
          }
        }
        
        const periodStart = new Date(periodStartYear, periodStartMonth, 14);
        const periodEnd = new Date(periodEndYear, periodEndMonth, 13);
        
        return {
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0]
        };
      };

      const currentPeriod = getCurrentPeriod();
      
      // Import HubSpot service and commission calculator
      const { HubSpotService } = await import('./hubspot.js');
      const { calculateCommissionFromInvoice } = await import('../shared/commission-calculator.js');
      const hubspotService = new HubSpotService();
      
      // Get all paid invoices from HubSpot for the current period (all reps)
      const paidInvoices = await hubspotService.getPaidInvoicesInPeriod(
        currentPeriod.periodStart, 
        currentPeriod.periodEnd
      );

      console.log(`🧾 Admin processing: Found ${paidInvoices.length} total paid invoices for all reps`);

      // Get all sales reps to map invoices to reps
      const allSalesReps = await storage.getAllSalesReps();
      const salesRepMap = new Map(allSalesReps.map(rep => [rep.hubspot_user_id, rep]));

      // Process each invoice and store commission records
      const processedCommissions = [];
      let totalProcessed = 0;

      for (const invoice of paidInvoices) {
        // Find the sales rep for this invoice
        const salesRep = salesRepMap.get(invoice.hubspot_owner_id);
        if (!salesRep) {
          console.log(`⚠️ No sales rep found for HubSpot owner ID: ${invoice.hubspot_owner_id}`);
          continue;
        }

        // Calculate commission for each line item
        for (const lineItem of invoice.line_items || []) {
          const commission = calculateCommissionFromInvoice(lineItem, invoice.total_amount);
          
          if (commission.amount > 0) {
            // Store commission in database
            const commissionRecord = {
              salesRepId: salesRep.id,
              dealId: invoice.deal_id || `invoice-${invoice.id}`,
              dealName: lineItem.description || `Invoice ${invoice.number}`,
              companyName: invoice.client_name,
              amount: commission.amount,
              type: commission.type,
              status: 'earned' as const,
              dateEarned: invoice.payment_date,
              periodStart: currentPeriod.periodStart,
              periodEnd: currentPeriod.periodEnd,
              hubspotInvoiceId: invoice.id
            };

            const storedCommission = await storage.createCommission(commissionRecord);
            processedCommissions.push(storedCommission);
            totalProcessed++;
          }
        }
      }

      console.log(`✅ Admin processing complete: ${totalProcessed} commission records stored`);

      res.json({
        success: true,
        period: currentPeriod,
        invoices_processed: paidInvoices.length,
        commissions_created: totalProcessed,
        total_commission_amount: processedCommissions.reduce((sum, c) => sum + c.amount, 0),
        processed_commissions: processedCommissions
      });

    } catch (error) {
      console.error('🚨 Error processing HubSpot commissions:', error);
      res.status(500).json({ 
        message: "Failed to process HubSpot commissions", 
        error: error.message 
      });
    }
  });

  // Get current period commission summary for individual rep (reads from stored data)
  app.get("/api/commissions/current-period-summary", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      // Get the current user's sales rep profile
      const salesRep = await storage.getSalesRepByUserId(req.user.id);
      if (!salesRep) {
        res.status(404).json({ message: "Sales rep profile not found" });
        return;
      }

      // Calculate current period (14th to 13th cycle)
      const getCurrentPeriod = () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const currentDay = today.getDate();
        
        let periodStartMonth, periodStartYear, periodEndMonth, periodEndYear;
        
        if (currentDay >= 14) {
          periodStartMonth = currentMonth;
          periodStartYear = currentYear;
          periodEndMonth = currentMonth + 1;
          periodEndYear = currentYear;
          
          if (periodEndMonth > 11) {
            periodEndMonth = 0;
            periodEndYear = currentYear + 1;
          }
        } else {
          periodStartMonth = currentMonth - 1;
          periodStartYear = currentYear;
          periodEndMonth = currentMonth;
          periodEndYear = currentYear;
          
          if (periodStartMonth < 0) {
            periodStartMonth = 11;
            periodStartYear = currentYear - 1;
          }
        }
        
        const periodStart = new Date(periodStartYear, periodStartMonth, 14);
        const periodEnd = new Date(periodEndYear, periodEndMonth, 13);
        
        return {
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0]
        };
      };

      const currentPeriod = getCurrentPeriod();

      // Get stored commissions for this rep in the current period
      const storedCommissions = await storage.getCommissionsBySalesRep(salesRep.id);
      const currentPeriodCommissions = storedCommissions.filter(comm => 
        comm.dateEarned >= currentPeriod.periodStart && 
        comm.dateEarned <= currentPeriod.periodEnd
      );

      // Calculate summary metrics
      const totalCommissions = currentPeriodCommissions.reduce((sum, comm) => sum + comm.amount, 0);
      const setupCommissions = currentPeriodCommissions
        .filter(comm => comm.type === 'setup')
        .reduce((sum, comm) => sum + comm.amount, 0);
      const monthlyCommissions = currentPeriodCommissions
        .filter(comm => comm.type === 'monthly')
        .reduce((sum, comm) => sum + comm.amount, 0);

      const result = {
        period_start: currentPeriod.periodStart,
        period_end: currentPeriod.periodEnd,
        total_commissions: totalCommissions,
        setup_commissions: setupCommissions,
        monthly_commissions: monthlyCommissions,
        invoice_count: currentPeriodCommissions.length,
        subscription_count: 0, // TODO: Get from HubSpot subscriptions
        last_processed: new Date().toISOString(),
        data_source: 'stored_commissions'
      };

      res.json(result);
    } catch (error) {
      console.error('🚨 Error fetching current period commission summary:', error);
      res.status(500).json({ 
        message: "Failed to fetch commission summary", 
        error: error.message 
      });
    }
  });

  // Get HubSpot-based commissions for current period (for individual rep dashboard)
  app.get("/api/commissions/hubspot/current-period", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      // Get the current user's sales rep profile
      const salesRep = await storage.getSalesRepByUserId(req.user.id);
      if (!salesRep) {
        res.status(404).json({ message: "Sales rep profile not found" });
        return;
      }

      // Calculate current period (14th to 13th cycle)
      const getCurrentPeriod = () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const currentDay = today.getDate();
        
        let periodStartMonth, periodStartYear, periodEndMonth, periodEndYear;
        
        if (currentDay >= 14) {
          // We're in the current period (14th of this month to 13th of next month)
          periodStartMonth = currentMonth;
          periodStartYear = currentYear;
          periodEndMonth = currentMonth + 1;
          periodEndYear = currentYear;
          
          // Handle year rollover
          if (periodEndMonth > 11) {
            periodEndMonth = 0;
            periodEndYear = currentYear + 1;
          }
        } else {
          // We're in the previous period (14th of last month to 13th of this month)  
          periodStartMonth = currentMonth - 1;
          periodStartYear = currentYear;
          periodEndMonth = currentMonth;
          periodEndYear = currentYear;
          
          // Handle year rollover
          if (periodStartMonth < 0) {
            periodStartMonth = 11;
            periodStartYear = currentYear - 1;
          }
        }
        
        const periodStart = new Date(periodStartYear, periodStartMonth, 14);
        const periodEnd = new Date(periodEndYear, periodEndMonth, 13);
        
        return {
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0]
        };
      };

      const currentPeriod = getCurrentPeriod();
      
      // Import HubSpot service
      const { HubSpotService } = await import('./hubspot.js');
      const hubspotService = new HubSpotService();
      
      // Get paid invoices from HubSpot for the current period
      // Filter by sales rep and date range
      const paidInvoices = await hubspotService.getPaidInvoicesInPeriod(
        currentPeriod.periodStart, 
        currentPeriod.periodEnd,
        salesRep.hubspot_user_id
      );

      console.log(`🧾 Found ${paidInvoices.length} paid invoices for commission calculation`);

      // Calculate commissions based on invoice line items
      let totalCommissions = 0;
      const commissionBreakdown = [];
      
      for (const invoice of paidInvoices) {
        const lineItems = await hubspotService.getInvoiceLineItems(invoice.id);
        console.log(`📋 Processing ${lineItems.length} line items for invoice ${invoice.properties?.hs_invoice_number}`);
        
        for (const lineItem of lineItems) {
          const itemName = (lineItem.properties?.name || '').toLowerCase();
          const itemDescription = (lineItem.properties?.description || '').toLowerCase();
          const itemAmount = parseFloat(lineItem.properties?.amount || '0');
          
          // Apply commission calculations based on service type:
          // - Setup/Prior Years/Clean up = 20%  
          // - 40% of MRR month 1
          // - 10% months 2-12 (residual)
          
          let commission = 0;
          let commissionType = '';
          let serviceType = 'recurring'; // default
          
          // Determine service type from line item name/description
          if (itemName.includes('setup') || itemName.includes('implementation') || itemDescription.includes('setup')) {
            serviceType = 'setup';
            commission = itemAmount * 0.20;
            commissionType = 'setup_commission';
          } else if (itemName.includes('cleanup') || itemName.includes('clean up') || itemDescription.includes('cleanup')) {
            serviceType = 'cleanup';
            commission = itemAmount * 0.20;
            commissionType = 'cleanup_commission';
          } else if (itemName.includes('prior year') || itemName.includes('catch up') || itemDescription.includes('prior year')) {
            serviceType = 'prior_years';
            commission = itemAmount * 0.20;
            commissionType = 'prior_years_commission';
          } else if (lineItem.properties?.hs_recurring_billing_period) {
            // This is a recurring item - check if it's month 1 or residual
            serviceType = 'recurring';
            // For now, assume first payment is month 1 (40%), could enhance this logic
            commission = itemAmount * 0.40;
            commissionType = 'month_1_commission';
          } else {
            // Default to month 1 recurring for unidentified items
            serviceType = 'recurring';
            commission = itemAmount * 0.40;
            commissionType = 'month_1_commission';
          }
          
          totalCommissions += commission;
          commissionBreakdown.push({
            invoice_id: invoice.id,
            invoice_number: invoice.properties?.hs_invoice_number,
            line_item_name: lineItem.properties?.name,
            line_item_amount: itemAmount,
            service_type: serviceType,
            commission_amount: commission,
            commission_type: commissionType,
            paid_date: invoice.properties?.hs_invoice_paid_date
          });
        }
      }

      // Also fetch subscription payments for residual commissions (months 2-12)
      const activeSubscriptions = await hubspotService.getActiveSubscriptions(salesRep.hubspot_user_id);
      console.log(`🔄 Found ${activeSubscriptions.length} active subscriptions for residual commission calculation`);
      
      for (const subscription of activeSubscriptions) {
        const payments = await hubspotService.getSubscriptionPaymentsInPeriod(
          subscription.id,
          currentPeriod.periodStart,
          currentPeriod.periodEnd
        );
        
        for (const payment of payments) {
          const paymentAmount = parseFloat(payment.properties?.hs_invoice_total_amount || '0');
          // 10% commission for months 2-12
          const commission = paymentAmount * 0.10;
          
          totalCommissions += commission;
          commissionBreakdown.push({
            subscription_id: subscription.id,
            invoice_number: payment.properties?.hs_invoice_number,
            line_item_name: 'Subscription Payment (Month 2-12)',
            line_item_amount: paymentAmount,
            service_type: 'recurring_residual',
            commission_amount: commission,
            commission_type: 'residual_commission',
            paid_date: payment.properties?.hs_invoice_paid_date
          });
        }
      }

      res.json({
        period_start: currentPeriod.periodStart,
        period_end: currentPeriod.periodEnd,
        sales_rep: {
          id: salesRep.id,
          name: `${salesRep.first_name} ${salesRep.last_name}`,
          email: salesRep.email
        },
        total_commissions: totalCommissions,
        invoice_count: paidInvoices.length,
        subscription_count: activeSubscriptions.length,
        deal_count: paidInvoices.length + activeSubscriptions.length, // For backward compatibility
        commission_breakdown: commissionBreakdown,
        data_source: 'hubspot_invoices_live'
      });
    } catch (error) {
      console.error('Error fetching HubSpot commission data:', error);
      res.status(500).json({ message: "Failed to fetch commission data from HubSpot" });
    }
  });

  // Update commission status
  app.patch("/api/commissions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      if (isNaN(id)) {
        res.status(400).json({ message: "Invalid commission ID" });
        return;
      }
      
      const updatedCommission = await storage.updateCommission(id, updateData);
      res.json(updatedCommission);
    } catch (error) {
      console.error('Error updating commission:', error);
      res.status(500).json({ message: "Failed to update commission" });
    }
  });

  // Register admin routes
  await registerAdminRoutes(app);

  // Register health check routes for service monitoring
  const { healthRoutes } = await import('./routes/health.js');
  app.use('/api', healthRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
