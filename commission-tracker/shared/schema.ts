import { pgTable, serial, text, decimal, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sales representatives table
export const salesReps = pgTable("sales_reps", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(), // @seedfinancial.io email
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  hubspotUserId: text("hubspot_user_id"), // HubSpot owner ID
  isActive: boolean("is_active").default(true).notNull(),
  startDate: date("start_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Client deals imported from HubSpot
export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  hubspotDealId: text("hubspot_deal_id").notNull().unique(),
  dealName: text("deal_name").notNull(),
  clientEmail: text("client_email").notNull(),
  companyName: text("company_name"),
  salesRepId: integer("sales_rep_id").references(() => salesReps.id).notNull(),
  monthlyValue: decimal("monthly_value", { precision: 10, scale: 2 }).notNull(),
  setupFee: decimal("setup_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  dealStage: text("deal_stage").notNull(), // "Closed Won", "Proposal", etc.
  closeDate: date("close_date"),
  firstPaymentDate: date("first_payment_date"), // When company gets paid
  isRecurring: boolean("is_recurring").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Commission calculations for each deal
export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").references(() => deals.id).notNull(),
  salesRepId: integer("sales_rep_id").references(() => salesReps.id).notNull(),
  commissionType: text("commission_type").notNull(), // "initial_monthly", "setup_fee", "residual"
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).notNull(), // Amount commission is calculated from
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull(), // 0.40, 0.20, 0.10
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  monthNumber: integer("month_number").notNull(), // 1 for initial, 2-12 for residuals
  paymentMonth: date("payment_month").notNull(), // When commission is earned/paid
  isPaid: boolean("is_paid").default(false).notNull(),
  paidDate: date("paid_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Monthly bonus tracking
export const monthlyBonuses = pgTable("monthly_bonuses", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id").references(() => salesReps.id).notNull(),
  bonusMonth: date("bonus_month").notNull(), // YYYY-MM-01 format
  clientsClosed: integer("clients_closed").notNull(),
  bonusType: text("bonus_type"), // "5_clients", "10_clients", "15_clients"
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  rewardChosen: text("reward_chosen"), // "cash", "airpods", "apple_watch", "macbook"
  isPaid: boolean("is_paid").default(false).notNull(),
  paidDate: date("paid_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Milestone bonus tracking
export const milestoneBonuses = pgTable("milestone_bonuses", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id").references(() => salesReps.id).notNull(),
  milestoneType: text("milestone_type").notNull(), // "25_clients", "40_clients", "60_clients", "100_clients"
  clientsAtMilestone: integer("clients_at_milestone").notNull(),
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).notNull(),
  achievedDate: date("achieved_date").notNull(),
  isPaid: boolean("is_paid").default(false).notNull(),
  paidDate: date("paid_date"),
  equityOffered: boolean("equity_offered").default(false).notNull(), // For 100 clients
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Commission adjustments and overrides
export const commissionAdjustments = pgTable("commission_adjustments", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id").references(() => salesReps.id).notNull(),
  dealId: integer("deal_id").references(() => deals.id),
  adjustmentType: text("adjustment_type").notNull(), // "bonus", "deduction", "correction"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  approvedBy: integer("approved_by").references(() => salesReps.id),
  approvalCode: text("approval_code"), // Similar to override system
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertSalesRepSchema = createInsertSchema(salesReps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  createdAt: true,
});

export const insertMonthlyBonusSchema = createInsertSchema(monthlyBonuses).omit({
  id: true,
  createdAt: true,
});

export const insertMilestoneBonusSchema = createInsertSchema(milestoneBonuses).omit({
  id: true,
  createdAt: true,
});

export const insertCommissionAdjustmentSchema = createInsertSchema(commissionAdjustments).omit({
  id: true,
  createdAt: true,
});

// Types
export type SalesRep = typeof salesReps.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Commission = typeof commissions.$inferSelect;
export type MonthlyBonus = typeof monthlyBonuses.$inferSelect;
export type MilestoneBonus = typeof milestoneBonuses.$inferSelect;
export type CommissionAdjustment = typeof commissionAdjustments.$inferSelect;

export type InsertSalesRep = z.infer<typeof insertSalesRepSchema>;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type InsertMonthlyBonus = z.infer<typeof insertMonthlyBonusSchema>;
export type InsertMilestoneBonus = z.infer<typeof insertMilestoneBonusSchema>;
export type InsertCommissionAdjustment = z.infer<typeof insertCommissionAdjustmentSchema>;