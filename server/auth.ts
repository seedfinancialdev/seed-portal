import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { HubSpotService } from "./hubspot";
import type Redis from "ioredis";
import RedisStore from "connect-redis";
import MemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express, sessionRedis?: Redis | null) {
  // Auth setup simplified with centralized session handling
  // Initialize HubSpot service for user verification
  let hubSpotService: HubSpotService | null = null;
  try {
    hubSpotService = new HubSpotService();
  } catch (error) {
    console.warn('HubSpot service not available for user verification:', error);
  }

  // Require SESSION_SECRET in production
  if (!process.env.SESSION_SECRET) {
    console.error('CRITICAL: SESSION_SECRET environment variable is not set!');
    console.error('Generate a secure secret with: openssl rand -base64 32');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET is required in production');
    }
    // Development warning but allow to continue
    console.warn('Using insecure default session secret - DO NOT USE IN PRODUCTION');
  }

  // Session setup is centralized, now configuring passport strategies

  // Session middleware is applied centrally at startup
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' }, // Use email as username field
      async (email, password, done) => {
        try {
          let user = await storage.getUserByEmail(email);
          
          // If user doesn't exist, create them automatically for verified @seedfinancial.io emails
          if (!user) {
                  // Validate email domain
            if (!email.endsWith('@seedfinancial.io')) {
              return done(null, false);
            }

            // Verify user exists in HubSpot
            if (hubSpotService) {
              try {
                const hubSpotUserExists = await hubSpotService.verifyUserByEmail(email);
                if (!hubSpotUserExists) {
                  console.log(`Email ${email} not found in HubSpot - access denied`);
                  return done(null, false);
                }
                console.log(`Email ${email} verified in HubSpot`);
              } catch (error) {
                console.error(`HubSpot verification failed for ${email}:`, error);
                return done(null, false);
              }
            } else {
              console.log(`Warning: HubSpot verification not available, denying access for ${email}`);
              return done(null, false);
            }

            // Create user automatically with default password and role assignment
            console.log(`Creating new user for ${email} with default password`);
            
            // Create user with default service role (admin must manually assign roles)
            let role = 'service'; // Default role for all new users
            // Hardcode jon@seedfinancial.io as permanent admin to bootstrap the system
            if (email === 'jon@seedfinancial.io') {
              role = 'admin';
            }
            
            try {
              user = await storage.createUser({
                email,
                password: await hashPassword('SeedAdmin1!'), // Default password
                firstName: '',
                lastName: '',
                hubspotUserId: null,
                role,
              });
              console.log(`Successfully created user with ID: ${user.id}`);
            } catch (createError: any) {
              // Handle race condition - if another request created the user first
              if (createError.code === '23505' || createError.message?.includes('unique constraint')) {
                console.log(`User creation race condition detected for ${email}, fetching existing user`);
                user = await storage.getUserByEmail(email);
                if (!user) {
                  console.error(`Failed to fetch user after race condition for ${email}`);
                  return done(null, false);
                }
              } else {
                console.error(`Failed to create user for ${email}:`, createError);
                return done(createError);
              }
            }
          } else {
            // Ensure jon@seedfinancial.io always has admin role (hardcoded protection)
            if (user.email === 'jon@seedfinancial.io' && user.role !== 'admin') {
              console.log(`Updating jon@seedfinancial.io role from ${user.role} to admin`);
              user = await storage.updateUserRole(user.id, 'admin', user.id);
            }
            
            // For existing users, also verify they still exist in HubSpot
            if (hubSpotService) {
              try {
                const hubSpotUserExists = await hubSpotService.verifyUserByEmail(email);
                if (!hubSpotUserExists) {
                  console.log(`Existing user ${email} no longer found in HubSpot - access denied`);
                  return done(null, false);
                }
              } catch (error) {
                console.error(`HubSpot verification failed for existing user ${email}:`, error);
                return done(null, false);
              }
            } else {
              console.log(`Warning: HubSpot verification not available, denying access for existing user ${email}`);
              return done(null, false);
            }
          }
          
          // Check password
          if (!user.password || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          }
          
          return done(null, user);
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Validate email domain
      if (!email.endsWith('@seedfinancial.io')) {
        return res.status(400).json({ 
          message: "Only @seedfinancial.io email addresses are allowed" 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Verify user exists in HubSpot
      if (!hubSpotService) {
        return res.status(500).json({ message: "HubSpot service not available" });
      }
      
      const hubspotVerification = await hubSpotService.verifyUser(email);
      if (!hubspotVerification.exists) {
        return res.status(400).json({ 
          message: "Email not found in HubSpot. Please contact your administrator." 
        });
      }

      // Create user with HubSpot data
      const user = await storage.createUser({
        email,
        password: await hashPassword(password || 'SeedAdmin1!'), // Use provided password or default
        firstName: hubspotVerification.userData?.firstName || '',
        lastName: hubspotVerification.userData?.lastName || '',
        hubspotUserId: hubspotVerification.userData?.hubspotUserId || null,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log('🚪 Session logout endpoint called');
    console.log('🚪 Session ID before logout:', req.sessionID);
    console.log('🚪 User before logout:', req.user ? req.user.email : 'None');
    
    req.logout((err) => {
      if (err) {
        console.error('❌ Session logout error:', err);
        return next(err);
      }
      
      console.log('✅ Session logout successful');
      console.log('🚪 Session destroyed, user logged out');
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('🔐 /api/user endpoint called');
    console.log('🔐 Session ID:', req.sessionID);
    console.log('🔐 Session exists:', !!req.session);
    console.log('🔐 Session store type:', req.sessionStore?.constructor?.name || 'Unknown');
    console.log('🔐 Session data keys:', Object.keys(req.session || {}));
    console.log('🔐 Authenticated:', req.isAuthenticated ? req.isAuthenticated() : 'Unknown');
    console.log('🔐 User:', req.user ? req.user.email : 'None');
    console.log('🔐 Session passport:', req.session?.passport || 'None');
    
    if (!req.isAuthenticated()) {
      console.log('❌ User not authenticated, returning 401');
      return res.sendStatus(401);
    }
    
    console.log('✅ User authenticated, returning user data');
    res.json({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      profilePhoto: req.user.profilePhoto,
      phoneNumber: req.user.phoneNumber,
      address: req.user.address,
      city: req.user.city,
      state: req.user.state,
      zipCode: req.user.zipCode,
      country: req.user.country,
      latitude: req.user.latitude,
      longitude: req.user.longitude,
      lastWeatherUpdate: req.user.lastWeatherUpdate,
      lastHubspotSync: req.user.lastHubspotSync
    });
  });

  // Google OAuth Session-Based Authentication Endpoints
  app.post("/api/auth/google/sync", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Bearer token required" });
      }

      const token = authHeader.split(' ')[1];
      const { email, googleId, name, picture, hd } = req.body;
      

      
      // Verify the token with Google
      let response;
      try {
        response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout for production
        });
        
        if (!response.ok) {
          console.error('Google token verification failed:', response.status, response.statusText);
          return res.status(401).json({ message: "Invalid Google token" });
        }
      } catch (error: any) {
        console.error('Google token verification error:', error.message);
        return res.status(401).json({ message: "Token verification failed" });
      }

      const userInfo = await response.json();
      
      // Check domain restriction
      if (userInfo.hd !== 'seedfinancial.io') {
        return res.status(403).json({ 
          message: "Access restricted to @seedfinancial.io domain" 
        });
      }

      // Get or create user in database
      let user = await storage.getUserByEmail(userInfo.email);
      
      if (!user) {
        // Create new user if doesn't exist
        try {
          user = await storage.createUser({
            email: userInfo.email,
            password: await hashPassword('oauth-google-' + Date.now()), // Random password for OAuth users
            firstName: userInfo.given_name || '',
            lastName: userInfo.family_name || '',
            profilePhoto: userInfo.picture || null,
            googleId: userInfo.sub,
          });
        } catch (error) {
          console.error('Failed to create user:', error);
          return res.status(500).json({ message: "Failed to create user account" });
        }
      } else {
        // Update existing user with Google info
        
        // Update Google ID if needed
        if (userInfo.sub && userInfo.sub !== user.googleId) {
          await storage.updateUserGoogleId(user.id, userInfo.sub, 'google', userInfo.picture || null);
        }
        
        // Update profile information
        const profileUpdates: any = {};
        if (userInfo.given_name && userInfo.given_name !== user.firstName) {
          profileUpdates.firstName = userInfo.given_name;
        }
        if (userInfo.family_name && userInfo.family_name !== user.lastName) {
          profileUpdates.lastName = userInfo.family_name;
        }
        if (userInfo.picture && userInfo.picture !== user.profilePhoto) {
          profileUpdates.profilePhoto = userInfo.picture;
        }
        
        if (Object.keys(profileUpdates).length > 0) {
          await storage.updateUserProfile(user.id, profileUpdates);
        }
      }

      // Create session by logging in the user
      
      req.login(user, (err) => {
        if (err) {
          console.error('Session creation failed:', err);
          return res.status(500).json({ message: "Session creation failed" });
        }
        
        // Force session save to ensure persistence
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save failed:', saveErr);
          }
          
          // Respond with user data
          res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            profilePhoto: user.profilePhoto,
            sessionCreated: true,
            sessionId: req.sessionID,
            sessionSaved: !saveErr
          });
        });
      });

    } catch (error) {
      console.error('❌ Google OAuth sync error:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({ message: "Authentication failed", error: error.message });
    }
  });



  // Test endpoint for HubSpot verification
  app.post("/api/test-hubspot", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      if (!hubSpotService) {
        return res.status(500).json({ message: "HubSpot service not available" });
      }
      
      const result = await hubSpotService.verifyUser(email);
      res.json(result);
    } catch (error: any) {
      console.error('HubSpot test error:', error);
      res.status(500).json({ message: "HubSpot test failed", error: error.message });
    }
  });
}

// Middleware to require authentication (session-based only)
export async function requireAuth(req: any, res: any, next: any) {
  console.log('requireAuth: Checking authentication for', req.url);
  console.log('requireAuth: Session authenticated:', req.isAuthenticated());
  console.log('requireAuth: Auth header present:', !!req.headers.authorization);
  
  // Check session-based auth only
  if (req.isAuthenticated()) {
    console.log('requireAuth: Session auth successful for', req.user?.email);
    return next();
  }
  
  console.log('requireAuth: Authentication failed - no valid session');
  return res.status(401).json({ message: "Authentication required" });
}