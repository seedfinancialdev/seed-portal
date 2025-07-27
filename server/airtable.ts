import Airtable from 'airtable';

interface AirtableRecord {
  id: string;
  fields: {
    'Company Name'?: string;
    'Industry'?: string;
    'Annual Revenue'?: number;
    'Employee Count'?: number;
    'Website'?: string;
    'LinkedIn'?: string;
    'City'?: string;
    'State'?: string;
    'Postal Code'?: string;
    'Phone'?: string;
    'Description'?: string;
    'Founded Year'?: number;
    'Technology Stack'?: string[];
    'Business Model'?: string;
    'Target Market'?: string;
    'Key Contacts'?: string[];
    'Last Updated'?: string;
  };
}

export class AirtableService {
  private base: any;
  private tableName: string = 'Companies'; // Default table name
  
  constructor() {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      console.warn('Airtable configuration missing - data enhancement will use AI only');
      return;
    }
    
    console.log('Initializing Airtable service with provided credentials');
    this.base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);
  }

  // Search for company record by name
  async findCompanyByName(companyName: string): Promise<AirtableRecord | null> {
    if (!this.base) {
      console.log('Airtable base not initialized - using AI fallback');
      return null;
    }

    try {
      console.log(`🔍 Searching Airtable for company: ${companyName}`);
      const records = await this.base(this.tableName)
        .select({
          filterByFormula: `SEARCH("${companyName.toLowerCase()}", LOWER({Company Name})) > 0`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length > 0) {
        console.log(`✅ Found Airtable record for ${companyName}`);
        return {
          id: records[0].id,
          fields: records[0].fields
        };
      } else {
        console.log(`❌ No Airtable record found for ${companyName}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Airtable search error:', error.message);
      return null;
    }
  }

  // Get enriched company data from Airtable
  async getEnrichedCompanyData(companyName: string): Promise<any> {
    const record = await this.findCompanyByName(companyName);
    if (!record) return null;

    const fields = record.fields;
    
    // Map Airtable fields to HubSpot field names
    return {
      name: fields['Company Name'] || companyName,
      industry: this.mapToHubSpotIndustry(fields['Industry']),
      annualrevenue: fields['Annual Revenue']?.toString(),
      numberofemployees: fields['Employee Count']?.toString(),
      website: fields['Website'],
      linkedin_company_page: fields['LinkedIn'],
      city: fields['City'],
      state: fields['State'],
      zip: fields['Postal Code'],
      phone: fields['Phone'],
      description: fields['Description'],
      founded_year: fields['Founded Year']?.toString(),
      web_technologies: fields['Technology Stack']?.join(', '),
      business_model: fields['Business Model'],
      target_market: fields['Target Market'],
      airtable_id: record.id,
      last_enriched: new Date().toISOString()
    };
  }

  // Map Airtable industry values to valid HubSpot industry values
  private mapToHubSpotIndustry(airtableIndustry?: string): string | undefined {
    if (!airtableIndustry) return undefined;
    
    const industryMap: { [key: string]: string } = {
      'software': 'COMPUTER_SOFTWARE',
      'technology': 'COMPUTER_SOFTWARE',
      'tech': 'COMPUTER_SOFTWARE',
      'saas': 'COMPUTER_SOFTWARE',
      'fintech': 'FINANCIAL_SERVICES',
      'finance': 'FINANCIAL_SERVICES',
      'banking': 'FINANCIAL_SERVICES',
      'healthcare': 'HEALTH_WELLNESS_FITNESS',
      'health': 'HEALTH_WELLNESS_FITNESS',
      'medical': 'MEDICAL_PRACTICE',
      'dental': 'MEDICAL_PRACTICE',
      'marketing': 'MARKETING_ADVERTISING',
      'advertising': 'MARKETING_ADVERTISING',
      'consulting': 'CONSULTING',
      'real estate': 'REAL_ESTATE',
      'realestate': 'REAL_ESTATE',
      'retail': 'RETAIL',
      'restaurant': 'RESTAURANTS',
      'food': 'RESTAURANTS',
      'accounting': 'ACCOUNTING',
      'legal': 'LEGAL_SERVICES',
      'law': 'LEGAL_SERVICES',
      'construction': 'CONSTRUCTION',
      'automotive': 'AUTOMOTIVE',
      'education': 'EDUCATION_MANAGEMENT',
      'nonprofit': 'NONPROFIT_ORGANIZATION_MANAGEMENT',
      'it': 'INFORMATION_TECHNOLOGY_SERVICES',
      'hr': 'HUMAN_RESOURCES',
      'insurance': 'INSURANCE',
      'manufacturing': 'MANUFACTURING',
      'transportation': 'TRANSPORTATION_TRUCKING_RAILROAD',
      'logistics': 'TRANSPORTATION_TRUCKING_RAILROAD'
    };

    const normalized = airtableIndustry.toLowerCase().trim();
    
    // Direct match
    if (industryMap[normalized]) {
      return industryMap[normalized];
    }
    
    // Partial match
    for (const [key, value] of Object.entries(industryMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    
    // Default fallback
    return 'COMPUTER_SOFTWARE';
  }

  // Create new company record in Airtable
  async createCompanyRecord(companyData: any): Promise<string | null> {
    if (!this.base) {
      console.log('Airtable base not initialized - skipping record creation');
      return null;
    }

    try {
      console.log(`💾 Creating Airtable record for ${companyData.name}`);
      const record = await this.base(this.tableName).create([
        {
          fields: {
            'Company Name': companyData.name,
            'Industry': companyData.industry,
            'Annual Revenue': companyData.annualrevenue ? parseInt(companyData.annualrevenue) : undefined,
            'Employee Count': companyData.numberofemployees ? parseInt(companyData.numberofemployees) : undefined,
            'Website': companyData.website,
            'LinkedIn': companyData.linkedin_company_page,
            'City': companyData.city,
            'State': companyData.state,
            'Postal Code': companyData.zip,
            'Last Updated': new Date().toISOString()
          }
        }
      ]);

      console.log(`✅ Created Airtable record: ${record[0].id}`);
      return record[0].id;
    } catch (error) {
      console.error('❌ Airtable creation error:', error.message);
      return null;
    }
  }

  // Update existing company record
  async updateCompanyRecord(recordId: string, updates: any): Promise<boolean> {
    if (!this.base) return false;

    try {
      await this.base(this.tableName).update([
        {
          id: recordId,
          fields: {
            ...updates,
            'Last Updated': new Date().toISOString()
          }
        }
      ]);
      return true;
    } catch (error) {
      console.error('Error updating Airtable record:', error);
      return false;
    }
  }
}

// Export singleton instance
export const airtableService = new AirtableService();