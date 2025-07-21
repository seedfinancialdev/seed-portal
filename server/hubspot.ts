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

  async createDeal(contactId: string, companyName: string, monthlyFee: number, setupFee: number): Promise<HubSpotDeal | null> {
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

  async createQuote(dealId: string, companyName: string, monthlyFee: number, setupFee: number): Promise<{ id: string; title: string } | null> {
    try {
      // Create a proper HubSpot quote using the quotes API
      console.log('Creating HubSpot quote...');
      
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
          hs_sender_company_name: 'Seed Financial',
          hs_sender_company_address: 'Austin, TX',
          hs_sender_firstname: 'Seed Financial',
          hs_sender_lastname: 'Team',
          hs_sender_email: 'hello@seedfinancial.io',
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
      // Create monthly service line item
      const monthlyLineItem = {
        properties: {
          name: 'Monthly Bookkeeping (Custom)',
          description: 'Ongoing monthly bookkeeping and accounting services including bank reconciliation, AP/AR management, financial statement preparation, and QuickBooks maintenance',
          price: monthlyFee.toString(),
          quantity: '12', // 12 months
        },
        associations: [
          {
            to: { id: quoteId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 69 }] // Line item to quote association
          }
        ]
      };

      const monthlyLineItemResult = await this.makeRequest(`/crm/v3/objects/line_items`, {
        method: 'POST',
        body: JSON.stringify(monthlyLineItem)
      });

      console.log('Monthly line item created:', monthlyLineItemResult.id);

      // Create setup fee line item if there is one
      if (setupFee > 0) {
        const setupLineItem = {
          properties: {
            name: 'Clean-Up / Catch-Up Project',
            description: 'Initial setup and historical cleanup of accounting records to prepare for ongoing bookkeeping services',
            price: setupFee.toString(),
            quantity: '1',
          },
          associations: [
            {
              to: { id: quoteId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 69 }] // Line item to quote association
            }
          ]
        };

        const setupLineItemResult = await this.makeRequest(`/crm/v3/objects/line_items`, {
          method: 'POST',
          body: JSON.stringify(setupLineItem)
        });

        console.log('Setup line item created:', setupLineItemResult.id);
      }
    } catch (error) {
      console.warn('Could not add line items to quote:', error);
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