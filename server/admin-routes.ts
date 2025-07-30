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