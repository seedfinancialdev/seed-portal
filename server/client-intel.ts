import OpenAI from "openai";
import { hubSpotService } from "./hubspot";
import { airtableService } from "./airtable";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ProspectProfile {
  email: string;
  companyName: string;
  industry: string;
  revenue?: string;
  employees?: number;
  lifecycleStage?: string;
  hubspotProperties: any;
  dealHistory: any[];
  recentActivities: any[];
}

interface ClientSignal {
  type: 'upsell' | 'risk' | 'opportunity';
  severity: 'Low' | 'Medium' | 'High';
  confidence: number;
  title: string;
  description: string;
  recommendedAction: string;
  estimatedValue?: string;
}

export class ClientIntelligenceEngine {
  private openai: OpenAI;
  private enhancementLocks: Set<string> = new Set(); // Track ongoing enhancements

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  
  // Generate prospect scoring based on HubSpot data
  async scoreProspect(prospectProfile: ProspectProfile): Promise<{ score: number; tier: string; reasoning: string }> {
    try {
      const prompt = `
Analyze this prospect data and provide a lead score (0-10) and tier classification:

Company: ${prospectProfile.companyName}
Industry: ${prospectProfile.industry}
Revenue: ${prospectProfile.revenue || 'Unknown'}
Employees: ${prospectProfile.employees || 'Unknown'}
Recent Activities: ${prospectProfile.recentActivities.length} interactions

Score based on:
- Company size (35% weight): Revenue and employee count
- Growth potential (25% weight): Industry and market position  
- Pain point alignment (20% weight): How well they fit Seed's services
- Engagement level (20% weight): Recent activity and responsiveness

Respond in JSON format:
{
  "score": number (0-10),
  "tier": "A" | "B" | "C",
  "reasoning": "Brief explanation of score factors"
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return {
        score: result.score || 0,
        tier: result.tier || "C",
        reasoning: result.reasoning || "Unable to analyze prospect data"
      };
    } catch (error) {
      console.error('Prospect scoring failed:', error);
      return { score: 0, tier: "C", reasoning: "Analysis failed" };
    }
  }

  // Generate pre-call snapshot for SDRs
  async generatePreCallSnapshot(prospectProfile: ProspectProfile): Promise<string> {
    try {
      const prompt = `
You are Seed Financial's SDR assistant. Create a concise pre-call snapshot (≤120 words) for this prospect:

Company: ${prospectProfile.companyName}
Industry: ${prospectProfile.industry}  
Revenue: ${prospectProfile.revenue || 'Unknown'}
Employees: ${prospectProfile.employees || 'Unknown'}
HubSpot Data: ${JSON.stringify(prospectProfile.hubspotProperties, null, 2)}

Include:
• Revenue, growth & complexity assessment
• Key pain points based on industry/size
• Top 3 conversation hooks to open the call
• Likely objections & one-line counters
• Upsell potential (0-5 scale)

Keep it punchy and actionable for the SDR.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are Seed's SDR whisperer. Stay witty, concise, and data-driven. Focus on actionable insights."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      return response.choices[0].message.content || "Unable to generate snapshot";
    } catch (error) {
      console.error('Pre-call snapshot generation failed:', error);
      return "Unable to generate pre-call snapshot. Please review prospect data manually.";
    }
  }

