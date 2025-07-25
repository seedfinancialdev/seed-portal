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

    // Handle empty responses (like 204 No Content from DELETE requests)
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    if (response.status === 204 || contentLength === '0' || !contentType?.includes('application/json')) {
      return null; // Return null for empty responses
    }
    
    return response.json();
  }

  async getUserProfile(email: string): Promise<{ firstName?: string; lastName?: string; companyName?: string; companyAddress?: string; companyAddress2?: string; companyCity?: string; companyState?: string; companyZip?: string; companyCountry?: string } | null> {
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
          companyAddress: brandingInfo?.companyAddress || 'Austin, TX',
          companyAddress2: brandingInfo?.companyAddress2,
          companyCity: brandingInfo?.companyCity,
          companyState: brandingInfo?.companyState,
          companyZip: brandingInfo?.companyZip,
          companyCountry: brandingInfo?.companyCountry
        };
      }
      
      // If not found in owners, try contacts
      const contact = await this.verifyContactByEmail(email);
      if (contact.verified && contact.contact) {
        return {
          firstName: contact.contact.properties?.firstname,
          lastName: contact.contact.properties?.lastname,
          companyName: brandingInfo?.companyName || 'Seed Financial',
          companyAddress: brandingInfo?.companyAddress || 'Austin, TX',
          companyAddress2: brandingInfo?.companyAddress2,
          companyCity: brandingInfo?.companyCity,
          companyState: brandingInfo?.companyState,
          companyZip: brandingInfo?.companyZip,
          companyCountry: brandingInfo?.companyCountry
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async getCompanyBranding(): Promise<{ companyName?: string; companyAddress?: string; companyAddress2?: string; companyCity?: string; companyState?: string; companyZip?: string; companyCountry?: string } | null> {
    try {
      // Try to get account info first
      const accountInfo = await this.makeRequest('/integrations/v1/me');
      
      if (accountInfo && accountInfo.portalId) {
        // Search for your own company in HubSpot companies
        try {
          const companySearchBody = {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: 'domain',
                    operator: 'EQ',
                    value: 'seedfinancial.io'
                  }
                ]
              }
            ],
            properties: ['name', 'domain', 'address', 'address2', 'city', 'state', 'zip', 'country']
          };

          const companyResult = await this.makeRequest('/crm/v3/objects/companies/search', {
            method: 'POST',
            body: JSON.stringify(companySearchBody)
          });

          if (companyResult.results && companyResult.results.length > 0) {
            const company = companyResult.results[0];
            const props = company.properties;
            
            // Build full address string
            let fullAddress = '';
            if (props.address) fullAddress += props.address;
            if (props.address2) fullAddress += (fullAddress ? ', ' : '') + props.address2;
            if (props.city) fullAddress += (fullAddress ? ', ' : '') + props.city;
            if (props.state) fullAddress += (fullAddress ? ', ' : '') + props.state;
            if (props.zip) fullAddress += (fullAddress ? ' ' : '') + props.zip;
            if (props.country) fullAddress += (fullAddress ? ', ' : '') + props.country;
            
            // Check if this is actually the correct Seed Financial company
            // If not, force the correct address
            if (fullAddress.includes('Nepal') || fullAddress.includes('Kathmandu')) {
              console.log('Found Nepal address, forcing correct Seed Financial address');
              return {
                companyName: 'Seed Financial',
                companyAddress: '4136 Del Rey Ave, Ste 521, Marina Del Rey, CA 90292',
                companyAddress2: 'Ste 521',
                companyCity: 'Marina Del Rey',
                companyState: 'CA',
                companyZip: '90292',
                companyCountry: 'US'
              };
            }
            
            return {
              companyName: props.name || 'Seed Financial',
              companyAddress: fullAddress || '4136 Del Rey Ave, Ste 521, Marina Del Rey, CA 90292',
              companyAddress2: props.address2,
              companyCity: props.city,
              companyState: props.state,
              companyZip: props.zip,
              companyCountry: props.country
            };
          }
        } catch (companyError) {
          console.log('Could not fetch company details, using defaults:', (companyError as Error).message);
        }
        
        // Fallback to correct Seed Financial address
        return {
          companyName: 'Seed Financial',
          companyAddress: '4136 Del Rey Ave, Ste 521, Marina Del Rey, CA 90292',
          companyAddress2: 'Ste 521',
          companyCity: 'Marina Del Rey',
          companyState: 'CA',
          companyZip: '90292',
          companyCountry: 'US'
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

  async createDeal(contactId: string, companyName: string, monthlyFee: number, setupFee: number, ownerId?: string, includesBookkeeping?: boolean, includesTaas?: boolean): Promise<HubSpotDeal | null> {
    try {
      // Generate dynamic deal name based on services
      let serviceName = '';
      if (includesBookkeeping && includesTaas) {
        serviceName = 'Bookkeeping + TaaS';
      } else if (includesTaas) {
        serviceName = 'TaaS';
      } else {
        serviceName = 'Bookkeeping';
      }
      const dealName = `${companyName} - ${serviceName}`;
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

  async createQuote(dealId: string, companyName: string, monthlyFee: number, setupFee: number, userEmail: string, firstName: string, lastName: string, includesBookkeeping?: boolean, includesTaas?: boolean, taasMonthlyFee?: number, taasPriorYearsFee?: number, bookkeepingMonthlyFee?: number, bookkeepingSetupFee?: number): Promise<{ id: string; title: string } | null> {
    try {
      // Create a proper HubSpot quote using the quotes API
      console.log('Creating HubSpot quote...');
      
      // Get the user's profile information from HubSpot
      const userProfile = await this.getUserProfile(userEmail);
      
      // Generate dynamic quote name based on services
      let serviceName = '';
      if (includesBookkeeping && includesTaas) {
        serviceName = 'Bookkeeping + TaaS Services';
      } else if (includesTaas) {
        serviceName = 'TaaS Services';
      } else {
        serviceName = 'Bookkeeping Services';
      }
      const quoteName = `${companyName} - ${serviceName} Quote`;
      
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
          hs_sender_company_address: userProfile?.companyAddress || '4136 Del Rey Ave, Ste 521, Marina Del Rey, CA 90292',
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
      await this.addQuoteLineItems(result.id, monthlyFee, setupFee, includesBookkeeping, includesTaas, taasMonthlyFee || 0, taasPriorYearsFee || 0, bookkeepingMonthlyFee, bookkeepingSetupFee);

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

  private async addQuoteLineItems(quoteId: string, monthlyFee: number, setupFee: number, includesBookkeeping?: boolean, includesTaas?: boolean, taasMonthlyFee?: number, taasPriorYearsFee?: number, bookkeepingMonthlyFee?: number, bookkeepingSetupFee?: number): Promise<void> {
    try {
      // Use the generic service management system for initial quote creation
      await this.createInitialServiceLineItems(quoteId, {
        includesBookkeeping: includesBookkeeping ?? true,
        includesTaas: includesTaas ?? false,
        taasMonthlyFee: taasMonthlyFee || 0,
        taasPriorYearsFee: taasPriorYearsFee || 0,
        bookkeepingMonthlyFee: bookkeepingMonthlyFee || monthlyFee,
        bookkeepingSetupFee: bookkeepingSetupFee || setupFee
      });
    } catch (error) {
      console.warn('Could not add line items to quote:', error);
    }
  }

  private async createInitialServiceLineItems(quoteId: string, serviceConfig: {
    includesBookkeeping: boolean;
    includesTaas: boolean;
    taasMonthlyFee: number;
    taasPriorYearsFee: number;
    bookkeepingMonthlyFee: number;
    bookkeepingSetupFee: number;
  }): Promise<void> {
    try {
      // Define all services in a consistent pattern
      const serviceDefinitions = {
        bookkeeping: {
          shouldInclude: serviceConfig.includesBookkeeping,
          lineItems: [
            {
              condition: serviceConfig.bookkeepingMonthlyFee > 0,
              name: 'Monthly Bookkeeping (Custom)',
              price: serviceConfig.bookkeepingMonthlyFee,
              productId: '25687054003',
              description: 'Seed Financial Monthly Bookkeeping (Custom)'
            },
            {
              condition: serviceConfig.bookkeepingSetupFee > 0,
              name: 'Clean-Up / Catch-Up Project',
              price: serviceConfig.bookkeepingSetupFee,
              productId: '25683750263',
              description: 'Seed Financial Clean-Up / Catch-Up Project'
            }
          ]
        },
        taas: {
          shouldInclude: serviceConfig.includesTaas && (serviceConfig.taasMonthlyFee > 0 || serviceConfig.taasPriorYearsFee > 0),
          lineItems: [
            {
              condition: serviceConfig.taasMonthlyFee > 0,
              name: 'Monthly TaaS (Custom)',
              price: serviceConfig.taasMonthlyFee,
              productId: '25687054003', // Using bookkeeping product ID as placeholder
              description: 'Seed Financial Monthly TaaS (Custom)'
            },
            {
              condition: serviceConfig.taasPriorYearsFee > 0,
              name: 'TaaS Prior Years (Custom)',
              price: serviceConfig.taasPriorYearsFee,
              productId: '25683750263', // Using cleanup product ID as placeholder
              description: 'Seed Financial TaaS Prior Years (Custom)'
            }
          ]
        }
        // Future services can be easily added here:
        // payroll: {
        //   shouldInclude: serviceConfig.includesPayroll,
        //   lineItems: [...]
        // }
      };

      // Create line items for all included services
      for (const [serviceName, config] of Object.entries(serviceDefinitions)) {
        if (config.shouldInclude) {
          for (const lineItemConfig of config.lineItems) {
            if (lineItemConfig.condition) {
              await this.associateProductWithQuote(
                quoteId,
                lineItemConfig.productId,
                lineItemConfig.price,
                1,
                lineItemConfig.name
              );
              console.log(`Associated ${serviceName} product with quote: $${lineItemConfig.price}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error creating initial service line items:', error);
      throw error;
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

  private async associateProductWithQuote(quoteId: string, productId: string, price: number, quantity: number, customName?: string): Promise<void> {
    try {
      // Get product details first
      const product = await this.makeRequest(`/crm/v3/objects/products/${productId}`);
      
      // Create a line item with correct properties
      const lineItem = {
        properties: {
          name: customName || product.properties?.name || 'Service',
          price: price.toString(),
          quantity: quantity.toString(),
          hs_product_id: productId,
          hs_sku: product.properties?.hs_sku || productId,
          description: customName ? `Seed Financial ${customName}` : (product.properties?.description || '')
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

  async updateQuote(quoteId: string, companyName: string, monthlyFee: number, setupFee: number, includesBookkeeping?: boolean, includesTaas?: boolean, taasMonthlyFee?: number, taasPriorYearsFee?: number, bookkeepingMonthlyFee?: number, bookkeepingSetupFee?: number, dealId?: string): Promise<boolean> {
    try {
      // First check if the quote still exists and is in a valid state
      const quoteCheck = await this.makeRequest(`/crm/v3/objects/quotes/${quoteId}`, {
        method: 'GET'
      });

      if (!quoteCheck || quoteCheck.properties?.hs_status === 'EXPIRED') {
        console.log(`Quote ${quoteId} is expired or not found`);
        return false;
      }

      // Update the quote title with correct service combination
      let serviceType = 'Services';
      if (includesBookkeeping && includesTaas) {
        serviceType = 'Bookkeeping + TaaS';
      } else if (includesTaas) {
        serviceType = 'TaaS';
      } else {
        serviceType = 'Bookkeeping Services';
      }
      
      const updatedTitle = `${companyName} - ${serviceType} Quote (Updated ${new Date().toLocaleDateString()})`;
      
      const updateBody = {
        properties: {
          hs_title: updatedTitle
        }
      };

      await this.makeRequest(`/crm/v3/objects/quotes/${quoteId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateBody)
      });
      
      console.log(`Updated quote title to: ${updatedTitle}`);

      // Get associated line items for this quote
      const lineItemsResponse = await this.makeRequest(`/crm/v4/objects/quotes/${quoteId}/associations/line_items`, {
        method: 'GET'
      });

      // Collect existing line items for service management
      const existingLineItems: any[] = [];
      
      if (lineItemsResponse && lineItemsResponse.results && lineItemsResponse.results.length > 0) {
        console.log(`Found ${lineItemsResponse.results.length} line items to update`);
        
        for (const lineItemAssociation of lineItemsResponse.results) {
          const lineItemId = lineItemAssociation.toObjectId;
          
          // Get the line item details to determine if it's monthly or setup
          const lineItemDetails = await this.makeRequest(`/crm/v3/objects/line_items/${lineItemId}`, {
            method: 'GET'
          });
          
          if (lineItemDetails && lineItemDetails.properties) {
            // Add to existing line items for service management
            existingLineItems.push({
              id: lineItemId,
              properties: lineItemDetails.properties
            });
            
            const productId = lineItemDetails.properties.hs_product_id;
            const lineItemName = lineItemDetails.properties.name || '';
            let newPrice;
            
            // Determine which price to use based on product ID and custom name
            if (productId === '25687054003') {
              if (lineItemName.includes('TaaS Monthly')) {
                // TaaS Monthly line item
                newPrice = taasMonthlyFee || 0;
                console.log(`Updating TaaS monthly line item ${lineItemId} to $${newPrice}`);
              } else {
                // Regular bookkeeping monthly line item
                newPrice = bookkeepingMonthlyFee !== undefined ? bookkeepingMonthlyFee : (monthlyFee - (taasMonthlyFee || 0));
                console.log(`Updating bookkeeping monthly line item ${lineItemId} to $${newPrice}`);
              }
            } else if (productId === '25683750263') {
              if (lineItemName.includes('TaaS Prior Years')) {
                // TaaS Prior Years line item
                newPrice = taasPriorYearsFee || 0;
                console.log(`Updating TaaS prior years line item ${lineItemId} to $${newPrice}`);
              } else {
                // Regular bookkeeping setup/cleanup line item
                newPrice = bookkeepingSetupFee !== undefined ? bookkeepingSetupFee : (setupFee - (taasPriorYearsFee || 0));
                console.log(`Updating bookkeeping setup line item ${lineItemId} to $${newPrice}`);
              }
            } else {
              console.log(`Unknown product ID ${productId} for line item ${lineItemId}, skipping`);
              continue;
            }
            
            // Update the line item price
            const lineItemUpdateBody = {
              properties: {
                price: newPrice.toString()
              }
            };
            
            await this.makeRequest(`/crm/v3/objects/line_items/${lineItemId}`, {
              method: 'PATCH',
              body: JSON.stringify(lineItemUpdateBody)
            });
            
            console.log(`Successfully updated line item ${lineItemId} price to $${newPrice}`);
          }
        }
      }

      // Refresh line items list after price updates for accurate duplicate detection
      const refreshedLineItemsResponse = await this.makeRequest(`/crm/v4/objects/quotes/${quoteId}/associations/line_items`, {
        method: 'GET'
      });

      const refreshedLineItems: any[] = [];
      if (refreshedLineItemsResponse && refreshedLineItemsResponse.results && refreshedLineItemsResponse.results.length > 0) {
        console.log(`Refreshing ${refreshedLineItemsResponse.results.length} line items for accurate duplicate detection`);
        for (const lineItemAssociation of refreshedLineItemsResponse.results) {
          const lineItemId = lineItemAssociation.toObjectId;
          const lineItemDetails = await this.makeRequest(`/crm/v3/objects/line_items/${lineItemId}`, {
            method: 'GET'
          });
          
          console.log(`Raw line item response for ${lineItemId}:`, JSON.stringify(lineItemDetails, null, 2));
          
          if (lineItemDetails && lineItemDetails.properties) {
            refreshedLineItems.push({
              id: lineItemId,
              properties: lineItemDetails.properties
            });
            console.log(`Refreshed line item: ${lineItemId} - ${lineItemDetails.properties.name || lineItemDetails.properties.hs_line_item_currency_code} - $${lineItemDetails.properties.price || lineItemDetails.properties.amount}`);
          }
        }
      }
      console.log(`Total refreshed line items: ${refreshedLineItems.length}`);
      console.log('Refreshed line items:', refreshedLineItems.map(item => `${item.properties.name} ($${item.properties.price})`));

      // Handle service-specific line items based on quote configuration
      await this.manageServiceLineItems(quoteId, refreshedLineItems, {
        includesBookkeeping: includesBookkeeping ?? false,
        includesTaas: includesTaas ?? false,
        taasMonthlyFee: taasMonthlyFee || 0,
        taasPriorYearsFee: taasPriorYearsFee || 0,
        bookkeepingMonthlyFee: bookkeepingMonthlyFee || 0,
        bookkeepingSetupFee: bookkeepingSetupFee || 0
      });

      // Update the associated deal amount and name
      let actualDealId = dealId;
      if (!actualDealId) {
        // Get deal ID from quote associations if not provided
        const dealAssociations = await this.makeRequest(`/crm/v4/objects/quotes/${quoteId}/associations/deals`, {
          method: 'GET'
        });
        if (dealAssociations && dealAssociations.results && dealAssociations.results.length > 0) {
          actualDealId = dealAssociations.results[0].toObjectId;
        }
      }

      if (actualDealId) {
        // Calculate total amount including all TaaS fees
        const totalMonthlyAmount = monthlyFee * 12;
        const totalSetupAmount = setupFee;
        const totalAmount = totalMonthlyAmount + totalSetupAmount;
        
        // Update deal name based on services
        let dealName = `${companyName} - Services`;
        if (includesBookkeeping && includesTaas) {
          dealName = `${companyName} - Bookkeeping + TaaS`;
        } else if (includesTaas) {
          dealName = `${companyName} - TaaS`;
        } else {
          dealName = `${companyName} - Bookkeeping`;
        }
        
        console.log(`Updating deal ${actualDealId} amount to $${totalAmount} (Monthly: $${monthlyFee} x 12 + Setup: $${setupFee})`);
        console.log(`TaaS breakdown - Monthly: $${taasMonthlyFee || 0}, Prior Years: $${taasPriorYearsFee || 0}`);
        
        // Update the deal amount and name
        const dealUpdateBody = {
          properties: {
            amount: totalAmount.toString(),
            dealname: dealName
          }
        };
        
        await this.makeRequest(`/crm/v3/objects/deals/${actualDealId}`, {
          method: 'PATCH',
          body: JSON.stringify(dealUpdateBody)
        });
        
        console.log(`Successfully updated deal ${actualDealId} amount to $${totalAmount} and name to "${dealName}"`);
      }

      console.log(`Quote ${quoteId}, line items, and deal amount updated successfully`);
      return true;
    } catch (error: any) {
      console.error('Error updating quote in HubSpot:', error);
      
      // If quote is not found or expired, return false to trigger new quote creation
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.log(`Quote ${quoteId} not found or expired, will need to create new quote`);
        return false;
      }
      
      return false;
    }
  }

  private async manageServiceLineItems(quoteId: string, existingLineItems: any[], serviceConfig: {
    includesBookkeeping: boolean;
    includesTaas: boolean;
    taasMonthlyFee: number;
    taasPriorYearsFee: number;
    bookkeepingMonthlyFee: number;
    bookkeepingSetupFee: number;
  }): Promise<void> {
    try {
      console.log(`Managing line items for quote ${quoteId} - Bookkeeping: ${serviceConfig.includesBookkeeping}, TaaS: ${serviceConfig.includesTaas}`);
      
      // Define what line items should exist based on current service configuration
      const requiredLineItems = new Map<string, any>();
      
      // Add bookkeeping line items if service is included
      if (serviceConfig.includesBookkeeping) {
        if (serviceConfig.bookkeepingMonthlyFee > 0) {
          requiredLineItems.set('bookkeeping_monthly', {
            name: 'Monthly Bookkeeping (Custom)',
            price: serviceConfig.bookkeepingMonthlyFee,
            productId: '25687054003',
            description: 'Seed Financial Monthly Bookkeeping (Custom)',
            identifiers: ['Monthly Bookkeeping']
          });
        }
        if (serviceConfig.bookkeepingSetupFee > 0) {
          requiredLineItems.set('bookkeeping_setup', {
            name: 'Clean-Up / Catch-Up Project',
            price: serviceConfig.bookkeepingSetupFee,
            productId: '25683750263',
            description: 'Seed Financial Clean-Up / Catch-Up Project',
            identifiers: ['Clean-Up', 'Catch-Up Project']
          });
        }
      }
      
      // Add TaaS line items if service is included
      if (serviceConfig.includesTaas) {
        if (serviceConfig.taasMonthlyFee > 0) {
          requiredLineItems.set('taas_monthly', {
            name: 'Monthly TaaS (Custom)',
            price: serviceConfig.taasMonthlyFee,
            productId: '26203849099',  // Tax as a Service product ID
            description: 'Seed Financial Monthly TaaS (Custom)',
            identifiers: ['Monthly TaaS', 'TaaS (Custom)']
          });
        }
        if (serviceConfig.taasPriorYearsFee > 0) {
          requiredLineItems.set('taas_setup', {
            name: 'TaaS Prior Years (Custom)',
            price: serviceConfig.taasPriorYearsFee,
            productId: '26354718811',  // Prior Years Tax Filing product ID
            description: 'Seed Financial TaaS Prior Years (Custom)',
            identifiers: ['TaaS Prior Years', 'Prior Years (Custom)']
          });
        }
      }
      
      // Step 1: Remove line items that shouldn't exist anymore
      const itemsToDelete = [];
      for (const existingItem of existingLineItems) {
        const productId = existingItem.properties?.hs_product_id || '';
        const amount = parseFloat(existingItem.properties?.amount || '0');
        let shouldKeep = false;
        
        // Check if this item matches any required line item by product ID
        for (const [key, requiredItem] of Array.from(requiredLineItems.entries())) {
          if (productId === requiredItem.productId) {
            shouldKeep = true;
            break;
          }
        }
        
        // Remove any line items that don't match required services OR have $0 amounts (ghost items)
        if (!shouldKeep || amount === 0) {
          // Only delete service-related items (our known product IDs)
          const isServiceItem = ['25687054003', '25683750263', '26203849099', '26354718811'].includes(productId);
          
          if (isServiceItem) {
            itemsToDelete.push(existingItem);
            console.log(`Marking line item ${existingItem.id} (product ${productId}, amount $${amount}) for deletion - shouldKeep: ${shouldKeep}, amount: ${amount}`);
          }
        }
      }
      
      // Delete unnecessary items
      for (const item of itemsToDelete) {
        console.log(`Deleting unnecessary line item: ${item.id} (product ${item.properties?.hs_product_id}, amount $${item.properties?.amount})`);
        try {
          await this.makeRequest(`/crm/v3/objects/line_items/${item.id}`, {
            method: 'DELETE'
          });
          console.log(`Successfully deleted line item: ${item.id}`);
        } catch (error) {
          console.error(`Failed to delete line item ${item.id}:`, error);
          // Continue with other deletions even if one fails
        }
      }
      
      // Step 2: Update existing line items or create missing ones
      console.log(`Processing line items. Required: ${requiredLineItems.size}`);
      for (const [key, requiredItem] of Array.from(requiredLineItems.entries())) {
        let existingItem = null;
        console.log(`Processing ${key} (${requiredItem.name})...`);
        
        // Check if this item already exists by product ID (regardless of amount)
        for (const item of existingLineItems) {
          const itemProductId = item.properties?.hs_product_id || '';
          if (itemProductId === requiredItem.productId) {
            existingItem = item;
            break;
          }
        }
        
        if (existingItem) {
          const currentAmount = parseFloat(existingItem.properties?.amount || '0');
          const requiredAmount = parseFloat(requiredItem.price.toString());
          
          if (Math.abs(currentAmount - requiredAmount) >= 0.01) {
            // Update existing line item with new amount
            console.log(`Updating existing line item ${existingItem.id}: Product ID ${requiredItem.productId}, $${currentAmount} → $${requiredAmount}`);
            await this.makeRequest(`/crm/v3/objects/line_items/${existingItem.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                properties: {
                  amount: requiredAmount.toString()
                }
              })
            });
            console.log(`✓ Updated existing line item: ${existingItem.id} to $${requiredAmount}`);
          } else {
            console.log(`✓ Existing line item already correct: Product ID ${requiredItem.productId}, Amount $${currentAmount}`);
          }
        } else {
          // Create new line item
          console.log(`Creating missing line item: ${requiredItem.name} - $${requiredItem.price}`);
          
          const lineItem = await this.makeRequest('/crm/v3/objects/line_items', {
            method: 'POST',
            body: JSON.stringify({
              properties: {
                name: requiredItem.name,
                price: requiredItem.price.toString(),
                quantity: '1',
                hs_product_id: requiredItem.productId,
                hs_sku: requiredItem.productId,
                description: requiredItem.description
              }
            })
          });

          if (lineItem && lineItem.id) {
            await this.makeRequest(`/crm/v4/associations/quotes/line_items/batch/create`, {
              method: 'POST',
              body: JSON.stringify({
                inputs: [{
                  from: { id: quoteId },
                  to: { id: lineItem.id },
                  types: [{
                    associationCategory: "HUBSPOT_DEFINED",
                    associationTypeId: 67
                  }]
                }]
              })
            });
            console.log(`Successfully added line item: ${requiredItem.name} - $${requiredItem.price}`);
          }
        }
      }
      
      console.log(`Line item management completed for quote ${quoteId}`);
    } catch (error) {
      console.error('Error managing service line items:', error);
      throw error;
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