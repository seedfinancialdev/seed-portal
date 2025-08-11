import { HubSpotService } from "./hubspot";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { calculateCommission } from "@shared/commission-calculator";

interface HubSpotUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

interface HubSpotInvoice {
  id: string;
  dealId: string;
  amount: number;
  status: string;
  paidDate?: string;
  createdDate: string;
  properties: {
    [key: string]: any;
  };
}

interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    amount: string;
    closedate: string;
    dealstage: string;
    hubspot_owner_id: string;
    pipeline: string;
    [key: string]: any;
  };
}

export class HubSpotCommissionSync {
  private hubspotService: HubSpotService;

  constructor() {
    this.hubspotService = new HubSpotService();
  }
  
  /**
   * Sync sales reps from HubSpot users
   */
  async syncSalesReps(): Promise<void> {
    try {
      console.log('🔄 Syncing sales reps from HubSpot...');
      
      // Get all HubSpot users/owners using the makeRequest method
      const response = await this.hubspotService.makeRequest('/crm/v3/owners');
      
      if (!response || !response.results) {
        throw new Error('Failed to fetch HubSpot owners - no results returned');
      }
      
      const hubspotUsers = response.results;
      
      for (const hsUser of hubspotUsers) {
        if (hsUser.email && hsUser.firstName && hsUser.lastName) {
          // Check if sales rep already exists
          const existingRep = await db.execute(sql`
            SELECT id FROM sales_reps WHERE email = ${hsUser.email} LIMIT 1
          `);
          
          if (existingRep.rows.length === 0) {
            // Insert new sales rep
            await db.execute(sql`
              INSERT INTO sales_reps (
                first_name, 
                last_name, 
                email, 
                hubspot_user_id, 
                is_active, 
                created_at, 
                updated_at
              ) VALUES (
                ${hsUser.firstName},
                ${hsUser.lastName}, 
                ${hsUser.email},
                ${hsUser.id},
                true,
                NOW(),
                NOW()
              )
            `);
            
            console.log(`✅ Added sales rep: ${hsUser.firstName} ${hsUser.lastName} (${hsUser.email})`);
          } else {
            // Update existing sales rep
            await db.execute(sql`
              UPDATE sales_reps 
              SET 
                first_name = ${hsUser.firstName},
                last_name = ${hsUser.lastName},
                hubspot_user_id = ${hsUser.id},
                updated_at = NOW()
              WHERE email = ${hsUser.email}
            `);
            
            console.log(`🔄 Updated sales rep: ${hsUser.firstName} ${hsUser.lastName}`);
          }
        }
      }
      
      console.log('✅ Sales reps sync completed');
    } catch (error) {
      console.error('❌ Error syncing sales reps:', error);
      throw error;
    }
  }
  
