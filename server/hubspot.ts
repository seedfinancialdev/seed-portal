// Simple HubSpot integration using fetch API to avoid TypeScript complexity
export interface HubSpotContact {
  id: string;
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
  };
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    dealstage: string;
    amount?: string;
  };
}

export class HubSpotService {
  private accessToken: string;
  private baseUrl = 'https://api.hubapi.com';

  constructor() {
    if (!process.env.HUBSPOT_ACCESS_TOKEN) {
      throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
    }
    this.accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  }

  // Check if a user exists in HubSpot by email (contacts or owners)
  async verifyUserByEmail(email: string): Promise<boolean> {
    try {
      // Check contacts first
      const contactExists = await this.verifyContactByEmail(email);
      if (contactExists.verified) {
        return true;
      }

      // Try to check HubSpot users (employees) via the owners API
      // Note: This requires the crm.objects.owners.read scope
      try {
        const ownersResponse = await this.makeRequest('/crm/v3/owners');
        if (ownersResponse && ownersResponse.results) {
          const userExists = ownersResponse.results.some((owner: any) => 
            owner.email && owner.email.toLowerCase() === email.toLowerCase()
          );
          if (userExists) {
            return true;
          }
        }
      } catch (ownerError) {
        console.log('Owners API not accessible (missing scope), checking contacts only');
      }

      return false;
    } catch (error) {
      console.error('Error verifying user in HubSpot:', error);
      return false;
    }
  }

  // Get pipeline information to find the correct pipeline and stage IDs
  async getPipelines(): Promise<any> {
    try {
      return await this.makeRequest('/crm/v3/pipelines/deals');
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      return null;
    }
  }

  async getOwnerByEmail(email: string): Promise<string | null> {
    try {
      const result = await this.makeRequest('/crm/v3/owners', {
        method: 'GET'
      });
      
      const owner = result.results?.find((owner: any) => owner.email === email);
      return owner?.id || null;
    } catch (error) {
      console.error('Error fetching HubSpot owner:', error);
      return null;
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HubSpot API error details:`, {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        method: options.method || 'GET',
        body: options.body,
        errorResponse: errorText
      });
      throw new Error(`HubSpot API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async getUserProfile(email: string): Promise<{ firstName?: string; lastName?: string; companyName?: string; companyAddress?: string } | null> {
    try {
      // Get company branding information
      const brandingInfo = await this.getCompanyBranding();
      
      // First try to find the user in owners (team members)
      const ownersResult = await this.makeRequest('/crm/v3/owners', {
        method: 'GET'
      });
      
      const owner = ownersResult.results?.find((o: any) => o.email === email);
      if (owner) {
        return {
          firstName: owner.firstName,
          lastName: owner.lastName,
          companyName: brandingInfo?.companyName || 'Seed Financial',
          companyAddress: brandingInfo?.companyAddress || 'Austin, TX'
        };
      }
      
      // If not found in owners, try contacts
      const contact = await this.verifyContactByEmail(email);
      if (contact.verified && contact.contact) {
        return {
          firstName: contact.contact.properties?.firstname,
          lastName: contact.contact.properties?.lastname,
          companyName: brandingInfo?.companyName || 'Seed Financial',
          companyAddress: brandingInfo?.companyAddress || 'Austin, TX'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async getCompanyBranding(): Promise<{ companyName?: string; companyAddress?: string } | null> {
    try {
      // Try to get company information from settings API
      const accountInfo = await this.makeRequest('/integrations/v1/me');
      
      if (accountInfo && accountInfo.portalId) {
        return {
          companyName: 'Seed Financial', // Use from HubSpot company settings
          companyAddress: 'Austin, TX' // Use from HubSpot company settings
        };
      }
      
      return null;
    } catch (error) {
      console.log('Could not fetch company branding, using defaults:', (error as Error).message);
      return null;
    }
  }

  async verifyContactByEmail(email: string): Promise<{ verified: boolean; contact?: HubSpotContact }> {
    try {
      const searchBody = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email
              }
            ]
          }
        ],
        properties: ['email', 'firstname', 'lastname', 'company']
      };

      const result = await this.makeRequest('/crm/v3/objects/contacts/search', {
        method: 'POST',
        body: JSON.stringify(searchBody)
      });
      
      if (result.results && result.results.length > 0) {
        const contact = result.results[0];
        return {
          verified: true,
          contact: {
            id: contact.id,
            properties: {
              email: contact.properties?.email || email,
              firstname: contact.properties?.firstname || '',
              lastname: contact.properties?.lastname || '',
              company: contact.properties?.company || ''
            }
          }
        };
      }

      return { verified: false };
    } catch (error) {
      console.error('Error verifying contact in HubSpot:', error);
      return { verified: false };
    }
  }

  async createDeal(contactId: string, companyName: string, monthlyFee: number, setupFee: number, ownerId?: string): Promise<HubSpotDeal | null> {
    try {
      const dealName = `${companyName} - Bookkeeping`;
      const totalAmount = (monthlyFee * 12 + setupFee).toString();

      // First, let's get the correct pipeline and stage IDs
      const dealBody = {
        properties: {
          dealname: dealName,
          dealstage: '1108547151', // Qualified stage ID in Seed Sales Pipeline
          amount: totalAmount,
          pipeline: '761069086', // Seed Sales Pipeline ID
          dealtype: 'newbusiness', // Deal Type: New Business
          ...(ownerId && { hubspot_owner_id: ownerId }), // Set deal owner
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
          }
        ]
      };

      console.log('Creating deal with body:', JSON.stringify(dealBody, null, 2));

      const result = await this.makeRequest('/crm/v3/objects/deals', {
        method: 'POST',
        body: JSON.stringify(dealBody)
      });
      
      console.log('Deal created successfully:', result.id);
      
      return {
        id: result.id,
        properties: {
          dealname: result.properties?.dealname || dealName,
          dealstage: result.properties?.dealstage || 'qualified',
          amount: result.properties?.amount || totalAmount
        }
      };
    } catch (error) {
      console.error('Error creating deal in HubSpot:', error);
      return null;
    }
  }