  // Detect service gaps and upsell opportunities
  async detectServiceGaps(clientData: any): Promise<ClientSignal[]> {
    try {
      const prompt = `
Analyze this client data to identify service gaps and upsell opportunities:

Company: ${clientData.companyName}
Current Services: ${JSON.stringify(clientData.services || [])}
Industry: ${clientData.industry}
Revenue: ${clientData.revenue}
Employees: ${clientData.employees}
HubSpot Properties: ${JSON.stringify(clientData.hubspotProperties, null, 2)}

Identify potential service gaps based on these rules:
1. Payroll missing: If revenue suggests >$50k payroll expense but no Payroll service
2. Multi-state complexity: If multi-location business without nexus compliance
3. High cash/growth: If strong financials suggest need for CFO services
4. Tax preparation: If bookkeeping client without tax services
5. Compliance gaps: Industry-specific requirements not being met

Return JSON array of signals:
[{
  "type": "upsell" | "risk" | "opportunity",
  "severity": "Low" | "Medium" | "High", 
  "confidence": 0.0-1.0,
  "title": "Brief signal title",
  "description": "What we detected",
  "recommendedAction": "Specific next step",
  "estimatedValue": "$X/month additional revenue"
}]
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4
      });

      const result = JSON.parse(response.choices[0].message.content || "[]");
      return Array.isArray(result) ? result : result.signals || [];
    } catch (error) {
      console.error('Service gap detection failed:', error);
      return [];
    }
  }

  // Extract pain points from client interactions
  async extractPainPoints(clientData: any): Promise<string[]> {
    try {
      const prompt = `
Extract key pain points from this client data:

Company: ${clientData.companyName}
Industry: ${clientData.industry}
Recent Activities: ${JSON.stringify(clientData.recentActivities || [])}
HubSpot Notes: ${JSON.stringify(clientData.hubspotProperties?.notes || [])}

Based on industry patterns and any explicit mentions, identify 3-5 key pain points.
Return as JSON array of strings: ["pain point 1", "pain point 2", ...]

Focus on operational, financial, and compliance challenges common to their industry and size.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.5
      });

