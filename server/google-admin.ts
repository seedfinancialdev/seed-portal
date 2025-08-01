import { OAuth2Client } from 'google-auth-library';
import { admin_directory_v1, google } from 'googleapis';

export interface GoogleWorkspaceUser {
  id: string;
  primaryEmail: string;
  name: {
    givenName: string;
    familyName: string;
    fullName: string;
  };
  isAdmin: boolean;
  suspended: boolean;
  orgUnitPath: string;
  lastLoginTime?: string | null;
  creationTime: string;
  thumbnailPhotoUrl?: string | null;
}

export class GoogleAdminService {
  private admin: admin_directory_v1.Admin | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private loggedInitError = false;

  constructor() {
    // Store initialization promise to await in methods
    this.initializationPromise = this.initialize().catch(error => {
      console.error('Google Admin initialization failed:', error);
      this.initialized = false;
    });
  }

  private async initialize() {
    try {      
      console.log('Initializing Google Admin API with service account impersonation...');
      
      // Check for required secrets
      const { GOOGLE_CLIENT_ID_OS, GOOGLE_CLIENT_SECRET_OS, GOOGLE_REFRESH_TOKEN, IMP_SA_EMAIL } = process.env;
      
      if (!GOOGLE_CLIENT_ID_OS || !GOOGLE_CLIENT_SECRET_OS || !GOOGLE_REFRESH_TOKEN || !IMP_SA_EMAIL) {
        throw new Error('Missing required secrets: GOOGLE_CLIENT_ID_OS, GOOGLE_CLIENT_SECRET_OS, GOOGLE_REFRESH_TOKEN, IMP_SA_EMAIL');
      }

      // A. Authenticate as user using refresh token
      console.log('Step 1: Authenticating as user with refresh token...');
      const userAuth = new OAuth2Client(
        GOOGLE_CLIENT_ID_OS,
        GOOGLE_CLIENT_SECRET_OS
      );
      userAuth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

      // B. Ask Google to impersonate the service account for 1 hour
      console.log('Step 2: Requesting 1-hour impersonation token for service account...');
      const iam = google.iamcredentials({ version: 'v1', auth: userAuth });
      const { data } = await iam.projects.serviceAccounts.generateAccessToken({
        name: `projects/-/serviceAccounts/${IMP_SA_EMAIL}`,
        requestBody: {
          scope: [
            'https://www.googleapis.com/auth/admin.directory.user.readonly',
            'https://www.googleapis.com/auth/admin.directory.group.readonly',
            'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
          ],
          lifetime: '3600s', // 1 hour
        },
      });

      if (!data.accessToken) {
        throw new Error('Failed to obtain impersonation access token');
      }

      // C. Use that 1-hour token with the Admin SDK
      console.log('Step 3: Creating Admin SDK client with impersonation token...');
      const adminAuth = new OAuth2Client();
      adminAuth.setCredentials({ access_token: data.accessToken });
      
      // Set the subject for domain-wide delegation (impersonate as admin user)
      adminAuth.subject = 'jon@seedfinancial.io';
      
      this.admin = google.admin({ version: 'directory_v1', auth: adminAuth });
      this.initialized = true;
      
      console.log('✅ Google Admin API initialized successfully with service account impersonation');
      console.log(`✅ Impersonation token expires: ${data.expireTime}`);
      
    } catch (error) {
      // Log the actual error for debugging
      console.error('❌ Failed to initialize Google Admin API:', error);
      
      if ((error as any).message?.includes('invalid_grant')) {
        console.log('🔧 Refresh token expired. Please regenerate credentials:');
        console.log('1. Run: gcloud auth application-default login --scopes=https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.group.readonly,https://www.googleapis.com/auth/cloud-platform');
        console.log('2. Update GOOGLE_REFRESH_TOKEN secret with new refresh_token from ~/.config/gcloud/application_default_credentials.json');
      } else if ((error as any).message?.includes('Permission denied')) {
        console.log('🔧 Service account impersonation failed. Verify:');
        console.log('1. You have "Service Account Token Creator" role on the service account');
        console.log('2. Domain-wide delegation is configured for the service account');
      }
      
      this.admin = null;
      this.initialized = false;
    }
  }

