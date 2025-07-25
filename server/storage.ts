import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '../shared/schema.js';
import { 
  salesReps, 
  deals, 
  commissions, 
  monthlyBonuses, 
  milestoneBonuses, 
  commissionAdjustments,
  type SalesRep,
  type Deal,
  type Commission,
  type MonthlyBonus,
  type MilestoneBonus,
  type CommissionAdjustment,
  type InsertSalesRep,
  type InsertDeal,
  type InsertCommission,
  type InsertMonthlyBonus,
  type InsertMilestoneBonus,
  type InsertCommissionAdjustment,
} from '../shared/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql_client = neon(DATABASE_URL);
const db = drizzle(sql_client, { schema });

export class DatabaseStorage {
  // Sales Rep operations
  async createSalesRep(data: Omit<InsertSalesRep, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalesRep> {
    const [rep] = await db.insert(salesReps).values(data).returning();
    return rep;
  }

  async getSalesRepById(id: number): Promise<SalesRep | undefined> {
    return await db.query.salesReps.findFirst({
      where: eq(salesReps.id, id),
    });
  }

  async getSalesRepByEmail(email: string): Promise<SalesRep | undefined> {
    return await db.query.salesReps.findFirst({
      where: eq(salesReps.email, email),
    });
  }

  async getAllSalesReps(): Promise<SalesRep[]> {
    return await db.query.salesReps.findMany({
      where: eq(salesReps.isActive, true),
      orderBy: [salesReps.firstName, salesReps.lastName],
    });
  }

  // Deal operations
  async createDeal(data: Omit<InsertDeal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
    const [deal] = await db.insert(deals).values(data).returning();
    return deal;
  }

  async updateDeal(id: number, data: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [deal] = await db.update(deals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return deal;
  }

  async getDealsByRep(salesRepId: number): Promise<Deal[]> {
    return await db.query.deals.findMany({
      where: eq(deals.salesRepId, salesRepId),
      orderBy: desc(deals.closeDate),
    });
  }

  async getDealByHubSpotId(hubspotDealId: string): Promise<Deal | undefined> {
    return await db.query.deals.findFirst({
      where: eq(deals.hubspotDealId, hubspotDealId),
    });
  }

  // Commission operations
  async createCommission(data: Omit<InsertCommission, 'id' | 'createdAt'>): Promise<Commission> {
    const [commission] = await db.insert(commissions).values(data).returning();
    return commission;
  }

  async getCommissionsByRep(salesRepId: number): Promise<Commission[]> {
    return await db.query.commissions.findMany({
      where: eq(commissions.salesRepId, salesRepId),
      orderBy: desc(commissions.createdAt),
    });
  }

  async getCommissionsByDeal(dealId: number): Promise<Commission[]> {
    return await db.query.commissions.findMany({
      where: eq(commissions.dealId, dealId),
      orderBy: [commissions.commissionType, commissions.monthNumber],
    });
  }

  async updateCommissionPaidStatus(id: number, isPaid: boolean, paidAt?: Date): Promise<Commission | undefined> {
    const [commission] = await db.update(commissions)
      .set({ isPaid, paidAt: paidAt || (isPaid ? new Date() : undefined) })
      .where(eq(commissions.id, id))
      .returning();
    return commission;
  }

  // Monthly bonus operations
  async createMonthlyBonus(data: Omit<InsertMonthlyBonus, 'id' | 'createdAt'>): Promise<MonthlyBonus> {
    const [bonus] = await db.insert(monthlyBonuses).values(data).returning();
    return bonus;
  }

  async getMonthlyBonusesByRep(salesRepId: number): Promise<MonthlyBonus[]> {
    return await db.query.monthlyBonuses.findMany({
      where: eq(monthlyBonuses.salesRepId, salesRepId),
      orderBy: [desc(monthlyBonuses.year), desc(monthlyBonuses.month)],
    });
  }

  async getMonthlyBonus(salesRepId: number, month: number, year: number): Promise<MonthlyBonus | undefined> {
    return await db.query.monthlyBonuses.findFirst({
      where: and(
        eq(monthlyBonuses.salesRepId, salesRepId),
        eq(monthlyBonuses.month, month),
        eq(monthlyBonuses.year, year)
      ),
    });
  }

  // Milestone bonus operations
  async createMilestoneBonus(data: Omit<InsertMilestoneBonus, 'id'>): Promise<MilestoneBonus> {
    const [bonus] = await db.insert(milestoneBonuses).values(data).returning();
    return bonus;
  }

  async getMilestoneBonusesByRep(salesRepId: number): Promise<MilestoneBonus[]> {
    return await db.query.milestoneBonuses.findMany({
      where: eq(milestoneBonuses.salesRepId, salesRepId),
      orderBy: desc(milestoneBonuses.achievedAt),
    });
  }

  // Commission adjustment operations
  async createCommissionAdjustment(data: Omit<InsertCommissionAdjustment, 'id'>): Promise<CommissionAdjustment> {
    const [adjustment] = await db.insert(commissionAdjustments).values(data).returning();
    return adjustment;
  }

  async getCommissionAdjustmentsByRep(salesRepId: number): Promise<CommissionAdjustment[]> {
    return await db.query.commissionAdjustments.findMany({
      where: eq(commissionAdjustments.salesRepId, salesRepId),
      orderBy: desc(commissionAdjustments.approvedAt),
    });
  }

  // Dashboard analytics
  async getRepDashboardStats(salesRepId: number): Promise<{
    totalEarnings: number;
    thisMonthEarnings: number;
    totalClients: number;
    thisMonthClients: number;
    unpaidCommissions: number;
    nextMilestone: { threshold: number; current: number; bonusAmount: number };
  }> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Get total earnings
    const totalEarningsResult = await db
      .select({ 
        sum: sql<number>`COALESCE(SUM(${commissions.commissionAmount}), 0)` 
      })
      .from(commissions)
      .where(and(
        eq(commissions.salesRepId, salesRepId),
        eq(commissions.isPaid, true)
      ));

    // Get this month's earnings
    const thisMonthEarningsResult = await db
      .select({ 
        sum: sql<number>`COALESCE(SUM(${commissions.commissionAmount}), 0)` 
      })
      .from(commissions)
      .where(and(
        eq(commissions.salesRepId, salesRepId),
        eq(commissions.isPaid, true),
        sql`EXTRACT(YEAR FROM ${commissions.createdAt}) = ${currentYear}`,
        sql`EXTRACT(MONTH FROM ${commissions.createdAt}) = ${currentMonth}`
      ));

    // Get total clients
    const totalClientsResult = await db
      .select({ 
        count: sql<number>`COUNT(DISTINCT ${deals.id})` 
      })
      .from(deals)
      .where(eq(deals.salesRepId, salesRepId));

    // Get this month's clients
    const thisMonthClientsResult = await db
      .select({ 
        count: sql<number>`COUNT(DISTINCT ${deals.id})` 
      })
      .from(deals)
      .where(and(
        eq(deals.salesRepId, salesRepId),
        sql`EXTRACT(YEAR FROM ${deals.closeDate}) = ${currentYear}`,
        sql`EXTRACT(MONTH FROM ${deals.closeDate}) = ${currentMonth}`
      ));

    // Get unpaid commissions
    const unpaidCommissionsResult = await db
      .select({ 
        sum: sql<number>`COALESCE(SUM(${commissions.commissionAmount}), 0)` 
      })
      .from(commissions)
      .where(and(
        eq(commissions.salesRepId, salesRepId),
        eq(commissions.isPaid, false)
      ));

    const totalEarnings = totalEarningsResult[0]?.sum || 0;
    const thisMonthEarnings = thisMonthEarningsResult[0]?.sum || 0;
    const totalClients = totalClientsResult[0]?.count || 0;
    const thisMonthClients = thisMonthClientsResult[0]?.count || 0;
    const unpaidCommissions = unpaidCommissionsResult[0]?.sum || 0;

    // Calculate next milestone
    const milestones = [25, 40, 60, 100];
    const nextThreshold = milestones.find(m => totalClients < m) || 100;
    const bonusAmounts = { 25: 1000, 40: 5000, 60: 7500, 100: 10000 };
    const bonusAmount = bonusAmounts[nextThreshold as keyof typeof bonusAmounts] || 0;

    return {
      totalEarnings,
      thisMonthEarnings,
      totalClients,
      thisMonthClients,
      unpaidCommissions,
      nextMilestone: {
        threshold: nextThreshold,
        current: totalClients,
        bonusAmount,
      },
    };
  }
}

export const storage = new DatabaseStorage();