      const result = JSON.parse(response.choices[0].message.content || "[]");
      return Array.isArray(result) ? result : result.painPoints || [];
    } catch (error) {
      console.error('Pain point extraction failed:', error);
      return ["Unable to analyze pain points"];
    }
  }

  // Calculate risk score based on client behavior and data
  async calculateRiskScore(clientData: any): Promise<number> {
    try {
      const prompt = `
Calculate a client risk score (0-100) based on this data:

Company: ${clientData.companyName}
Services: ${JSON.stringify(clientData.services)}
Recent Activities: ${clientData.recentActivities?.length || 0} interactions
Last Activity: ${clientData.lastActivity}
Industry: ${clientData.industry}

Risk factors to consider:
- Low engagement/communication frequency (higher risk)
- Service utilization patterns
- Payment history (if available)
- Industry volatility
- Seasonal business patterns

Return JSON: {"riskScore": 0-100, "riskFactors": ["factor1", "factor2"]}

0-20: Low risk (engaged, stable)
21-40: Low-medium risk  
41-60: Medium risk
61-80: Medium-high risk
81-100: High risk (churn likely)
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return Math.min(100, Math.max(0, result.riskScore || 50));
    } catch (error) {
      console.error('Risk score calculation failed:', error);
      return 50; // Default medium risk
    }
  }

  // Get services for a contact from HubSpot deals
  async getContactServices(contactId: string): Promise<string[]> {
    try {
      if (!hubSpotService) return [];
      
      const deals = await hubSpotService.getContactDeals(contactId);
      console.log(`Contact ${contactId} deals:`, deals.map(d => d.properties?.dealname || 'No name'));
      
      const services = hubSpotService.determineServicesFromDeals(deals);
      console.log(`Contact ${contactId} determined services:`, services);
      
      return services;
    } catch (error) {
      console.error('Error getting contact services:', error);
      return [];
    }
  }

  // Search HubSpot contacts with enriched data
  async searchHubSpotContacts(query: string, ownerEmail?: string): Promise<any[]> {
    try {
      if (!hubSpotService) {
        throw new Error("HubSpot not configured");
      }

      // Search contacts in HubSpot with owner filtering
      const contacts = await hubSpotService.searchContacts(query, ownerEmail);
      
      // Enrich each contact with additional analysis
      const enrichedContacts = await Promise.all(
        contacts.map(async (contact: any) => {
          // Fetch fresh contact data to ensure consistency
          const freshContact = hubSpotService ? await hubSpotService.getContactById(contact.id) : null;
          const contactData = freshContact || contact;

          // Auto-enhance HubSpot data if contact is a prospect with missing company association
          if (hubSpotService && contactData.properties.lifecyclestage !== 'customer') {
            await this.enhanceProspectData(contactData);
          }
          
          const prospectProfile: ProspectProfile = {
            email: contactData.properties.email,
            companyName: contactData.properties.company || 'Unknown Company',
            industry: contactData.properties.industry || null,
            revenue: contactData.properties.annualrevenue,
            employees: parseInt(contactData.properties.numemployees) || undefined,
            lifecycleStage: contactData.properties.lifecyclestage || 'lead',
            hubspotProperties: contactData.properties,
            dealHistory: [], // Would fetch from HubSpot deals API
            recentActivities: [] // Would fetch from HubSpot activities API
          };

          // Generate AI insights for each prospect
          const [scoring, painPoints, riskScore] = await Promise.all([
            this.scoreProspect(prospectProfile),
            this.extractPainPoints({ 
              companyName: prospectProfile.companyName,
              industry: prospectProfile.industry,
              hubspotProperties: prospectProfile.hubspotProperties
            }),
            this.calculateRiskScore({
              companyName: prospectProfile.companyName,
              services: [], // Would determine from HubSpot
              lastActivity: contactData.properties.lastmodifieddate,
              industry: prospectProfile.industry
            })
          ]);

          return {
            id: contact.id,
            email: prospectProfile.email,
            companyName: prospectProfile.companyName,
            industry: prospectProfile.industry,
            revenue: prospectProfile.revenue,
            employees: prospectProfile.employees,
            lifecycleStage: prospectProfile.lifecycleStage,
            services: await this.getContactServices(contact.id),
            riskScore,
            painPoints,
            upsellOpportunities: [], // Would be generated by detectServiceGaps
            lastActivity: contactData.properties.lastmodifieddate,
            scoring
          };
        })
      );

      return enrichedContacts;
    } catch (error) {
      console.error('HubSpot contact search failed:', error);
      return [];
    }
  }

  // Auto-enhance prospect data by creating missing company associations and populating fields
  private async enhanceProspectData(contact: any): Promise<void> {
    if (!hubSpotService) return;

    const contactId = contact.id;
    const companyName = contact.properties?.company;
    
    // Only proceed if contact has a company name
    if (!companyName) return;

    // Prevent duplicate enhancements for the same contact
    const lockKey = `${contactId}-${companyName}`;
    if (this.enhancementLocks.has(lockKey)) {
      console.log(`Enhancement already in progress for ${companyName} (Contact: ${contactId})`);
      return;
    }

    this.enhancementLocks.add(lockKey);

    try {
      // Check if contact already has company associations (fresh check)
      const existingCompanies = await hubSpotService.getContactAssociatedCompanies(contactId);
      if (existingCompanies.length > 0) {
        console.log(`Contact ${contactId} already has ${existingCompanies.length} company association(s)`);
        // Contact already has company associations, enhance existing company data
        for (const companyAssoc of existingCompanies) {
          await this.enhanceCompanyData(companyAssoc.toObjectId, companyName, contact);
        }
        return;
      }

      console.log(`Creating missing company association for ${companyName} (Contact: ${contactId})`);

      // Search for existing company by name first (with fresh search)
      const existingCompany = await this.findCompanyByName(companyName);
      
      let companyId: string;
      if (existingCompany) {
        companyId = existingCompany.id;
        console.log(`Found existing company: ${companyName} (${companyId})`);
      } else {
        // Create new company with enhanced data and proper ownership
        const enhancedCompanyData = await this.generateCompanyData(companyName, contact);
        
        // Set company owner to the contact's owner if available
        if (contact.properties?.hubspot_owner_id) {
          enhancedCompanyData.hubspot_owner_id = contact.properties.hubspot_owner_id;
        }
        
        const newCompany = await hubSpotService.createCompany(enhancedCompanyData);
        
        if (!newCompany) {
          console.error(`Failed to create company for ${companyName}`);
          return;
        }
        
        companyId = newCompany.id;
        console.log(`Created new company: ${companyName} (${companyId}) with owner ${contact.properties?.hubspot_owner_id || 'none'}`);
      }

      // Associate contact with company
      const associated = await hubSpotService.associateContactWithCompany(contactId, companyId);
      if (associated) {
        console.log(`Successfully associated contact ${contactId} with company ${companyId}`);
        
        // Enhance the company data with Airtable/AI-generated information
        await this.enhanceCompanyData(companyId, companyName, contact);
        
        // After enhancement, automatically generate sales insights
        console.log(`Enhanced prospect ${contactId} - ready for insights generation`);
      }
      
    } catch (error) {
      console.error('Error enhancing prospect data:', error);
    } finally {
      // Always release the lock
      this.enhancementLocks.delete(lockKey);
    }
  }

  // Find existing company by name
  private async findCompanyByName(companyName: string): Promise<any> {
    if (!hubSpotService) return null;

    try {
      const searchResult = await this.makeHubSpotRequest('/crm/v3/objects/companies/search', {
        method: 'POST',
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'name',
              operator: 'EQ',
              value: companyName
            }]
          }],
          properties: ['name', 'domain', 'industry', 'annualrevenue', 'numberofemployees'],
          limit: 1
        })
      });

      return searchResult.results?.[0] || null;
    } catch (error) {
      console.error('Error searching for company:', error);
      return null;
    }
  }

  // Generate enhanced company data prioritizing Airtable then AI
  private async generateCompanyData(companyName: string, contact: any): Promise<any> {
    try {
      console.log(`Generating enhanced data for ${companyName}`);
      
      // First priority: Check Airtable for existing enriched data using email-based search
      const contactEmail = contact.properties?.email;
      const airtableData = await airtableService.getEnrichedCompanyData(companyName, contactEmail);
      if (airtableData) {
        console.log(`✅ Found enriched data in Airtable for ${companyName}`);
        
        // Filter out invalid values that would cause HubSpot validation errors
        const cleanedData = this.sanitizeCompanyData({
          ...airtableData,
          domain: airtableData.website ? this.extractDomainFromWebsite(airtableData.website) : this.extractDomainFromCompanyName(companyName),
          country: 'US'
        });
        
        return cleanedData;
      }

      console.log(`No Airtable data found for ${companyName}, using AI generation`);

      // Second priority: Use AI to generate missing information
      const prompt = `Generate realistic business information for a company called "${companyName}". 
      Contact details: ${contact.properties?.city || 'Unknown'} city, ${contact.properties?.state || 'Unknown'} state.
      
      For industry, use ONLY these valid HubSpot values: COMPUTER_SOFTWARE, FINANCIAL_SERVICES, HEALTH_WELLNESS_FITNESS, MARKETING_ADVERTISING, CONSULTING, REAL_ESTATE, RETAIL, RESTAURANTS, ACCOUNTING, LEGAL_SERVICES, CONSTRUCTION, AUTOMOTIVE, EDUCATION_MANAGEMENT, NONPROFIT_ORGANIZATION_MANAGEMENT, INFORMATION_TECHNOLOGY_SERVICES, HUMAN_RESOURCES, INSURANCE, MANUFACTURING, TRANSPORTATION_TRUCKING_RAILROAD
      
      Provide JSON response with these fields (use null for unknown values):
      {
        "industry": "industry value from list above",
        "annualrevenue": "estimated annual revenue number only (no currency)",
        "numberofemployees": "estimated employee count number only",
        "city": "city name",
        "state": "state abbreviation", 
        "website": "likely website URL",
        "linkedin_company_page": "likely LinkedIn URL"
      }`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 300
      });

      const aiData = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate industry value
      const validIndustries = [
        'COMPUTER_SOFTWARE', 'FINANCIAL_SERVICES', 'HEALTH_WELLNESS_FITNESS', 
        'MARKETING_ADVERTISING', 'CONSULTING', 'REAL_ESTATE', 'RETAIL', 
        'RESTAURANTS', 'ACCOUNTING', 'LEGAL_SERVICES', 'CONSTRUCTION', 
        'AUTOMOTIVE', 'EDUCATION_MANAGEMENT', 'NONPROFIT_ORGANIZATION_MANAGEMENT',
        'INFORMATION_TECHNOLOGY_SERVICES', 'HUMAN_RESOURCES', 'INSURANCE', 
        'MANUFACTURING', 'TRANSPORTATION_TRUCKING_RAILROAD'
      ];
      
      const validatedIndustry = validIndustries.includes(aiData.industry) 
        ? aiData.industry 
        : 'COMPUTER_SOFTWARE';
      
      if (aiData.industry && !validIndustries.includes(aiData.industry)) {
        console.log(`AI generated invalid industry "${aiData.industry}" for ${companyName}, using COMPUTER_SOFTWARE`);
      }
      
      const enhancedData = this.sanitizeCompanyData({
        name: companyName,
        domain: aiData.website ? this.extractDomainFromWebsite(aiData.website) : this.extractDomainFromCompanyName(companyName),
        city: aiData.city || contact.properties?.city,
        state: aiData.state || contact.properties?.state,
        country: 'US',
        industry: validatedIndustry,
        annualrevenue: aiData.annualrevenue?.toString(),
        numberofemployees: aiData.numberofemployees?.toString(),
        website: aiData.website,
        linkedin_company_page: aiData.linkedin_company_page
      });

      // Store the AI-generated data in Airtable for future use
      await airtableService.createCompanyRecord(enhancedData);
      
      return enhancedData;
    } catch (error) {
      console.error('Error generating company data:', error);
      // Fallback to basic data
      return {
        name: companyName,
        city: contact.properties?.city,
        state: contact.properties?.state,
        country: 'US'
      };
    }
  }

  // Extract likely domain from company name
  private extractDomainFromCompanyName(companyName: string): string {
    // Simple domain extraction logic
    const cleanName = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .replace(/(inc|llc|corp|ltd|company|co)$/g, '');
    
    return `${cleanName}.com`;
  }

  // Extract domain from website URL
  private extractDomainFromWebsite(website: string): string {
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`);
      return url.hostname.replace('www.', '');
    } catch {
      return website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    }
  }

  // Clean company data to remove invalid values that would cause HubSpot validation errors
  private sanitizeCompanyData(data: any): any {
    const invalidValues = ['Not found', 'not found', 'N/A', 'n/a', 'null', 'undefined', '', null, undefined];
    
    const cleanedData: any = {};
    
    // Always include required name field
    cleanedData.name = data.name;
    
    // Only include other fields if they have valid values
    Object.keys(data).forEach(key => {
      if (key === 'name') return; // Already handled
      
      const value = data[key];
      
      // Skip invalid values
      if (invalidValues.includes(value) || 
          (typeof value === 'string' && invalidValues.includes(value.toLowerCase().trim()))) {
        return;
      }
      
      // Special validation for domain - must be valid domain format
      if (key === 'domain' && typeof value === 'string') {
        if (value.includes('Not found') || value.includes('not found') || !value.includes('.')) {
          return; // Skip invalid domains
        }
      }
      
      // Special validation for website - must be valid URL format
      if (key === 'website' && typeof value === 'string') {
        if (value.includes('Not found') || value.includes('not found')) {
          return; // Skip invalid websites
        }
      }
      
      // Include valid values
      cleanedData[key] = value;
    });
    
    console.log(`Sanitized company data for ${data.name}:`, Object.keys(cleanedData).join(', '));
    return cleanedData;
  }

  // Enhance existing company data with missing fields
  private async enhanceCompanyData(companyId: string, companyName: string, contact: any): Promise<void> {
    if (!hubSpotService) return;

    try {
      // Get current company data
      const company = await hubSpotService.getCompanyById(companyId);
      if (!company) return;

      const props = company.properties || {};
      const updates: any = {};

      // Check which fields are missing and need enhancement
      const fieldsToEnhance = [
        'annualrevenue', 'city', 'numberofemployees', 'industry',
        'linkedin_company_page', 'website', 'state', 'zip'
      ];

      const missingFields = fieldsToEnhance.filter(field => !props[field] || props[field] === '');

      if (missingFields.length === 0) {
        console.log(`Company ${companyName} already has complete data`);
        return;
      }

      console.log(`Enhancing ${missingFields.length} missing fields for ${companyName}: ${missingFields.join(', ')}`);

      // Generate missing data using AI with proper HubSpot industry values
      const prompt = `Fill in missing business information for "${companyName}".
      Current data: ${JSON.stringify(props)}
      Missing fields: ${missingFields.join(', ')}
      Contact location: ${contact.properties?.city || 'Unknown'}, ${contact.properties?.state || 'Unknown'}
      
      For industry field, use ONLY these HubSpot values: COMPUTER_SOFTWARE, FINANCIAL_SERVICES, HEALTH_WELLNESS_FITNESS, MARKETING_ADVERTISING, CONSULTING, REAL_ESTATE, RETAIL, RESTAURANTS, ACCOUNTING, LEGAL_SERVICES, CONSTRUCTION, AUTOMOTIVE, EDUCATION_MANAGEMENT, NONPROFIT_ORGANIZATION_MANAGEMENT, INFORMATION_TECHNOLOGY_SERVICES, HUMAN_RESOURCES, INSURANCE, MANUFACTURING, TRANSPORTATION_TRUCKING_RAILROAD
      
      Provide JSON with only the missing fields (use null if truly unknown):
      {
        ${missingFields.map(field => `"${field}": "value or null"`).join(',\n        ')}
      }`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 200
      });

      const enhancedData = JSON.parse(response.choices[0].message.content || '{}');

      // Only update fields that have actual values (not null) and validate industry
      for (const field of missingFields) {
        if (enhancedData[field] && enhancedData[field] !== 'null' && enhancedData[field] !== null) {
          if (field === 'industry') {
            // Validate industry against known HubSpot values
            const validIndustries = [
              'COMPUTER_SOFTWARE', 'FINANCIAL_SERVICES', 'HEALTH_WELLNESS_FITNESS', 
              'MARKETING_ADVERTISING', 'CONSULTING', 'REAL_ESTATE', 'RETAIL', 
              'RESTAURANTS', 'ACCOUNTING', 'LEGAL_SERVICES', 'CONSTRUCTION', 
              'AUTOMOTIVE', 'EDUCATION_MANAGEMENT', 'NONPROFIT_ORGANIZATION_MANAGEMENT',
              'INFORMATION_TECHNOLOGY_SERVICES', 'HUMAN_RESOURCES', 'INSURANCE', 
              'MANUFACTURING', 'TRANSPORTATION_TRUCKING_RAILROAD'
            ];
            
            if (validIndustries.includes(enhancedData[field])) {
              updates[field] = enhancedData[field];
            } else {
              console.log(`Skipping invalid industry value: ${enhancedData[field]}`);
              // Use default safe industry value
              updates[field] = 'COMPUTER_SOFTWARE';
            }
          } else {
            updates[field] = enhancedData[field];
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        try {
          await hubSpotService.updateCompany(companyId, updates);
          console.log(`Enhanced company ${companyName} with: ${Object.keys(updates).join(', ')}`);
        } catch (error) {
          console.error(`Failed to update company ${companyName}:`, error);
          // Try again without industry field if that was the issue
          if (updates.industry) {
            delete updates.industry;
            if (Object.keys(updates).length > 0) {
              await hubSpotService.updateCompany(companyId, updates);
              console.log(`Enhanced company ${companyName} (without industry) with: ${Object.keys(updates).join(', ')}`);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error enhancing company data:', error);
    }
  }

  // Helper method to make HubSpot requests
  private async makeHubSpotRequest(endpoint: string, options?: any) {
    if (!hubSpotService) throw new Error('HubSpot service not available');
    
    const url = `https://api.hubapi.com${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options?.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`HubSpot API error for ${endpoint}:`, error);
      throw error;
    }
  }
}

export const clientIntelEngine = new ClientIntelligenceEngine();