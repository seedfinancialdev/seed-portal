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
      throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
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
          dealstage: 'qualifiedtobuy',
          amount: totalAmount,
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
          }
        ]
      };

      const result = await this.makeRequest('/crm/v3/objects/deals', {
        method: 'POST',
        body: JSON.stringify(dealBody)
      });
      
      return {
        id: result.id,
        properties: {
          dealname: result.properties?.dealname || dealName,
          dealstage: result.properties?.dealstage || 'qualifiedtobuy',
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
      // For simplicity, we'll create a basic deal note instead of a complex quote
      // This ensures compatibility and reduces API complexity
      const note = `Quote for ${companyName}:
- Monthly Fee: $${monthlyFee.toLocaleString()}
- Setup Fee: $${setupFee.toLocaleString()}
- Total Annual Value: $${(monthlyFee * 12 + setupFee).toLocaleString()}
- Generated: ${new Date().toLocaleDateString()}`;

      const noteBody = {
        properties: {
          hs_note_body: note,
          hs_attachment_ids: '',
        },
        associations: [
          {
            to: { id: dealId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }]
          }
        ]
      };

      const result = await this.makeRequest('/crm/v3/objects/notes', {
        method: 'POST',
        body: JSON.stringify(noteBody)
      });

      return {
        id: result.id,
        title: `${companyName} - Bookkeeping Quote`
      };
    } catch (error) {
      console.error('Error creating quote note in HubSpot:', error);
      return null;
    }
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