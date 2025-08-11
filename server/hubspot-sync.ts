import { hubSpotService } from "./hubspot";
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
  
  /**
   * Sync sales reps from HubSpot users
   */
  async syncSalesReps(): Promise<void> {
    try {
      console.log('🔄 Syncing sales reps from HubSpot...');
      
      // Get all HubSpot users/owners
      const response = await hubSpotService.crm.owners.getAll();
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
   * Sync deals from HubSpot
   */
  async syncDeals(): Promise<void> {
    try {
      console.log('🔄 Syncing deals from HubSpot...');
      
      // Get closed won deals from the last 12 months
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const deals = await hubSpotService.crm.deals.getAll({
        properties: [
          'dealname', 
          'amount', 
          'closedate', 
          'dealstage', 
          'hubspot_owner_id',
          'pipeline',
          'hs_object_id'
        ],
        limit: 100
      });
      
      for (const hsDeal of deals.results) {
        const props = hsDeal.properties;
        
        // Only process closed won deals with valid data
        if (props.dealstage === 'closedwon' && props.amount && props.closedate && props.hubspot_owner_id) {
          
          // Find corresponding sales rep
          const salesRepResult = await db.execute(sql`
            SELECT id FROM sales_reps WHERE hubspot_user_id = ${props.hubspot_owner_id} LIMIT 1
          `);
          
          if (salesRepResult.rows.length > 0) {
            const salesRepId = (salesRepResult.rows[0] as any).id;
            
            // Check if deal already exists
            const existingDeal = await db.execute(sql`
              SELECT id FROM deals WHERE hubspot_deal_id = ${hsDeal.id} LIMIT 1
            `);
            
            if (existingDeal.rows.length === 0) {
              // Insert new deal
              await db.execute(sql`
                INSERT INTO deals (
                  hubspot_deal_id,
                  deal_name,
                  amount,
                  monthly_value,
                  setup_fee,
                  close_date,
                  deal_stage,
                  sales_rep_id,
                  company_name,
                  service_type,
                  is_collected,
                  created_at,
                  updated_at
                ) VALUES (
                  ${hsDeal.id},
                  ${props.dealname || 'Untitled Deal'},
                  ${parseFloat(props.amount)},
                  ${parseFloat(props.amount) * 0.8}, -- Estimate monthly recurring
                  ${parseFloat(props.amount) * 0.2}, -- Estimate setup fee  
                  ${props.closedate}::date,
                  ${props.dealstage},
                  ${salesRepId},
                  ${props.dealname?.split(' - ')[0] || 'Unknown Company'}, -- Extract company from deal name
                  'bookkeeping', -- Default service type
                  true, -- Assume collected since it's closed won
                  NOW(),
                  NOW()
                )
              `);
              
              console.log(`✅ Added deal: ${props.dealname} - $${props.amount}`);
              
              // Generate commissions for this deal
              await this.generateCommissionsForDeal(hsDeal.id, salesRepId, parseFloat(props.amount), props.closedate);
            }
          } else {
            console.log(`⚠️ No sales rep found for HubSpot owner ID: ${props.hubspot_owner_id}`);
          }
        }
      }
      
      console.log('✅ Deals sync completed');
    } catch (error) {
      console.error('❌ Error syncing deals:', error);
      throw error;
    }
  }
  
  /**
   * Generate commission records for a deal
   */
  async generateCommissionsForDeal(
    hubspotDealId: string, 
    salesRepId: number, 
    dealAmount: number, 
    closeDate: string
  ): Promise<void> {
    try {
      // Get deal from database
      const dealResult = await db.execute(sql`
        SELECT id, monthly_value, setup_fee FROM deals WHERE hubspot_deal_id = ${hubspotDealId} LIMIT 1
      `);
      
      if (dealResult.rows.length === 0) return;
      
      const deal = dealResult.rows[0] as any;
      const monthlyValue = deal.monthly_value || dealAmount * 0.8;
      const setupFee = deal.setup_fee || dealAmount * 0.2;
      
      // Generate setup/onetime commission (20% of setup fee)
      await db.execute(sql`
        INSERT INTO commissions (
          deal_id,
          sales_rep_id,
          commission_type,
          commission_amount,
          is_paid,
          month_number,
          rate,
          base_amount,
          created_at,
          updated_at
        ) VALUES (
          ${deal.id},
          ${salesRepId},
          'setup',
          ${setupFee * 0.2},
          true, -- Assume paid since deal is closed won
          1,
          0.2,
          ${setupFee},
          ${closeDate}::date,
          NOW()
        )
      `);
      
      // Generate month 1 commission (40% of first month MRR)
      await db.execute(sql`
        INSERT INTO commissions (
          deal_id,
          sales_rep_id,
          commission_type,
          commission_amount,
          is_paid,
          month_number,
          rate,
          base_amount,
          created_at,
          updated_at
        ) VALUES (
          ${deal.id},
          ${salesRepId},
          'month_1',
          ${monthlyValue * 0.4},
          true, -- Assume paid
          1,
          0.4,
          ${monthlyValue},
          ${closeDate}::date,
          NOW()
        )
      `);
      
      // Generate residual commissions (10% for months 2-12)
      for (let month = 2; month <= 12; month++) {
        await db.execute(sql`
          INSERT INTO commissions (
            deal_id,
            sales_rep_id,
            commission_type,
            commission_amount,
            is_paid,
            month_number,
            rate,
            base_amount,
            created_at,
            updated_at
          ) VALUES (
            ${deal.id},
            ${salesRepId},
            'residual',
            ${monthlyValue * 0.1},
            false, -- Future residuals not yet paid
            ${month},
            0.1,
            ${monthlyValue},
            ${closeDate}::date + INTERVAL '${month - 1} months',
            NOW()
          )
        `);
      }
      
      console.log(`✅ Generated commissions for deal ${hubspotDealId}`);
    } catch (error) {
      console.error(`❌ Error generating commissions for deal ${hubspotDealId}:`, error);
      throw error;
    }
  }
  
  /**
   * Full sync process
   */
  async performFullSync(): Promise<{ salesReps: number; deals: number; commissions: number }> {
    try {
      console.log('🚀 Starting full HubSpot commission sync...');
      
      // Sync sales reps first
      await this.syncSalesReps();
      
      // Then sync deals and generate commissions
      await this.syncDeals();
      
      // Count results
      const salesRepsCount = await db.execute(sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`);
      const dealsCount = await db.execute(sql`SELECT COUNT(*) as count FROM deals`);
      const commissionsCount = await db.execute(sql`SELECT COUNT(*) as count FROM commissions`);
      
      const results = {
        salesReps: (salesRepsCount.rows[0] as any).count,
        deals: (dealsCount.rows[0] as any).count,
        commissions: (commissionsCount.rows[0] as any).count
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