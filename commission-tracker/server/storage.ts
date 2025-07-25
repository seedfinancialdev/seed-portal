import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import * as schema from "../shared/schema.js";
import type { 
  SalesRep, Deal, Commission, MonthlyBonus, MilestoneBonus, CommissionAdjustment,
  InsertSalesRep, InsertDeal, InsertCommission, InsertMonthlyBonus, 
  InsertMilestoneBonus, InsertCommissionAdjustment 
} from "../shared/schema.js";

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

export class DatabaseStorage {
  // Sales Rep Management
  async createSalesRep(data: InsertSalesRep): Promise<SalesRep> {
    const [salesRep] = await db.insert(schema.salesReps).values(data).returning();
    return salesRep;
  }

  async getSalesRepById(id: number): Promise<SalesRep | null> {
    const [salesRep] = await db.select().from(schema.salesReps).where(eq(schema.salesReps.id, id));
    return salesRep || null;
  }

  async getSalesRepByEmail(email: string): Promise<SalesRep | null> {
    const [salesRep] = await db.select().from(schema.salesReps).where(eq(schema.salesReps.email, email));
    return salesRep || null;
  }

  async getAllSalesReps(): Promise<SalesRep[]> {
    return await db.select().from(schema.salesReps).where(eq(schema.salesReps.isActive, true));
  }

  // Deal Management
  async createDeal(data: InsertDeal): Promise<Deal> {
    const [deal] = await db.insert(schema.deals).values(data).returning();
    return deal;
  }

  async getDealById(id: number): Promise<Deal | null> {
    const [deal] = await db.select().from(schema.deals).where(eq(schema.deals.id, id));
    return deal || null;
  }

  async getDealByHubSpotId(hubspotDealId: string): Promise<Deal | null> {
    const [deal] = await db.select().from(schema.deals).where(eq(schema.deals.hubspotDealId, hubspotDealId));
    return deal || null;
  }

  async getDealsBySalesRep(salesRepId: number): Promise<Deal[]> {
    return await db.select().from(schema.deals)
      .where(eq(schema.deals.salesRepId, salesRepId))
      .orderBy(desc(schema.deals.closeDate));
  }

  async getClosedDealsInMonth(salesRepId: number, year: number, month: number): Promise<Deal[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    return await db.select().from(schema.deals)
      .where(and(
        eq(schema.deals.salesRepId, salesRepId),
        eq(schema.deals.dealStage, 'Closed Won'),
        gte(schema.deals.closeDate, startDate),
        lte(schema.deals.closeDate, endDate)
      ));
  }