  /**
   * Sync invoices from HubSpot with real line item data
   */
  async syncInvoices(): Promise<void> {
    try {
      console.log('🔄 Syncing invoices from HubSpot...');
      
      // Get invoices from HubSpot with line item associations
      const invoicesResponse = await this.hubspotService.makeRequest(
        '/crm/v3/objects/invoices?limit=100&properties=hs_createdate,hs_lastmodifieddate,hs_object_id,hs_invoice_amount,hs_invoice_number,hs_invoice_status&associations=line_items'
      );
      
      console.log(`📋 Found ${invoicesResponse.results.length} invoices in HubSpot`);
      
      let processedInvoices = 0;
      
      for (const invoice of invoicesResponse.results) {
        console.log(`🔍 Processing invoice ID: ${invoice.id}`);
        console.log(`📝 Invoice properties:`, JSON.stringify(invoice.properties, null, 2));
        console.log(`🔗 Invoice associations:`, JSON.stringify(invoice.associations, null, 2));
        
        // Get line items for this invoice
        const lineItemIds = invoice.associations?.['line items']?.results?.map(li => li.id) || [];
        
        if (lineItemIds.length === 0) {
          console.log(`⚠️ No line items found for invoice ${invoice.id}, skipping`);
          continue;
        }
        
        // Fetch line item details
        let totalAmount = 0;
        const lineItems = [];
        
        for (const lineItemId of lineItemIds) {
          try {
            const lineItem = await this.hubspotService.makeRequest(
              `/crm/v3/objects/line_items/${lineItemId}?properties=name,price,quantity,amount`
            );
            
            const amount = parseFloat(lineItem.properties.amount || '0');
            totalAmount += amount;
            
            lineItems.push({
              id: lineItem.id,
              name: lineItem.properties.name,
              amount: amount,
              price: parseFloat(lineItem.properties.price || '0'),
              quantity: parseInt(lineItem.properties.quantity || '1')
            });
            
            console.log(`  📦 Line item: ${lineItem.properties.name} - $${amount}`);
          } catch (error) {
            console.log(`❌ Error fetching line item ${lineItemId}:`, error);
          }
        }
        
        if (totalAmount === 0) {
          console.log(`⚠️ Invoice ${invoice.id} has $0 total, skipping`);
          continue;
        }
        
        console.log(`💰 Invoice ${invoice.id} total: $${totalAmount}`);
        
        // Check if invoice already exists in our database
        const existingInvoice = await db.execute(sql`
          SELECT id FROM hubspot_invoices WHERE hubspot_invoice_id = ${invoice.id} LIMIT 1
        `);
        
        if (existingInvoice.rows.length === 0) {
          // Create HubSpot invoice record
          const invoiceResult = await db.execute(sql`
            INSERT INTO hubspot_invoices (
              hubspot_invoice_id,
              sales_rep_id,
              invoice_number,
              status,
              total_amount,
              paid_amount,
              invoice_date,
              paid_date,
              company_name,
              is_processed_for_commission,
              created_at,
              updated_at
            ) VALUES (
              ${invoice.id},
              ${1}, -- Default to first sales rep for now
              ${`INV-${invoice.id}`},
              ${'paid'},
              ${totalAmount},
              ${totalAmount}, -- Assuming fully paid since status is paid
              ${invoice.properties.hs_createdate}::date,
              ${invoice.properties.hs_createdate}::date,
              ${`Client for Invoice ${invoice.id}`},
              false,
              NOW(),
              NOW()
            )
            RETURNING id
          `);
          
          const hubspotInvoiceId = (invoiceResult.rows[0] as any).id;
          
          // Create line item records
          for (const lineItem of lineItems) {
            await db.execute(sql`
              INSERT INTO hubspot_invoice_line_items (
                invoice_id,
                hubspot_line_item_id,
                name,
                quantity,
                unit_price,
                total_price,
                service_type,
                is_recurring,
                created_at
              ) VALUES (
                ${hubspotInvoiceId},
                ${lineItem.id},
                ${lineItem.name},
                ${lineItem.quantity},
                ${lineItem.price},
                ${lineItem.amount},
                ${this.determineServiceTypeFromName(lineItem.name)},
                ${lineItem.name.toLowerCase().includes('monthly') || lineItem.name.toLowerCase().includes('tax as a service')},
                NOW()
              )
            `);
          }
          
          console.log(`✅ Created invoice ${invoice.id} with ${lineItems.length} line items - $${totalAmount}`);
          
          // Generate commissions based on line items
          await this.generateCommissionsForInvoice(hubspotInvoiceId, 1, lineItems, invoice.properties.hs_createdate);
          
          processedInvoices++;
          
        } else {
          console.log(`🔄 Invoice ${invoice.id} already exists, skipping`);
        }
      }
      
      console.log(`✅ Invoices sync completed - processed ${processedInvoices} invoices`);
      return processedInvoices;
    } catch (error) {
      console.error('❌ Error syncing invoices:', error);
      throw error;
    }
  }
  
  /**
   * Helper methods for invoice processing
   */
  private calculateMonthlyValue(lineItems: any[]): number {
    // Look for recurring services like "Monthly Bookkeeping", "Tax as a Service"
    return lineItems
      .filter(item => item.name.toLowerCase().includes('monthly') || 
                     item.name.toLowerCase().includes('tax as a service'))
      .reduce((sum, item) => sum + item.amount, 0);
  }
  
  private calculateSetupFee(lineItems: any[]): number {
    // Look for one-time services like "Clean-Up"
    return lineItems
      .filter(item => item.name.toLowerCase().includes('clean') || 
                     item.name.toLowerCase().includes('setup') ||
                     item.name.toLowerCase().includes('catch'))
      .reduce((sum, item) => sum + item.amount, 0);
  }
  
  private determineServiceType(lineItems: any[]): string {
    const services = lineItems.map(item => item.name.toLowerCase());
    
    if (services.some(s => s.includes('bookkeeping'))) return 'bookkeeping';
    if (services.some(s => s.includes('tax'))) return 'taas';
    if (services.some(s => s.includes('payroll'))) return 'payroll';
    if (services.some(s => s.includes('ap/ar'))) return 'ap_ar_lite';
    if (services.some(s => s.includes('fp&a') || s.includes('fpa'))) return 'fpa_lite';
    
    return 'bookkeeping'; // default
  }
  
