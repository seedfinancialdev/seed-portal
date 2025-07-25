import express from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { z } from 'zod';
import { storage } from './storage.js';

const router = express.Router();

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Configure passport local strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      // Check if email is from seedfinancial.io domain
      if (!email.endsWith('@seedfinancial.io')) {
        return done(null, false, { message: 'Invalid email domain' });
      }
      
      // Check default password
      if (password !== 'SeedAdmin1!') {
        return done(null, false, { message: 'Invalid password' });
      }
      
      // Get or create user
      let user = await storage.getSalesRepByEmail(email);
      if (!user) {
        // Create user from email
        const [firstName, lastName] = email.split('@')[0].split('.');
        user = await storage.createSalesRep({
          email,
          firstName: firstName || 'User',
          lastName: lastName || 'User',
          isActive: true,
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getSalesRepById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Login endpoint
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ 
          error: info?.message || 'Authentication failed' 
        });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        
        res.json({ 
          message: 'Login successful', 
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        });
      });
    })(req, res, next);
    
  } catch (error) {
    res.status(400).json({ error: 'Invalid request data' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      
      res.json({ message: 'Logout successful' });
    });
  });
});

// Get current user
router.get('/user', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Middleware to require authentication
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

export { router as authRouter };