  async updateDeal(id: number, data: Partial<InsertDeal>): Promise<Deal> {
    const [deal] = await db.update(schema.deals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.deals.id, id))
      .returning();
    return deal;
  }

  // Commission Management
  async createCommission(data: InsertCommission): Promise<Commission> {
    const [commission] = await db.insert(schema.commissions).values(data).returning();
    return commission;
  }

  async createMultipleCommissions(data: InsertCommission[]): Promise<Commission[]> {
    return await db.insert(schema.commissions).values(data).returning();
  }

  async getCommissionsBySalesRep(salesRepId: number): Promise<Commission[]> {
    return await db.select().from(schema.commissions)
      .where(eq(schema.commissions.salesRepId, salesRepId))
      .orderBy(desc(schema.commissions.paymentMonth));
  }

  async getCommissionsForMonth(salesRepId: number, paymentMonth: string): Promise<Commission[]> {
    return await db.select().from(schema.commissions)
      .where(and(
        eq(schema.commissions.salesRepId, salesRepId),
        eq(schema.commissions.paymentMonth, paymentMonth)
      ));
  }

  async markCommissionPaid(id: number): Promise<Commission> {
    const [commission] = await db.update(schema.commissions)
      .set({ 
        isPaid: true, 
        paidDate: new Date().toISOString().split('T')[0] 
      })
      .where(eq(schema.commissions.id, id))
      .returning();
    return commission;
  }

  // Monthly Bonus Management
  async createMonthlyBonus(data: InsertMonthlyBonus): Promise<MonthlyBonus> {
    const [bonus] = await db.insert(schema.monthlyBonuses).values(data).returning();
    return bonus;
  }

  async getMonthlyBonus(salesRepId: number, bonusMonth: string): Promise<MonthlyBonus | null> {
    const [bonus] = await db.select().from(schema.monthlyBonuses)
      .where(and(
        eq(schema.monthlyBonuses.salesRepId, salesRepId),
        eq(schema.monthlyBonuses.bonusMonth, bonusMonth)
      ));
    return bonus || null;
  }

  async getMonthlyBonusesBySalesRep(salesRepId: number): Promise<MonthlyBonus[]> {
    return await db.select().from(schema.monthlyBonuses)
      .where(eq(schema.monthlyBonuses.salesRepId, salesRepId))
      .orderBy(desc(schema.monthlyBonuses.bonusMonth));
  }

  // Milestone Bonus Management
  async createMilestoneBonus(data: InsertMilestoneBonus): Promise<MilestoneBonus> {
    const [bonus] = await db.insert(schema.milestoneBonuses).values(data).returning();
    return bonus;
  }

  async getMilestoneBonusesBySalesRep(salesRepId: number): Promise<MilestoneBonus[]> {
    return await db.select().from(schema.milestoneBonuses)
      .where(eq(schema.milestoneBonuses.salesRepId, salesRepId))
      .orderBy(desc(schema.milestoneBonuses.achievedDate));
  }

  async hasMilestoneBonus(salesRepId: number, milestoneType: string): Promise<boolean> {
    const [bonus] = await db.select().from(schema.milestoneBonuses)
      .where(and(
        eq(schema.milestoneBonuses.salesRepId, salesRepId),
        eq(schema.milestoneBonuses.milestoneType, milestoneType)
      ));
    return !!bonus;
  }

  // Commission Adjustment Management
  async createCommissionAdjustment(data: InsertCommissionAdjustment): Promise<CommissionAdjustment> {
    const [adjustment] = await db.insert(schema.commissionAdjustments).values(data).returning();
    return adjustment;
  }

  async getCommissionAdjustments(salesRepId: number): Promise<CommissionAdjustment[]> {
    return await db.select().from(schema.commissionAdjustments)
      .where(eq(schema.commissionAdjustments.salesRepId, salesRepId))
      .orderBy(desc(schema.commissionAdjustments.createdAt));
  }

  async approveCommissionAdjustment(id: number, approvedBy: number): Promise<CommissionAdjustment> {
    const [adjustment] = await db.update(schema.commissionAdjustments)
      .set({ 
        isApproved: true, 
        approvedBy 
      })
      .where(eq(schema.commissionAdjustments.id, id))
      .returning();
    return adjustment;
  }

  // Analytics and Reporting
  async getSalesRepPerformance(salesRepId: number, startDate: string, endDate: string) {
    const commissions = await db.select().from(schema.commissions)
      .where(and(
        eq(schema.commissions.salesRepId, salesRepId),
        gte(schema.commissions.paymentMonth, startDate),
        lte(schema.commissions.paymentMonth, endDate)
      ));

    const totalCommissions = commissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount), 0);
    const paidCommissions = commissions
      .filter(c => c.isPaid)
      .reduce((sum, c) => sum + parseFloat(c.commissionAmount), 0);

    const deals = await db.select().from(schema.deals)
      .where(and(
        eq(schema.deals.salesRepId, salesRepId),
        gte(schema.deals.closeDate!, startDate),
        lte(schema.deals.closeDate!, endDate),
        eq(schema.deals.dealStage, 'Closed Won')
      ));

    return {
      totalCommissions,
      paidCommissions,
      unpaidCommissions: totalCommissions - paidCommissions,
      dealsClosed: deals.length,
      totalDealValue: deals.reduce((sum, d) => sum + parseFloat(d.monthlyValue), 0)
    };
  }

  async getTotalClientsClosedBySalesRep(salesRepId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(schema.deals)
      .where(and(
        eq(schema.deals.salesRepId, salesRepId),
        eq(schema.deals.dealStage, 'Closed Won')
      ));
    
    return result[0]?.count || 0;
  }
}