  async isConfigured(): Promise<boolean> {
    // Wait for initialization to complete
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    return this.initialized && this.admin !== null;
  }

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      // Wait for initialization to complete
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      
      if (!this.admin) {
        return { connected: false, error: 'Google Admin API not initialized' };
      }

      // Try to list users to test connection (simpler than domains)
      const response = await this.admin.users.list({
        customer: 'my_customer',
        domain: 'seedfinancial.io',
        maxResults: 1
      });
      
      return { connected: response.status === 200 };
    } catch (error: any) {
      console.error('Google Admin API connection test failed:', error);
      
      if (error.code === 403 || error.status === 403) {
        if (error.message?.includes('iam.serviceAccounts.getAccessToken')) {
          return { 
            connected: false, 
            error: 'Domain-wide delegation not configured. Please enable domain-wide delegation for the service account in Google Workspace Admin Console.' 
          };
        }
        return { 
          connected: false, 
          error: 'Insufficient permissions. Check admin permissions and domain-wide delegation settings.' 
        };
      }
      
      return { connected: false, error: error.message || 'Connection test failed' };
    }
  }

  async getAllDomainUsers(): Promise<GoogleWorkspaceUser[]> {
    try {
      // Wait for initialization to complete
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      
      if (!this.admin) {
        throw new Error('Google Admin API not initialized');
      }

      const response = await this.admin.users.list({
        customer: 'my_customer',
        domain: 'seedfinancial.io',
        maxResults: 500,
        projection: 'full'
      });

      const users = response.data.users || [];
      
      return users.map(user => ({
        id: user.id || '',
        primaryEmail: user.primaryEmail || '',
        name: {
          givenName: user.name?.givenName || '',
          familyName: user.name?.familyName || '',
          fullName: user.name?.fullName || ''
        },
        isAdmin: user.isAdmin || false,
        suspended: user.suspended || false,
        orgUnitPath: user.orgUnitPath || '/',
        lastLoginTime: user.lastLoginTime,
        creationTime: user.creationTime || '',
        thumbnailPhotoUrl: user.thumbnailPhotoUrl
      }));
    } catch (error: any) {
      console.error('Error fetching Google Workspace users:', error);
      
      // Handle specific permission errors
      if (error.code === 403 || error.status === 403) {
        if (error.message?.includes('iam.serviceAccounts.getAccessToken')) {
          throw new Error('Domain-wide delegation not configured. The service account needs domain-wide delegation enabled in Google Workspace Admin Console.');
        }
        throw new Error('Insufficient permissions to access Google Workspace users. Check admin permissions and domain-wide delegation.');
      }
      
      throw new Error(`Failed to fetch workspace users: ${error.message || error}`);
    }
  }

  async getUserByEmail(email: string): Promise<GoogleWorkspaceUser | null> {
    try {
      if (!this.admin) {
        throw new Error('Google Admin API not initialized');
      }

      const response = await this.admin.users.get({
        userKey: email,
        projection: 'full'
      });

      const user = response.data;
      if (!user) {
        return null;
      }

      return {
        id: user.id || '',
        primaryEmail: user.primaryEmail || '',
        name: {
          givenName: user.name?.givenName || '',
          familyName: user.name?.familyName || '',
          fullName: user.name?.fullName || ''
        },
        isAdmin: user.isAdmin || false,
        suspended: user.suspended || false,
        orgUnitPath: user.orgUnitPath || '/',
        lastLoginTime: user.lastLoginTime,
        creationTime: user.creationTime || '',
        thumbnailPhotoUrl: user.thumbnailPhotoUrl
      };
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      console.error('Error fetching Google Workspace user:', error);
      throw new Error(`Failed to fetch workspace user: ${error?.message || error}`);
    }
  }
}