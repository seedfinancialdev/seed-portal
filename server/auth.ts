import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { HubSpotService } from "./hubspot";

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

export function setupAuth(app: Express) {
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

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-only-seed-financial-secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      sameSite: 'strict', // CSRF protection
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
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
            console.log(`User not found for email: ${email}, attempting auto-registration...`);
            
            // Validate email domain
            if (!email.endsWith('@seedfinancial.io')) {
              console.log(`Invalid email domain for: ${email}`);
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
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
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

// Middleware to require authentication (supports both session and Google OAuth)
export async function requireAuth(req: any, res: any, next: any) {
  console.log('requireAuth: Checking authentication for', req.url);
  console.log('requireAuth: Session authenticated:', req.isAuthenticated());
  console.log('requireAuth: Auth header present:', !!req.headers.authorization);
  
  // First check session-based auth
  if (req.isAuthenticated()) {
    console.log('requireAuth: Session auth successful for', req.user?.email);
    return next();
  }
  
  // Then check for Google OAuth token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('requireAuth: Verifying Google OAuth token...');
    try {
      // Verify the token with Google
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userInfo = await response.json();
        console.log('requireAuth: Google token verified for', userInfo.email, 'domain:', userInfo.hd);
        // Check if user is from seedfinancial.io domain
        if (userInfo.hd === 'seedfinancial.io') {
          // Get user from database
          const user = await storage.getUserByEmail(userInfo.email);
          if (user) {
            console.log('requireAuth: Google OAuth auth successful for', user.email);
            req.user = user;
            return next();
          } else {
            console.log('requireAuth: User not found in database:', userInfo.email);
          }
        } else {
          console.log('requireAuth: Invalid domain:', userInfo.hd);
        }
      } else {
        console.log('requireAuth: Google token verification failed:', response.status);
      }
    } catch (error) {
      console.error('requireAuth: Token verification failed:', error);
    }
  }
  
  console.log('requireAuth: Authentication failed');
  return res.status(401).json({ message: "Authentication required" });
}