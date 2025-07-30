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
  lastLoginTime?: string;
  creationTime: string;
  thumbnailPhotoUrl?: string;
}

export class GoogleAdminService {
  private admin: admin_directory_v1.Admin | null = null;
  private initialized = false;

  constructor() {
    // Start initialization but don't wait for it in constructor
    this.initialize().catch(error => {
      console.error('Google Admin initialization failed:', error);
      this.initialized = false;
    });
  }

  private async initialize() {
    try {
      // Check if service account credentials are available
      const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      
      if (!serviceAccountPath && !serviceAccountJson) {
        console.warn('Google Admin API credentials not configured');
        return;
      }

      let auth: GoogleAuth;
      
      if (serviceAccountJson) {
        try {
          // Use JSON string credentials
          const credentials = JSON.parse(serviceAccountJson);
          
          // Check if it's an impersonated service account
          if (credentials.type === 'impersonated_service_account') {
            console.log('Using impersonated service account for Google Admin API');
            auth = new GoogleAuth({
              credentials,
              scopes: [
                'https://www.googleapis.com/auth/admin.directory.user.readonly',
                'https://www.googleapis.com/auth/admin.directory.domain.readonly'
              ]
            });
          } else {
            // Standard service account
            auth = new GoogleAuth({
              credentials,
              scopes: [
                'https://www.googleapis.com/auth/admin.directory.user.readonly',
                'https://www.googleapis.com/auth/admin.directory.domain.readonly'
              ]
            });
          }
        } catch (parseError) {
          console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', parseError);
          console.warn('Google Admin API credentials not configured - invalid JSON format');
          return;
        }
      } else if (serviceAccountPath) {
        // Use file path credentials
        auth = new GoogleAuth({
          keyFile: serviceAccountPath,
          scopes: [
            'https://www.googleapis.com/auth/admin.directory.user.readonly',
            'https://www.googleapis.com/auth/admin.directory.domain.readonly'
          ]
        });
      } else {
        throw new Error('No valid Google Admin API credentials found');
      }

      // Subject must be an admin user for domain-wide delegation
      const adminEmail = process.env.GOOGLE_ADMIN_EMAIL || 'admin@seedfinancial.io';
      const authClient = await auth.getClient();
      authClient.subject = adminEmail;

      this.admin = google.admin({ version: 'directory_v1', auth: authClient });
      this.initialized = true;
      
      console.log('Google Admin API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Admin API:', error);
      this.admin = null;
      this.initialized = false;
    }
  }

  async isConfigured(): Promise<boolean> {
    return this.initialized && this.admin !== null;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.admin) {
        return false;
      }

      // Try to fetch domains to test connection
      const response = await this.admin.domains.list({
        customer: 'my_customer'
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Google Admin API connection test failed:', error);
      return false;
    }
  }

  async getAllDomainUsers(): Promise<GoogleWorkspaceUser[]> {
    try {
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
    } catch (error) {
      console.error('Error fetching Google Workspace users:', error);
      throw new Error(`Failed to fetch workspace users: ${error}`);
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
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      console.error('Error fetching Google Workspace user:', error);
      throw new Error(`Failed to fetch workspace user: ${error}`);
    }
  }
}