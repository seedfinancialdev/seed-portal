import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Router } from "express";
import { DatabaseStorage } from "./storage.js";
import { hubspotClient } from "./hubspot.js";

const storage = new DatabaseStorage();
const router = Router();

// Configure Passport Local Strategy
passport.use(new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  async (email: string, password: string, done) => {
    try {
      // Check if email is @seedfinancial.io
      if (!email.endsWith('@seedfinancial.io')) {
        return done(null, false, { message: 'Only @seedfinancial.io emails are authorized.' });
      }

      // Verify password (same default for all users)
      if (password !== 'SeedAdmin1!') {
        return done(null, false, { message: 'Incorrect password. Contact admin for assistance.' });
      }

      // Check if user exists in HubSpot
      let hubspotUser;
      try {
        const ownersResponse = await hubspotClient.crm.owners.getAll();
        hubspotUser = ownersResponse.results.find(
          owner => owner.email?.toLowerCase() === email.toLowerCase()
        );
      } catch (error) {
        console.error('HubSpot verification failed:', error);
        return done(null, false, { message: 'Unable to verify user with HubSpot.' });
      }

      if (!hubspotUser) {
        return done(null, false, { message: 'User not found in HubSpot CRM.' });
      }

      // Get or create sales rep in database
      let salesRep = await storage.getSalesRepByEmail(email);
      if (!salesRep) {
        salesRep = await storage.createSalesRep({
          email,
          firstName: hubspotUser.firstName || '',
          lastName: hubspotUser.lastName || '',
          hubspotUserId: hubspotUser.userId || hubspotUser.id?.toString(),
          startDate: new Date().toISOString().split('T')[0],
        });
      }

      return done(null, salesRep);
    } catch (error) {
      console.error('Authentication error:', error);
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
    const salesRep = await storage.getSalesRepById(id);
    done(null, salesRep);
  } catch (error) {
    done(error);
  }
});

// Login route
router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ 
    success: true, 
    user: req.user,
    message: 'Login successful' 
  });
});

// Logout route
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

// Check authentication status
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

export { router as authRouter };