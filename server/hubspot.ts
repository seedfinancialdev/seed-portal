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

      const dealBody = {
        properties: {
          dealname: dealName,
          dealstage: 'appointmentscheduled', // Using a more standard deal stage
          amount: totalAmount,
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
          dealstage: result.properties?.dealstage || 'appointmentscheduled',
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
      // Just update the deal with quote information - simpler and more reliable
      console.log('Updating deal with quote information...');
      await this.updateDealWithQuote(dealId, companyName, monthlyFee, setupFee);
      
      return {
        id: `deal_${dealId}`,
        title: `${companyName} - Bookkeeping Quote`
      };
    } catch (error) {
      console.error('Error updating deal with quote info:', error);
      return null;
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
}

// Only create service if token is available
export const hubSpotService = process.env.HUBSPOT_ACCESS_TOKEN ? new HubSpotService() : null;