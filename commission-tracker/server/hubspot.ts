import { Client } from "@hubspot/api-client";
import { DatabaseStorage } from "./storage.js";
import { Deal } from "../shared/schema.js";
import { calculateCommissions, generateCommissionRecords } from "../shared/commission-calculator.js";

const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
const storage = new DatabaseStorage();

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    amount: string;
    dealstage: string;
    closedate?: string;
    hubspot_owner_id: string;
    // Custom properties for commission tracking
    monthly_recurring_revenue?: string;
    setup_fee?: string;
    first_payment_received_date?: string;
  };
}

/**
 * Sync deals from HubSpot and calculate commissions
 */
export async function syncDealsFromHubSpot(): Promise<void> {
  try {
    console.log('Starting HubSpot deal sync...');
    
    // Get all deals from HubSpot
    const dealsResponse = await hubspotClient.crm.deals.getAll({
      properties: [
        'dealname',
        'amount', 
        'dealstage',
        'closedate',
        'hubspot_owner_id',
        'monthly_recurring_revenue',
        'setup_fee',
        'first_payment_received_date'
      ],
      limit: 100
    });

    for (const hubspotDeal of dealsResponse.results) {
      await processDeal(hubspotDeal as HubSpotDeal);
    }

    console.log(`Processed ${dealsResponse.results.length} deals from HubSpot`);
  } catch (error) {
    console.error('Error syncing deals from HubSpot:', error);
    throw error;
  }
}

/**
 * Process individual deal and create/update commissions
 */
async function processDeal(hubspotDeal: HubSpotDeal): Promise<void> {
  try {
    // Check if deal already exists in our database
    let existingDeal = await storage.getDealByHubSpotId(hubspotDeal.id);
    
    // Get sales rep by HubSpot owner ID
    const salesReps = await storage.getAllSalesReps();
    const salesRep = salesReps.find(rep => rep.hubspotUserId === hubspotDeal.properties.hubspot_owner_id);
    
    if (!salesRep) {
      console.log(`Sales rep not found for HubSpot owner ID: ${hubspotDeal.properties.hubspot_owner_id}`);
      return;
    }

    const dealData = {
      hubspotDealId: hubspotDeal.id,
      dealName: hubspotDeal.properties.dealname || 'Untitled Deal',
      clientEmail: '', // Will need to get from associated contact
      companyName: '', // Will need to get from associated company
      salesRepId: salesRep.id,
      monthlyValue: hubspotDeal.properties.monthly_recurring_revenue || hubspotDeal.properties.amount || '0',
      setupFee: hubspotDeal.properties.setup_fee || '0',
      dealStage: hubspotDeal.properties.dealstage || 'Unknown',
      closeDate: hubspotDeal.properties.closedate || null,
      firstPaymentDate: hubspotDeal.properties.first_payment_received_date || null,
      isRecurring: true
    };

    // Create or update deal
    if (!existingDeal) {
      existingDeal = await storage.createDeal(dealData);
      console.log(`Created new deal: ${dealData.dealName}`);
    } else {
      existingDeal = await storage.updateDeal(existingDeal.id, dealData);
      console.log(`Updated existing deal: ${dealData.dealName}`);
    }

    // Generate commissions if deal is closed won and has first payment date
    if (dealData.dealStage === 'Closed Won' && dealData.firstPaymentDate) {
      await generateCommissionsForDeal(existingDeal);
    }

  } catch (error) {
    console.error(`Error processing deal ${hubspotDeal.id}:`, error);
  }
}

/**
 * Generate commission records for a closed deal
 */
async function generateCommissionsForDeal(deal: Deal): Promise<void> {
  try {
    // Check if commissions already exist for this deal
    const existingCommissions = await storage.getCommissionsBySalesRep(deal.salesRepId);
    const dealCommissions = existingCommissions.filter(c => c.dealId === deal.id);
    
    if (dealCommissions.length > 0) {
      console.log(`Commissions already exist for deal ${deal.id}`);
      return;
    }

    if (!deal.firstPaymentDate) {
      console.log(`No first payment date for deal ${deal.id}, skipping commission generation`);
      return;
    }

    // Calculate commissions
    const calculation = calculateCommissions(deal, new Date(deal.firstPaymentDate));
    const commissionRecords = generateCommissionRecords(calculation, new Date(deal.firstPaymentDate));

    // Insert commission records
    await storage.createMultipleCommissions(commissionRecords);
    console.log(`Generated ${commissionRecords.length} commission records for deal ${deal.id}`);

    // Check for monthly and milestone bonuses
    await checkAndCreateBonuses(deal.salesRepId, new Date(deal.closeDate!));

  } catch (error) {
    console.error(`Error generating commissions for deal ${deal.id}:`, error);
  }
}

