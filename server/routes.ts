import type { Express } from "express";
import { createServer, type Server } from "http";
import type Redis from "ioredis";
import { storage } from "./storage";
import { 
  insertQuoteSchema, updateQuoteSchema, updateProfileSchema,
  insertKbCategorySchema, insertKbArticleSchema, insertKbBookmarkSchema, insertKbSearchHistorySchema
} from "@shared/schema";
import { z } from "zod";
import { sendSystemAlert } from "./slack";
import { hubSpotService } from "./hubspot";
import { setupAuth, requireAuth } from "./auth";
import { registerAdminRoutes } from "./admin-routes";
import { calculateCombinedFees } from "@shared/pricing";
import { clientIntelEngine } from "./client-intel";
import { apiRateLimit, searchRateLimit, enhancementRateLimit } from "./middleware/rate-limiter";
import { conditionalCsrf, provideCsrfToken } from "./middleware/csrf";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import express from "express";
import { cache, CacheTTL, CachePrefix } from "./cache";

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

export async function registerRoutes(app: Express, sessionRedis?: Redis | null): Promise<Server> {
  console.log('[Routes] ============= REGISTERROUTES CALLED =============');
  console.log('[Routes] Function entry point reached');
  console.log('[Routes] sessionRedis parameter:', !!sessionRedis);
  console.log('[Routes] REDIS_URL available:', !!process.env.REDIS_URL);
  console.log('[Routes] 🚀 Starting direct session setup...');
  
  // Apply Redis sessions directly here before any routes
  console.log('[Routes] Setting up Redis sessions directly...');
  let sessionStore: any;
  let storeType: string;
  
  if (process.env.REDIS_URL) {
    try {
      console.log('[Routes] Creating Redis connection...');
      const Redis = (await import('ioredis')).default;
      const RedisStore = (await import('connect-redis')).default;
      const session = (await import('express-session')).default;
      
      const redisClient = new Redis(process.env.REDIS_URL);
      await redisClient.ping();
      console.log('[Routes] ✅ Redis ping successful');
      
      sessionStore = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 24 * 60 * 60, // 24 hours
      });
      storeType = 'RedisStore';
      console.log('[Routes] ✅ Redis session store created:', sessionStore.constructor.name);
      
      // Apply session middleware directly
      app.use(session({
        secret: process.env.SESSION_SECRET || 'dev-only-seed-financial-secret',
        resave: false,
        saveUninitialized: false,
        rolling: true, // Extend session on each request
        store: sessionStore,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        }
      }));
      
      console.log('[Routes] ✅ Session middleware applied with RedisStore');
      
    } catch (error) {
      console.warn('[Routes] ❌ Redis failed, falling back to memory store:', error.message);
      // Fall back to memory store when Redis fails
      const session = (await import('express-session')).default;
      const memorystore = await import('memorystore');
      const MemoryStore = memorystore.default(session);
      
      sessionStore = new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      });
      storeType = 'MemoryStore (Redis fallback)';
      
      app.use(session({
        secret: process.env.SESSION_SECRET || 'dev-only-seed-financial-secret',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        store: sessionStore,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        }
      }));
      
      console.log('[Routes] ✅ Memory session fallback applied');
    }
  } else {
    console.log('[Routes] No REDIS_URL, using memory sessions');
    // Use memory store when no Redis URL is provided
    const session = (await import('express-session')).default;
    const memorystore = await import('memorystore');
    const MemoryStore = memorystore.default(session);
    
    sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    storeType = 'MemoryStore (no Redis)';
    
    app.use(session({
      secret: process.env.SESSION_SECRET || 'dev-only-seed-financial-secret',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      }
    }));
    
    console.log('[Routes] ✅ Memory session middleware applied');
  }
  
  console.log('[Routes] Final session store type:', storeType);
  
  // Setup authentication after sessions
  await setupAuth(app, null);
  console.log('[Routes] ✅ Auth setup completed');

  // Apply CSRF protection after sessions are initialized
  app.use(conditionalCsrf);
  app.use(provideCsrfToken);

  // Apply rate limiting to all API routes
  app.use('/api', apiRateLimit);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // CSRF token endpoint for SPAs
  app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken ? req.csrfToken() : null });
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

  // Apply Redis session configuration directly
  app.get("/api/admin/apply-redis-sessions", async (req, res) => {
    console.log('[ApplyRedis] Applying Redis session configuration...');
    
    if (!process.env.REDIS_URL) {
      return res.json({ error: 'REDIS_URL not configured' });
    }
    
    try {
      const Redis = (await import('ioredis')).default;
      const RedisStore = (await import('connect-redis')).default;
      const session = (await import('express-session')).default;
      
      // Create Redis client
      const redisClient = new Redis(process.env.REDIS_URL);
      await redisClient.ping();
      console.log('[ApplyRedis] ✅ Redis connection successful');
      
      // Create RedisStore
      const redisStore = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 24 * 60 * 60, // 24 hours
      });
      
      console.log('[ApplyRedis] ✅ RedisStore created:', redisStore.constructor.name);
      
      // Apply session middleware with Redis store
      app.use(session({
        secret: process.env.SESSION_SECRET || 'dev-only-seed-financial-secret',
        resave: false,
        saveUninitialized: false,
        store: redisStore,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
      }));
      
      console.log('[ApplyRedis] ✅ Redis session middleware applied');
      
      res.json({
        status: 'success',
        message: 'Redis sessions applied successfully',
        storeType: redisStore.constructor.name,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[ApplyRedis] Error:', error);
      res.json({ error: error.message });
    }
  });

  // Test Redis sessions directly
  app.get("/api/test/redis-session", async (req, res) => {
    try {
      console.log('[TestRedis] Testing direct Redis session...');
      
      if (!process.env.REDIS_URL) {
        return res.json({ error: 'REDIS_URL not set' });
      }
      
      const Redis = (await import('ioredis')).default;
      const RedisStore = (await import('connect-redis')).default;
      
      // Create a Redis connection
      const redisClient = new Redis(process.env.REDIS_URL);
      await redisClient.ping();
      console.log('[TestRedis] Redis ping successful');
      
      // Create a Redis session store
      const store = new RedisStore({
        client: redisClient,
        prefix: 'sess:',  // Use production prefix
        ttl: 24 * 60 * 60, // 24 hours like production
      });
      
      console.log('[TestRedis] RedisStore created:', store.constructor.name);
      
      // ALSO APPLY REDIS SESSION MIDDLEWARE DIRECTLY
      console.log('[TestRedis] Applying Redis session middleware to Express app...');
      const session = (await import('express-session')).default;
      
      app.use(session({
        secret: process.env.SESSION_SECRET || 'dev-only-seed-financial-secret',
        resave: false,
        saveUninitialized: false,
        store: store,  // Use the RedisStore we just created
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
      }));
      
      console.log('[TestRedis] ✅ Redis session middleware applied to Express!');
      
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
      
      await redisClient.quit();
      
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
    
    // Check if we can create Redis sessions manually
    let manualRedisTest = 'Not tested';
    if (process.env.REDIS_URL) {
      try {
        console.log('[SessionDiag] Testing manual Redis session creation...');
        const Redis = (await import('ioredis')).default;
        const RedisStore = (await import('connect-redis')).default;
        
        const testRedis = new Redis(process.env.REDIS_URL);
        await testRedis.ping();
        
        const testStore = new RedisStore({
          client: testRedis,
          prefix: 'test:diagnostic:',
          ttl: 300, // 5 minutes
        });
        
        manualRedisTest = `SUCCESS: ${testStore.constructor.name}`;
        console.log('[SessionDiag] Manual Redis store creation successful:', testStore.constructor.name);
        
        await testRedis.quit();
      } catch (error) {
        manualRedisTest = `FAILED: ${error.message}`;
        console.log('[SessionDiag] Manual Redis store creation failed:', error.message);
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

  // Google OAuth user sync endpoint
  app.post("/api/auth/google/sync", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Authorization header required" });
      }

      const token = authHeader.split(' ')[1];
      const { googleId, email, name, picture, hd } = req.body;
      
      if (!googleId || !email) {
        return res.status(400).json({ message: "Google ID and email are required" });
      }

      // Validate hosted domain
      if (hd !== 'seedfinancial.io') {
        return res.status(403).json({ message: "Only @seedfinancial.io accounts are allowed" });
      }

      // Check if user exists by Google ID or email
      let user = await storage.getUserByGoogleId(googleId) || await storage.getUserByEmail(email);

      if (!user) {
        // No automatic user creation - user must be manually added by admin first
        return res.status(403).json({ 
          message: "ACCESS_NOT_GRANTED",
          email: email,
          needsApproval: true 
        });
      } else if (!user.googleId && user.email === email) {
        // Update existing user to link Google account
        await storage.updateUserGoogleId(user.id, googleId, 'google', picture);
        user = await storage.getUser(user.id);
      }
      
      // Ensure user object is valid
      if (!user || !user.id) {
        console.error('Invalid user object after retrieval:', user);
        return res.status(500).json({ message: "Invalid user data" });
      }

      // Ensure jon@seedfinancial.io always has admin role (hardcoded protection)
      if (user && user.email === 'jon@seedfinancial.io' && user.role !== 'admin') {
        console.log(`Updating jon@seedfinancial.io role from ${user.role} to admin in Google sync`);
        user = await storage.updateUserRole(user.id, 'admin', user.id);
      }

      // Log user into session for subsequent API requests
      if (!user) {
        return res.status(500).json({ message: "User creation failed" });
      }
      
      // Simplified session establishment - avoid complex regeneration that can fail with Redis
      req.login(user, (err: any) => {
        if (err) {
          console.error('Session login failed:', err);
          return res.status(500).json({ message: "Failed to establish session" });
        }
        
        // Return user data (excluding password)
        const { password, ...safeUser } = user!;
        res.json(safeUser);
      });
    } catch (error) {
      console.error('Error syncing Google user:', error);
      res.status(500).json({ message: "Failed to sync user" });
    }
  });

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

  // Google logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      // For now, just acknowledge the logout
      // In production, you might want to invalidate tokens on your end
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Create a new quote (protected)
  app.post("/api/quotes", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Extract service flags with defaults
      const includesBookkeeping = req.body.includesBookkeeping !== false; // Default to true
      const includesTaas = req.body.includesTaas === true;
      
      // Trust the frontend calculations - the frontend has the authoritative calculation logic
      // The frontend already calculated and sent the correct fees, so we should use them
      const requestDataWithFees = {
        ...req.body,
        ownerId: req.user.id,
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
      
      const quoteData = insertQuoteSchema.parse(requestDataWithFees);
      const quote = await storage.createQuote(quoteData);
      
      // Note: Slack notifications now only sent during approval request, not quote creation
      
      res.json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create quote" });
      }
    }
  });

  // Get all quotes with optional search and sort (protected)
  app.get("/api/quotes", requireAuth, async (req, res) => {
    try {
      const email = req.query.email as string;
      const search = req.query.search as string;
      const sortField = req.query.sortField as string;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';
      
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (email) {
        // Get quotes by specific email (filtered by owner)
        const quotes = await storage.getQuotesByEmail(email);
        // Filter by owner
        const userQuotes = quotes.filter(quote => quote.ownerId === req.user!.id);
        res.json(userQuotes);
      } else {
        // Get all quotes for the authenticated user
        const quotes = await storage.getAllQuotes(req.user.id, search, sortField, sortOrder);
        res.json(quotes);
      }
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
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
  app.post("/api/quotes/check-existing", async (req, res) => {
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
  app.post("/api/hubspot/verify-contact", async (req, res) => {
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

  // Push quote to HubSpot (create deal and quote)
  app.post("/api/hubspot/push-quote", async (req, res) => {
    try {
      const { quoteId } = req.body;
      
      if (!quoteId) {
        res.status(400).json({ message: "Quote ID is required" });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      if (!hubSpotService) {
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

      // Create deal in HubSpot
      const deal = await hubSpotService.createDeal(
        contact.id,
        companyName,
        parseFloat(quote.monthlyFee),
        parseFloat(quote.setupFee),
        ownerId || undefined,
        quote.includesBookkeeping,
        quote.includesTaas
      );

      if (!deal) {
        res.status(500).json({ message: "Failed to create deal in HubSpot" });
        return;
      }

      // For combined quotes, calculate individual service fees for separate line items
      // For single service quotes, use the saved quote values to preserve custom overrides
      let bookkeepingMonthlyFee = parseFloat(quote.monthlyFee);
      let bookkeepingSetupFee = parseFloat(quote.setupFee);
      
      if (quote.includesBookkeeping && quote.includesTaas) {
        // Combined quote - need to separate fees
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
      }
      // For single service quotes, keep the saved values to preserve custom setup fees
      
      // Create quote/note in HubSpot
      const hubspotQuote = await hubSpotService.createQuote(
        deal.id,
        companyName,
        parseFloat(quote.monthlyFee),
        parseFloat(quote.setupFee),
        req.user!.email,
        req.user!.firstName || '',
        req.user!.lastName || '',
        quote.includesBookkeeping,
        quote.includesTaas,
        quote.taasMonthlyFee ? parseFloat(quote.taasMonthlyFee) : undefined,
        quote.taasPriorYearsFee ? parseFloat(quote.taasPriorYearsFee) : undefined,
        bookkeepingMonthlyFee,
        bookkeepingSetupFee
      );

      if (!hubspotQuote) {
        res.status(500).json({ message: "Failed to create quote in HubSpot" });
        return;
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
    } catch (error) {
      console.error('Error pushing to HubSpot:', error);
      res.status(500).json({ message: "Failed to push quote to HubSpot" });
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
      }

      // Use the form data fees directly instead of recalculating
      const updateTaasMonthlyFee = taasMonthlyFee;
      const updateTaasPriorYearsFee = taasPriorYearsFee;
      
      const updateBookkeepingMonthlyFee = monthlyFee - updateTaasMonthlyFee;
      const updateBookkeepingSetupFee = setupFee - updateTaasPriorYearsFee;
      
      console.log(`Calculated individual service fees - Bookkeeping Monthly: $${updateBookkeepingMonthlyFee}, Bookkeeping Setup: $${updateBookkeepingSetupFee}, TaaS Monthly: $${updateTaasMonthlyFee}, TaaS Setup: $${updateTaasPriorYearsFee}`);

      // Update quote in HubSpot with current service configuration
      const currentIncludesBookkeeping = currentFormData?.includesBookkeeping !== false;
      const currentIncludesTaas = currentFormData?.includesTaas === true;
      
      const success = await hubSpotService.updateQuote(
        quote.hubspotQuoteId,
        companyName,
        monthlyFee,
        setupFee,
        currentIncludesBookkeeping,
        currentIncludesTaas,
        updateTaasMonthlyFee,
        updateTaasPriorYearsFee,
        updateBookkeepingMonthlyFee,
        updateBookkeepingSetupFee,
        quote.hubspotDealId || undefined // Pass deal ID for updating deal name and value
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
      
      // Log individual charges for year to date to see what we're getting
      console.log('=== YTD CHARGES SAMPLE ===');
      yearToDateCharges.data.slice(0, 5).forEach((charge: any) => {
        console.log(`Charge ${charge.id}: $${charge.amount/100}, status: ${charge.status}, live: ${charge.livemode}, date: ${new Date(charge.created * 1000).toISOString()}`);
      });
      console.log('=== END DEBUG ===');

      // Calculate totals from successful live mode charges only
      const calculateRevenue = (charges: any) => {
        return charges.data
          .filter((charge: any) => charge.status === 'succeeded' && charge.livemode === true)
          .reduce((sum: number, charge: any) => sum + charge.amount, 0) / 100; // Convert from cents
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

  // Register admin routes
  await registerAdminRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
