import OpenAI from "openai";
import { hubSpotService } from "./hubspot";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ProspectProfile {
  email: string;
  companyName: string;
  industry: string;
  revenue?: string;
  employees?: number;
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
  async searchHubSpotContacts(query: string): Promise<any[]> {
    try {
      if (!hubSpotService) {
        throw new Error("HubSpot not configured");
      }

      // Search contacts in HubSpot
      const contacts = await hubSpotService.searchContacts(query);
      
      // Enrich each contact with additional analysis
      const enrichedContacts = await Promise.all(
        contacts.map(async (contact: any) => {
          const prospectProfile: ProspectProfile = {
            email: contact.properties.email,
            companyName: contact.properties.company || 'Unknown Company',
            industry: contact.properties.industry || 'Unknown',
            revenue: contact.properties.annualrevenue,
            employees: parseInt(contact.properties.numemployees) || undefined,
            hubspotProperties: contact.properties,
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
              lastActivity: contact.properties.lastmodifieddate,
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
            services: await this.getContactServices(contact.id),
            riskScore,
            painPoints,
            upsellOpportunities: [], // Would be generated by detectServiceGaps
            lastActivity: contact.properties.lastmodifieddate,
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
}

export const clientIntelEngine = new ClientIntelligenceEngine();