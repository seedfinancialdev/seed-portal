import type { Express } from "express";
import { GoogleAdminService } from "./google-admin";
import { storage } from "./storage";
import { requireAuth, hashPassword } from "./auth";

export async function registerAdminRoutes(app: Express): Promise<void> {
  let googleAdminService: GoogleAdminService | null = null;
  
  // Initialize Google Admin service if configured
  try {
    googleAdminService = new GoogleAdminService();
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    const isConfigured = await googleAdminService.isConfigured();
    if (!isConfigured) {
      console.warn('Google Admin API not configured - user management will be limited');
      googleAdminService = null;
    } else {
      console.log('Google Admin API configured successfully');
    }
  } catch (error) {
    console.warn('Google Admin service initialization failed:', error);
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
          configured: false
        });
      }

      const workspaceUsers = await googleAdminService.getAllDomainUsers();
      res.json({ 
        users: workspaceUsers,
        configured: true
      });
    } catch (error: any) {
      console.error('Error fetching workspace users:', error);
      
      // Provide detailed setup instructions for common errors
      if (error.message?.includes('authorized_user credentials cannot be used')) {
        return res.status(500).json({ 
          message: 'Wrong Credential Type',
          error: 'authorized_user credentials detected, but service account required',
          setupInstructions: {
            currentIssue: 'You have user OAuth credentials, but Google Admin API requires a service account with domain-wide delegation',
            solution: 'Create a service account instead of using user credentials',
            step1: 'Go to Google Cloud Console → IAM & Admin → Service Accounts',
            step2: 'Click "Create Service Account"',
            step3: 'Name: "seedos-admin" or similar',
            step4: 'Click "Create and Continue"',
            step5: 'Skip role assignment (not needed for domain-wide delegation)',
            step6: 'Click "Done"',
            step7: 'Click on the new service account → Keys → Add Key → Create new key → JSON',
            step8: 'Download the JSON file and replace GOOGLE_SERVICE_ACCOUNT_JSON secret with its contents',
            step9: 'In Google Workspace Admin Console → Security → API Controls → Domain-wide Delegation',
            step10: 'Add the service account Client ID with required scopes',
            scopes: [
              'https://www.googleapis.com/auth/admin.directory.user.readonly',
              'https://www.googleapis.com/auth/admin.directory.group.readonly',
              'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
            ],
            note: 'Service accounts can impersonate domain users, while user OAuth cannot access the Admin API'
          }
        });
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

      if (!role || !['admin', 'sales', 'service'].includes(role)) {
        return res.status(400).json({ 
          message: 'Invalid role. Must be admin, sales, or service' 
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
      const { email, role = 'service' } = req.body;
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
}

// Helper function for password hashing (reused from auth.ts)
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}