/**
 * Check for and create monthly/milestone bonuses
 */
async function checkAndCreateBonuses(salesRepId: number, closeDate: Date): Promise<void> {
  try {
    const year = closeDate.getFullYear();
    const month = closeDate.getMonth() + 1;
    
    // Get deals closed this month
    const monthlyDeals = await storage.getClosedDealsInMonth(salesRepId, year, month);
    const clientsClosedThisMonth = monthlyDeals.length;

    // Check monthly bonus eligibility
    const bonusMonth = `${year}-${month.toString().padStart(2, '0')}-01`;
    const existingMonthlyBonus = await storage.getMonthlyBonus(salesRepId, bonusMonth);

    if (!existingMonthlyBonus && clientsClosedThisMonth >= 5) {
      let bonusType: string;
      let bonusAmount: number;

      if (clientsClosedThisMonth >= 15) {
        bonusType = '15_clients';
        bonusAmount = 1500;
      } else if (clientsClosedThisMonth >= 10) {
        bonusType = '10_clients';
        bonusAmount = 1000;
      } else {
        bonusType = '5_clients';
        bonusAmount = 500;
      }

      await storage.createMonthlyBonus({
        salesRepId,
        bonusMonth,
        clientsClosed: clientsClosedThisMonth,
        bonusType,
        bonusAmount: bonusAmount.toString(),
        rewardChosen: null, // To be selected by rep
        isPaid: false,
        paidDate: null
      });

      console.log(`Created monthly bonus for sales rep ${salesRepId}: ${bonusType}`);
    }

    // Check milestone bonus eligibility
    const totalClientsClosed = await storage.getTotalClientsClosedBySalesRep(salesRepId);
    const milestones = [
      { threshold: 25, type: '25_clients', amount: 1000 },
      { threshold: 40, type: '40_clients', amount: 5000 },
      { threshold: 60, type: '60_clients', amount: 7500 },
      { threshold: 100, type: '100_clients', amount: 10000 }
    ];

    for (const milestone of milestones) {
      if (totalClientsClosed >= milestone.threshold) {
        const hasBonus = await storage.hasMilestoneBonus(salesRepId, milestone.type);
        
        if (!hasBonus) {
          await storage.createMilestoneBonus({
            salesRepId,
            milestoneType: milestone.type,
            clientsAtMilestone: totalClientsClosed,
            bonusAmount: milestone.amount.toString(),
            achievedDate: closeDate.toISOString().split('T')[0],
            isPaid: false,
            paidDate: null,
            equityOffered: milestone.type === '100_clients'
          });

          console.log(`Created milestone bonus for sales rep ${salesRepId}: ${milestone.type}`);
        }
      }
    }

  } catch (error) {
    console.error(`Error checking bonuses for sales rep ${salesRepId}:`, error);
  }
}

/**
 * Get contact information from HubSpot deal
 */
export async function getDealContactInfo(dealId: string): Promise<{ email: string; companyName: string }> {
  try {
    // Get associated contacts
    const contactAssociations = await hubspotClient.crm.deals.associationsApi.getAll(
      dealId,
      'contacts'
    );

    let email = '';
    let companyName = '';

    if (contactAssociations.results.length > 0) {
      const contactId = contactAssociations.results[0].id;
      const contact = await hubspotClient.crm.contacts.basicApi.getById(contactId, ['email']);
      email = contact.properties.email || '';
    }

    // Get associated company
    const companyAssociations = await hubspotClient.crm.deals.associationsApi.getAll(
      dealId,
      'companies'
    );

    if (companyAssociations.results.length > 0) {
      const companyId = companyAssociations.results[0].id;
      const company = await hubspotClient.crm.companies.basicApi.getById(companyId, ['name']);
      companyName = company.properties.name || '';
    }

    return { email, companyName };
  } catch (error) {
    console.error(`Error getting contact info for deal ${dealId}:`, error);
    return { email: '', companyName: '' };
  }
}

export { hubspotClient };