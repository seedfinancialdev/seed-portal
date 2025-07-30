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
          
          // For impersonated service accounts, create a simpler direct approach
          if (credentials.type === 'impersonated_service_account') {
            console.log('Impersonated service account detected - implementing workaround for Google Admin API');
            
            // Create a temporary message for user about creating a direct service account
            console.warn('SETUP REQUIRED: Impersonated service accounts require complex IAM setup. Recommend creating a direct service account instead.');
            
            // Still try the impersonated approach but with better error handling
            auth = new GoogleAuth({
              credentials,
              scopes: [
                'https://www.googleapis.com/auth/admin.directory.user.readonly',
                'https://www.googleapis.com/auth/admin.directory.group.readonly',
                'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
              ]
            });
          } else {
            // Standard service account - much simpler setup
            console.log('Using standard service account for Google Admin API');
            auth = new GoogleAuth({
              credentials,
              scopes: [
                'https://www.googleapis.com/auth/admin.directory.user.readonly',
                'https://www.googleapis.com/auth/admin.directory.group.readonly',
                'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
              ]
            });
          }
        } catch (parseError) {
          console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', parseError);
          
          // Provide helpful debugging information
          if (parseError instanceof SyntaxError) {
            const errorMessage = parseError.message;
            const position = errorMessage.match(/position (\d+)/);
            if (position) {
              const pos = parseInt(position[1]);
              const jsonStart = serviceAccountJson.substring(Math.max(0, pos - 50), pos);
              const jsonEnd = serviceAccountJson.substring(pos, pos + 50);
              console.error(`JSON syntax error near position ${pos}:`);
              console.error(`...${jsonStart}[ERROR HERE]${jsonEnd}...`);
            }
          }
          
          console.warn('Google Admin API credentials not configured - invalid JSON format');
          console.warn('Please check that the GOOGLE_SERVICE_ACCOUNT_JSON secret contains valid JSON');
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

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      if (!this.admin) {
        return { connected: false, error: 'Google Admin API not initialized' };
      }

      // Try to fetch domains to test connection
      const response = await this.admin.domains.list({
        customer: 'my_customer'
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
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      console.error('Error fetching Google Workspace user:', error);
      throw new Error(`Failed to fetch workspace user: ${error}`);
    }
  }
}