import type { Express } from "express";
import { GoogleAdminService } from "./google-admin";
import { storage } from "./storage";
import { requireAuth, hashPassword } from "./auth";
import { scheduleWorkspaceSync } from "./jobs";

// In-memory impersonation store
const impersonationStore = new Map<string, {
  adminUserId: number;
  adminEmail: string;
  impersonatedUserId: number;
  impersonatedEmail: string;
  createdAt: Date;
}>();

// Helper function to get impersonation data by session ID
export function getImpersonationData(sessionId: string) {
  return impersonationStore.get(sessionId);
}

export async function registerAdminRoutes(app: Express): Promise<void> {
  let googleAdminService: GoogleAdminService | null = null;
  
  // Initialize Google Admin service if configured
  try {
    googleAdminService = new GoogleAdminService();
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    const isConfigured = await googleAdminService.isConfigured();
    if (!isConfigured) {
      // Don't log as warning - this is optional
      googleAdminService = null;
    } else {
      console.log('Google Admin API configured successfully');
    }
  } catch (error) {
    // Don't log as warning - this is optional functionality
    googleAdminService = null;
  }

  // Middleware to check admin access after authentication
  const requireAdmin = (req: any, res: any, next: any) => {
    console.log('Admin access check:', {
      hasUser: !!req.user,
      userEmail: req.user?.email,
      userRole: req.user?.role
    });
    
    // For hardcoded admin email - always allow
    if (req.user?.email === 'jon@seedfinancial.io') {
      return next();
    }
    
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  };

  // Get all Google Workspace users
  app.get('/api/admin/workspace-users', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!googleAdminService) {
        return res.status(503).json({ 
          message: 'Google Admin API not configured',
          configured: false,
          setupInstructions: {
            issue: 'ADC file missing or invalid refresh token',
            steps: [
              '1. On your local machine, run:',
              '   gcloud auth application-default login --scopes=https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.group.readonly',
              '2. This will open a browser to authenticate with your @seedfinancial.io admin account',
              '3. Copy the generated file from your local machine:',
              '   Mac/Linux: ~/.config/gcloud/application_default_credentials.json',
              '   Windows: %APPDATA%\\gcloud\\application_default_credentials.json',
              '4. In Replit, create the file at: ~/.config/gcloud/application_default_credentials.json',
              '5. Restart the application'
            ]
          }
        });
      }

      const workspaceUsers = await googleAdminService.getAllDomainUsers();
      res.json({ 
        users: workspaceUsers,
        configured: true
      });
    } catch (error: any) {
      console.error('Error fetching workspace users:', error);
      
      // Handle various Google Admin API errors
      if (error.code === 403) {
        if (error.message?.includes('Insufficient Permission') || error.message?.includes('Request had insufficient authentication scopes')) {
          return res.status(500).json({ 
            message: 'Insufficient Permissions',
            error: 'The credential lacks required Admin SDK scopes',
            setupInstructions: {
              currentIssue: 'The credential does not have Admin Directory API access',
              solution: 'Re-create the ADC file with proper Admin SDK scopes',
              step1: 'Run: gcloud auth application-default revoke',
              step2: 'Run: gcloud auth application-default login --scopes=https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.group.readonly',
              step3: 'Copy the new ADC file to ~/.config/gcloud/application_default_credentials.json in Replit',
              step4: 'Ensure the user account has Google Workspace Admin role',
              note: 'For development, use authorized_user ADC with Admin Directory scopes'
            }
          });
        }
        
        if (error.message?.includes('Not Authorized to access this resource/api')) {
          return res.status(500).json({
            message: 'API Access Denied',
            error: 'Admin SDK API not enabled or user lacks Workspace admin privileges',
            setupInstructions: {
              currentIssue: 'Either the Admin SDK API is not enabled or the user lacks admin permissions',
              solution: 'Enable Admin SDK API and ensure user is a Workspace admin',
              step1: 'Go to Google Cloud Console → APIs & Services → Library',
              step2: 'Search for "Admin SDK API" and enable it',
              step3: 'Ensure the authenticated user has Google Workspace Super Admin role',
              step4: 'Re-run: gcloud auth application-default login with admin user',
              note: 'Only Workspace Super Admins can access the Directory API'
            }
          });
        }
      }
      
      if (error.message?.includes('iam.serviceAccounts.getAccessToken')) {
        return res.status(500).json({ 
          message: 'Google Workspace Admin API Setup Issue',
          error: 'Impersonated service account requires complex setup',
          setupInstructions: {
            currentIssue: 'Impersonated service accounts need additional IAM permissions that can be complex to configure',
            recommendedSolution: 'Create a direct service account instead (much simpler setup)',
            step1: 'Go to Google Cloud Console → IAM & Admin → Service Accounts',
            step2: 'Create a new service account (e.g., "seedos-admin-direct")',
            step3: 'Download the JSON key file',
            step4: 'Replace the current GOOGLE_SERVICE_ACCOUNT_JSON secret with the new direct service account JSON',
            step5: 'In Google Workspace Admin Console → Security → API Controls → Domain-wide Delegation',
            step6: 'Add the new service account client ID with these scopes:',
            scopes: [
              'https://www.googleapis.com/auth/admin.directory.user.readonly',
              'https://www.googleapis.com/auth/admin.directory.group.readonly',
              'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
            ],
            note: 'Direct service accounts are much more reliable than impersonated ones for this use case'
          }
        });
      }
      
      res.status(500).json({ 
        message: 'Failed to fetch workspace users: ' + error.message 
      });
    }
  });

  // Get all users from our database
  app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ 
        message: 'Failed to fetch users: ' + error.message 
      });
    }
  });

  // Update user role
  app.patch('/api/admin/users/:userId/role', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { role } = req.body;
      const adminUserId = req.user.id;

      if (!role || !['admin', 'employee'].includes(role)) {
        return res.status(400).json({ 
          message: 'Invalid role. Must be admin or employee' 
        });
      }

      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const updatedUser = await storage.updateUserRole(userId, role, adminUserId);
      
      res.json({ 
        message: 'User role updated successfully',
        user: updatedUser
      });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      res.status(500).json({ 
        message: 'Failed to update user role: ' + error.message 
      });
    }
  });

  // Sync a Google Workspace user to our database
  app.post('/api/admin/sync-workspace-user', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { email, role = 'employee' } = req.body;
      const adminUserId = req.user.id;

      if (!email || !email.endsWith('@seedfinancial.io')) {
        return res.status(400).json({ 
          message: 'Invalid email or not a Seed Financial email' 
        });
      }

      // Check if user already exists
      let user = await storage.getUserByEmail(email);
      
      if (user) {
        // Update existing user's role
        user = await storage.updateUserRole(user.id, role, adminUserId);
        return res.json({ 
          message: 'Existing user role updated',
          user,
          action: 'updated'
        });
      }

      // Create new user
      user = await storage.createUser({
        email,
        password: await hashPassword('SeedAdmin1!'), // Default password
        firstName: '',
        lastName: '',
        hubspotUserId: null,
        role,
        roleAssignedBy: adminUserId,
        roleAssignedAt: new Date(),
      });

      res.json({ 
        message: 'User created successfully',
        user,
        action: 'created'
      });
    } catch (error: any) {
      console.error('Error syncing workspace user:', error);
      res.status(500).json({ 
        message: 'Failed to sync workspace user: ' + error.message 
      });
    }
  });

  // Create a new user
  app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { firstName, lastName, email, role = 'employee', defaultDashboard = 'sales' } = req.body;
      const adminUserId = req.user.id;

      if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
        return res.status(400).json({ 
          message: 'First name, last name, and email are required' 
        });
      }

      if (!email.endsWith('@seedfinancial.io')) {
        return res.status(400).json({ 
          message: 'Email must be a @seedfinancial.io address' 
        });
      }

      if (!['admin', 'employee'].includes(role)) {
        return res.status(400).json({ 
          message: 'Invalid role. Must be admin or employee' 
        });
      }

      if (!['admin', 'sales', 'service'].includes(defaultDashboard)) {
        return res.status(400).json({ 
          message: 'Invalid default dashboard. Must be admin, sales, or service' 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          message: 'A user with this email already exists' 
        });
      }

      // Generate a random password
      const generatedPassword = generatePassword();

      // Create new user
      const user = await storage.createUser({
        email,
        password: await hashPassword(generatedPassword),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        hubspotUserId: null,
        role,
        defaultDashboard,
        roleAssignedBy: adminUserId,
        roleAssignedAt: new Date(),
      });

      res.json({ 
        message: 'User created successfully',
        user,
        generatedPassword // Return the password so admin can share it
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ 
        message: 'Failed to create user: ' + error.message 
      });
    }
  });

  // Delete a user
  app.delete('/api/admin/users/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const currentUserId = req.user.id;

      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      // Prevent user from deleting themselves
      if (userId === currentUserId) {
        return res.status(400).json({ 
          message: 'You cannot delete your own account' 
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.deleteUser(userId);
      
      res.json({ 
        message: 'User deleted successfully',
        deletedUser: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        message: 'Failed to delete user: ' + error.message 
      });
    }
  });

  // Generate password reset for a user
  app.post('/api/admin/users/:userId/reset-password', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate a new password
      const newPassword = generatePassword();
      const hashedPassword = await hashPassword(newPassword);

      // Update user's password
      await storage.updateUserPassword(userId, hashedPassword);
      
      res.json({ 
        message: 'Password reset successfully',
        newPassword,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      res.status(500).json({ 
        message: 'Failed to reset password: ' + error.message 
      });
    }
  });

  // Trigger manual workspace sync
  app.post('/api/admin/sync-workspace', requireAuth, requireAdmin, async (req, res) => {
    try {
      const job = await scheduleWorkspaceSync('manual', req.user.id);
      res.json({ 
        message: 'Workspace sync job scheduled successfully',
        jobId: job.id,
        status: 'scheduled'
      });
    } catch (error: any) {
      console.error('Error scheduling workspace sync:', error);
      res.status(500).json({ 
        message: 'Failed to schedule workspace sync: ' + error.message 
      });
    }
  });

  // Test Google Admin API connection
  app.get('/api/admin/test-google-admin', requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!googleAdminService) {
        return res.json({ 
          connected: false,
          configured: false,
          message: 'Google Admin API not configured'
        });
      }

      const testResult = await googleAdminService.testConnection();
      res.json({ 
        connected: testResult.connected,
        configured: true,
        message: testResult.connected ? 'Connection successful' : (testResult.error || 'Connection failed')
      });
    } catch (error: any) {
      res.json({ 
        connected: false,
        configured: true,
        message: 'Connection test failed: ' + error.message
      });
    }
  });

  // Debug endpoint to check session state
  app.get('/api/admin/debug-session', requireAuth, requireAdmin, (req, res) => {
    res.json({
      sessionID: req.sessionID,
      sessionKeys: Object.keys(req.session),
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? { id: req.user.id, email: req.user.email } : null,
      sessionPassport: (req.session as any)?.passport,
      sessionIsImpersonating: (req.session as any)?.isImpersonating,
      sessionOriginalUser: (req.session as any)?.originalUser
    });
  });

  // Impersonate user
  app.post('/api/admin/impersonate/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      // Get the user to impersonate
      const userToImpersonate = await storage.getUser(userId);
      if (!userToImpersonate) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Store original user info in session for later restoration
      const originalUserData = {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        defaultDashboard: req.user.defaultDashboard
      };
      
      req.session.originalUser = originalUserData;
      req.session.isImpersonating = true;
      
      console.log('🎭 IMPERSONATION STARTED:');
      console.log('🎭 Original admin:', req.user.email, `(${req.user.id})`);
      console.log('🎭 Impersonating:', userToImpersonate.email, `(${userToImpersonate.id})`);
      console.log('🎭 Session ID:', req.sessionID);
      console.log('🎭 Session isImpersonating:', req.session.isImpersonating);

      // Store impersonation data in memory store
      impersonationStore.set(req.sessionID, {
        adminUserId: req.user.id,
        adminEmail: req.user.email,
        impersonatedUserId: userToImpersonate.id,
        impersonatedEmail: userToImpersonate.email,
        createdAt: new Date()
      });
      
      console.log('🎭 Impersonation stored in memory:', req.sessionID);
      
      // Login as the impersonated user
      req.login(userToImpersonate, (err) => {
        if (err) {
          console.error('Error logging in as impersonated user:', err);
          // Clean up the impersonation store on error
          impersonationStore.delete(req.sessionID);
          return res.status(500).json({ 
            message: 'Failed to start impersonation: ' + err.message 
          });
        }
        
        console.log('🎭 Impersonation successful - logged in as:', userToImpersonate.email);
        
        // Return success with impersonation data
        res.json({
          message: 'Impersonation started successfully',
          user: {
            ...userToImpersonate,
            isImpersonating: true,
            originalUser: originalUserData
          },
          isImpersonating: true
        });
      });
    } catch (error: any) {
      console.error('Error starting impersonation:', error);
      res.status(500).json({ 
        message: 'Failed to start impersonation: ' + error.message 
      });
    }
  });

  // Stop impersonation and return to original admin user
  app.post('/api/admin/stop-impersonation', requireAuth, async (req, res) => {
    try {
      console.log('🛑 STOP IMPERSONATION CALLED:');
      console.log('🛑 Session ID:', req.sessionID);
      
      // Check impersonation store
      const impersonationData = impersonationStore.get(req.sessionID);
      if (!impersonationData) {
        console.log('🛑 ERROR: Not currently impersonating');
        return res.status(400).json({ 
          message: 'Not currently impersonating a user' 
        });
      }

      console.log('🛑 Found impersonation data:', impersonationData.adminEmail);

      // Get the full original admin user data from database
      const fullOriginalUser = await storage.getUser(impersonationData.adminUserId);
      if (!fullOriginalUser) {
        return res.status(404).json({ 
          message: 'Original admin user not found' 
        });
      }

      // Clear impersonation data from session
      delete req.session.originalUser;
      delete req.session.isImpersonating;

      // Restore original user session using passport's login method
      req.login(fullOriginalUser, (err) => {
        if (err) {
          console.error('Error restoring original user session:', err);
          return res.status(500).json({ 
            message: 'Failed to stop impersonation: ' + err.message 
          });
        }
        
        res.json({
          message: 'Impersonation stopped successfully',
          user: fullOriginalUser,
          isImpersonating: false
        });
      });
    } catch (error: any) {
      console.error('Error stopping impersonation:', error);
      res.status(500).json({ 
        message: 'Failed to stop impersonation: ' + error.message 
      });
    }
  });


}

// Helper function for password hashing (reused from auth.ts)
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Password generation function
function generatePassword(): string {
  const adjectives = ['Quick', 'Bright', 'Swift', 'Smart', 'Bold', 'Sharp', 'Clear', 'Fresh', 'Strong', 'Wise'];
  const nouns = ['Tiger', 'Eagle', 'Wolf', 'Falcon', 'Lion', 'Shark', 'Bear', 'Fox', 'Hawk', 'Lynx'];
  const numbers = Math.floor(Math.random() * 900) + 100; // 3-digit number
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective}${noun}${numbers}!`;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}