import { GoogleAuth } from 'google-auth-library';
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
      console.log('Initializing Google Admin API with Service Account...');
      
      // First try to use GOOGLE_SERVICE_ACCOUNT_JSON secret
      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      if (serviceAccountJson) {
        console.log('Using GOOGLE_SERVICE_ACCOUNT_JSON secret for Google Admin API');
        
        const credentials = JSON.parse(serviceAccountJson);
        const auth = new GoogleAuth({
          credentials,
          scopes: [
            'https://www.googleapis.com/auth/admin.directory.user.readonly',
            'https://www.googleapis.com/auth/admin.directory.group.readonly',
            'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
          ],
          // Subject impersonation for domain-wide delegation
          subject: 'jon@seedfinancial.io' // Admin user for domain-wide delegation
        });

        const authClient = await auth.getClient();
        
        // Test the credentials
        const accessTokenResponse = await authClient.getAccessToken();
        if (!accessTokenResponse.token) {
          throw new Error('No valid access token obtained from service account');
        }

        console.log('Google Admin API initialized successfully with service account');
        
        this.admin = google.admin({ version: 'directory_v1', auth: authClient as any });
        this.initialized = true;
        return;
      }
      
      // Fallback to ADC discovery
      console.log('No service account found, trying ADC discovery...');
      const auth = new GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/admin.directory.user.readonly',
          'https://www.googleapis.com/auth/admin.directory.group.readonly',
          'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
        ]
      });

      const authClient = await auth.getClient();
      
      // Test the credentials
      const accessTokenResponse = await authClient.getAccessToken();
      if (!accessTokenResponse.token) {
        throw new Error('No valid access token obtained from ADC');
      }

      console.log('Google Admin API initialized successfully via ADC');
      
      this.admin = google.admin({ version: 'directory_v1', auth: authClient as any });
      this.initialized = true;
      
    } catch (error) {
      // Log the actual error for debugging
      console.error('Failed to initialize Google Admin API:', error);
      console.log('To use Google Admin API:');
      console.log('1. Run: gcloud auth application-default login --scopes=https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.group.readonly');
      console.log('2. Copy the ADC file to: ~/.config/gcloud/application_default_credentials.json');
      
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