  async createQuote(dealId: string, companyName: string, monthlyFee: number, setupFee: number, userEmail: string, firstName: string, lastName: string): Promise<{ id: string; title: string } | null> {
    try {
      // Create a proper HubSpot quote using the quotes API
      console.log('Creating HubSpot quote...');
      
      // Get the user's profile information from HubSpot
      const userProfile = await this.getUserProfile(userEmail);
      
      const quoteName = `${companyName} - Bookkeeping Services Quote`;
      
      // Set expiration date to 30 days from now
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      
      // Create detailed quote description with pricing breakdown
      const quoteDescription = `
Bookkeeping Services Quote

MONTHLY SERVICES:
• Monthly Bookkeeping Services: $${monthlyFee.toFixed(2)}/month
• Annual Total (12 months): $${(monthlyFee * 12).toFixed(2)}

${setupFee > 0 ? `SETUP & CLEANUP:
• One-time Setup and Cleanup Fee: $${setupFee.toFixed(2)}
` : ''}
TOTAL QUOTE VALUE: $${(monthlyFee * 12 + setupFee).toFixed(2)}

Services Include:
• Bank reconciliation
• Accounts payable/receivable management
• Financial statement preparation
• Monthly reporting
• QuickBooks maintenance
• Ongoing support and consultation
      `.trim();

      const quoteBody = {
        properties: {
          hs_title: quoteName,
          hs_status: 'DRAFT',
          hs_expiration_date: expirationDate.toISOString().split('T')[0], // YYYY-MM-DD format
          hs_language: 'en',
          hs_sender_company_name: userProfile?.companyName || 'Seed Financial',
          hs_sender_company_address: userProfile?.companyAddress || 'Austin, TX',
          hs_sender_firstname: userProfile?.firstName || firstName || 'Jon',
          hs_sender_lastname: userProfile?.lastName || lastName || 'Wells',
          hs_sender_email: userEmail,
          hs_esign_enabled: true,
          hs_payment_enabled: false, // Disable for now, can be enabled manually in HubSpot
        },
        associations: [
          {
            to: { id: dealId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 64 }] // Quote to Deal association
          }
        ]
      };

      console.log('Creating quote with body:', JSON.stringify(quoteBody, null, 2));

      const result = await this.makeRequest('/crm/v3/objects/quotes', {
        method: 'POST',
        body: JSON.stringify(quoteBody)
      });

      console.log('Quote created successfully:', result.id);
      
      // Add line items to the quote
      await this.addQuoteLineItems(result.id, monthlyFee, setupFee);

      return {
        id: result.id,
        title: quoteName
      };
    } catch (error) {
      console.error('Error creating HubSpot quote:', error);
      // Fallback to updating deal with quote information
      try {
        console.log('Falling back to updating deal with quote info...');
        await this.updateDealWithQuote(dealId, companyName, monthlyFee, setupFee);
        return {
          id: `deal_${dealId}`,
          title: `${companyName} - Bookkeeping Quote (Deal Updated)`
        };
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  private async addQuoteLineItems(quoteId: string, monthlyFee: number, setupFee: number): Promise<void> {
    try {
      // Use specific product IDs provided by user
      const MONTHLY_PRODUCT_ID = '25687054003'; // Monthly Bookkeeping
      const CLEANUP_PRODUCT_ID = '25683750263'; // Clean-Up / Catch-Up Project

      // Try to associate products directly with the quote using associations API
      await this.associateProductWithQuote(quoteId, MONTHLY_PRODUCT_ID, monthlyFee, 12);
      console.log('Associated monthly bookkeeping product with quote');

      // Add cleanup product if there's a setup fee
      if (setupFee > 0) {
        await this.associateProductWithQuote(quoteId, CLEANUP_PRODUCT_ID, setupFee, 1);
        console.log('Associated cleanup product with quote');
      }
    } catch (error) {
      console.warn('Could not add line items to quote:', error);
    }
  }

  private async getProducts(): Promise<any[]> {
    try {
      const result = await this.makeRequest('/crm/v3/objects/products');
      return result.results || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  private async associateProductWithQuote(quoteId: string, productId: string, price: number, quantity: number): Promise<void> {
    try {
      // Get product details first
      const product = await this.makeRequest(`/crm/v3/objects/products/${productId}`);
      
      // Create a line item with correct properties
      const lineItem = {
        properties: {
          name: product.properties?.name || 'Bookkeeping Service',
          price: price.toString(),
          quantity: quantity.toString(),
          hs_product_id: productId,
          hs_sku: product.properties?.hs_sku || productId,
          description: product.properties?.description || ''
        }
      };

      console.log('Creating line item:', lineItem);
      
      const result = await this.makeRequest('/crm/v3/objects/line_items', {
        method: 'POST',
        body: JSON.stringify(lineItem)
      });

      console.log('Line item created:', result.id);

      // Associate the quote with the line item using type 67 (reversed direction)
      const associationBody = {
        inputs: [
          {
            from: { id: quoteId },
            to: { id: result.id },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 67 }]
          }
        ]
      };

      await this.makeRequest('/crm/v4/associations/quotes/line_items/batch/create', {
        method: 'POST',
        body: JSON.stringify(associationBody)
      });

      console.log(`Line item ${result.id} associated with quote ${quoteId} using type 67`);
    } catch (error) {
      console.error('Error associating product with quote:', error);
      throw error;
    }
  }

  private async updateDealWithQuote(dealId: string, companyName: string, monthlyFee: number, setupFee: number): Promise<void> {
    const description = `Quote Details:
Monthly Fee: $${monthlyFee.toLocaleString()}
Setup Fee: $${setupFee.toLocaleString()}
Total Annual Value: $${(monthlyFee * 12 + setupFee).toLocaleString()}
Generated: ${new Date().toLocaleDateString()}`;

    const updateBody = {
      properties: {
        description: description
      }
    };

    await this.makeRequest(`/crm/v3/objects/deals/${dealId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateBody)
    });
  }

  async updateQuote(noteId: string, companyName: string, monthlyFee: number, setupFee: number): Promise<boolean> {
    try {
      const note = `Quote for ${companyName} (Updated):
- Monthly Fee: $${monthlyFee.toLocaleString()}
- Setup Fee: $${setupFee.toLocaleString()}
- Total Annual Value: $${(monthlyFee * 12 + setupFee).toLocaleString()}
- Updated: ${new Date().toLocaleDateString()}`;

      const updateBody = {
        properties: {
          hs_note_body: note
        }
      };

      await this.makeRequest(`/crm/v3/objects/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateBody)
      });

      return true;
    } catch (error) {
      console.error('Error updating quote note in HubSpot:', error);
      return false;
    }
  }

  async verifyUser(email: string): Promise<{ exists: boolean; userData?: any }> {
    try {
      // Verify this is a @seedfinancial.io email
      if (!email.endsWith('@seedfinancial.io')) {
        return { exists: false };
      }

      const response = await this.makeRequest(`/crm/v3/owners/`, {
        method: 'GET'
      });

      if (response.results) {
        const user = response.results.find((owner: any) => 
          owner.email?.toLowerCase() === email.toLowerCase()
        );

        if (user) {
          return {
            exists: true,
            userData: {
              hubspotUserId: user.id,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              email: user.email
            }
          };
        }
      }

      return { exists: false };
    } catch (error) {
      console.error('Error verifying user in HubSpot:', error);
      return { exists: false };
    }
  }
}

// Only create service if token is available
export const hubSpotService = process.env.HUBSPOT_ACCESS_TOKEN ? new HubSpotService() : null;