  private determineServiceTypeFromName(name: string): string {
    const serviceName = name.toLowerCase();
    
    if (serviceName.includes('clean') || serviceName.includes('catch') || serviceName.includes('setup')) return 'setup';
    if (serviceName.includes('prior') || serviceName.includes('year')) return 'prior_years';
    if (serviceName.includes('monthly') || serviceName.includes('recurring') || serviceName.includes('tax as a service')) return 'recurring';
    
    return 'setup'; // default
  }

  /**
   * Generate commission records for an invoice with line items
   */
  async generateCommissionsForInvoice(
    hubspotInvoiceId: number,
    salesRepId: number, 
    lineItems: any[],
    paidDate: string
  ): Promise<void> {
    try {
      // Calculate setup fee and monthly value from line items
      const setupFee = this.calculateSetupFee(lineItems);
      const monthlyValue = this.calculateMonthlyValue(lineItems);
      
      console.log(`💼 Processing line items for invoice ${hubspotInvoiceId}:`)
      for (const item of lineItems) {
        console.log(`  - ${item.name}: $${item.amount}`);
      }
      console.log(`📊 Setup fee: $${setupFee}, Monthly value: $${monthlyValue}`);
      
      // Generate setup commission (20% of setup fee)
      if (setupFee > 0) {
        await db.execute(sql`
          INSERT INTO commissions (
            hubspot_invoice_id,
            sales_rep_id,
            type,
            amount,
            status,
            month_number,
            service_type,
            date_earned,
            created_at,
            updated_at
          ) VALUES (
            ${hubspotInvoiceId},
            ${salesRepId},
            'setup',
            ${setupFee * 0.2},
            'paid',
            1,
            'setup',
            ${paidDate}::date,
            NOW(),
            NOW()
          )
        `);
        console.log(`✅ Setup commission: $${setupFee * 0.2} (20% of $${setupFee})`);
      }
      
      // Generate month 1 commission (40% of first month MRR)
      if (monthlyValue > 0) {
        await db.execute(sql`
          INSERT INTO commissions (
            hubspot_invoice_id,
            sales_rep_id,
            type,
            amount,
            status,
            month_number,
            service_type,
            date_earned,
            created_at,
            updated_at
          ) VALUES (
            ${hubspotInvoiceId},
            ${salesRepId},
            'month_1',
            ${monthlyValue * 0.4},
            'paid',
            1,
            'recurring',
            ${paidDate}::date,
            NOW(),
            NOW()
          )
        `);
        console.log(`✅ Month 1 commission: $${monthlyValue * 0.4} (40% of $${monthlyValue})`);
        
        // Generate residual commissions (10% for months 2-12)
        for (let month = 2; month <= 12; month++) {
          await db.execute(sql`
            INSERT INTO commissions (
              hubspot_invoice_id,
              sales_rep_id,
              type,
              amount,
              status,
              month_number,
              service_type,
              date_earned,
              created_at,
              updated_at
            ) VALUES (
              ${hubspotInvoiceId},
              ${salesRepId},
              'residual',
              ${monthlyValue * 0.1},
              'pending',
              ${month},
              'recurring',
              ${paidDate}::date + INTERVAL '${month - 1} months',
              NOW(),
              NOW()
            )
          `);
        }
        console.log(`✅ Residual commissions: $${monthlyValue * 0.1} x 11 months (10% each)`);
      }
      
      console.log(`✅ Generated all commissions for invoice ${hubspotInvoiceId}`);
    } catch (error) {
      console.error(`❌ Error generating commissions for invoice ${hubspotInvoiceId}:`, error);
      throw error;
    }
  }
  
  /**
   * Full sync process
   */
  async performFullSync(): Promise<{ salesReps: number; invoices: number; commissions: number }> {
    try {
      console.log('🚀 Starting full HubSpot commission sync...');
      
      // Sync sales reps first
      await this.syncSalesReps();
      
      // Then sync invoices and generate commissions
      const invoicesProcessed = await this.syncInvoices();
      
      // Count results
      const salesRepsCount = await db.execute(sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`);
      const invoicesCount = await db.execute(sql`SELECT COUNT(*) as count FROM hubspot_invoices`);
      const commissionsCount = await db.execute(sql`SELECT COUNT(*) as count FROM commissions`);
      
      const results = {
        salesReps: (salesRepsCount.rows[0] as any).count,
        invoices: (invoicesCount.rows[0] as any).count,
        commissions: (commissionsCount.rows[0] as any).count,
        invoicesProcessed
      };
      
      console.log('🎉 Full sync completed:', results);
      return results;
      
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      throw error;
    }
  }
}

export const hubspotSync = new HubSpotCommissionSync();