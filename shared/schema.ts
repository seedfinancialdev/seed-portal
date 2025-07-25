import { pgTable, serial, text, decimal, integer, boolean, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Sales Representatives table
export const salesReps = pgTable('sales_reps', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  hubspotUserId: text('hubspot_user_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Deals table - synced from HubSpot
export const deals = pgTable('deals', {
  id: serial('id').primaryKey(),
  hubspotDealId: text('hubspot_deal_id').notNull().unique(),
  dealName: text('deal_name').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  monthlyValue: decimal('monthly_value', { precision: 10, scale: 2 }),
  setupFee: decimal('setup_fee', { precision: 10, scale: 2 }),
  closeDate: timestamp('close_date'),
  dealStage: text('deal_stage').notNull(),
  dealOwner: text('deal_owner').notNull(), // HubSpot user ID
  salesRepId: integer('sales_rep_id').references(() => salesReps.id),
  companyName: text('company_name'),
  serviceType: text('service_type'), // 'bookkeeping', 'taas', 'combined'
  isCollected: boolean('is_collected').default(false).notNull(), // Revenue recognition
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Commission records
export const commissions = pgTable('commissions', {
  id: serial('id').primaryKey(),
  dealId: integer('deal_id').references(() => deals.id).notNull(),
  salesRepId: integer('sales_rep_id').references(() => salesReps.id).notNull(),
  commissionType: text('commission_type').notNull(), // 'month_1', 'setup_fee', 'residual'
  rate: decimal('rate', { precision: 5, scale: 4 }).notNull(), // 0.4000 for 40%
  baseAmount: decimal('base_amount', { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }).notNull(),
  monthNumber: integer('month_number'), // 1-12 for tracking residuals
  isPaid: boolean('is_paid').default(false).notNull(),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Monthly bonus tracking
export const monthlyBonuses = pgTable('monthly_bonuses', {
  id: serial('id').primaryKey(),
  salesRepId: integer('sales_rep_id').references(() => salesReps.id).notNull(),
  month: integer('month').notNull(), // 1-12
  year: integer('year').notNull(),
  clientsClosed: integer('clients_closed').notNull(),
  bonusLevel: text('bonus_level'), // '5_clients', '10_clients', '15_plus_clients'
  bonusAmount: decimal('bonus_amount', { precision: 10, scale: 2 }),
  bonusDescription: text('bonus_description'),
  isPaid: boolean('is_paid').default(false).notNull(),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Milestone bonus tracking
export const milestoneBonuses = pgTable('milestone_bonuses', {
  id: serial('id').primaryKey(),
  salesRepId: integer('sales_rep_id').references(() => salesReps.id).notNull(),
  milestoneType: text('milestone_type').notNull(), // '25_clients', '40_clients', '60_clients', '100_clients'
  totalClients: integer('total_clients').notNull(),
  bonusAmount: decimal('bonus_amount', { precision: 10, scale: 2 }).notNull(),
  bonusDescription: text('bonus_description'),
  achievedAt: timestamp('achieved_at').defaultNow().notNull(),
  isPaid: boolean('is_paid').default(false).notNull(),
  paidAt: timestamp('paid_at'),
});

// Commission adjustments (admin overrides)
export const commissionAdjustments = pgTable('commission_adjustments', {
  id: serial('id').primaryKey(),
  salesRepId: integer('sales_rep_id').references(() => salesReps.id).notNull(),
  adjustmentType: text('adjustment_type').notNull(), // 'bonus', 'deduction', 'override'
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  reason: text('reason').notNull(),
  adminUserId: text('admin_user_id').notNull(),
  approvedAt: timestamp('approved_at').defaultNow().notNull(),
  isPaid: boolean('is_paid').default(false).notNull(),
  paidAt: timestamp('paid_at'),
});

// Create insert schemas
export const insertSalesRepSchema = createInsertSchema(salesReps);
export const insertDealSchema = createInsertSchema(deals);
export const insertCommissionSchema = createInsertSchema(commissions);
export const insertMonthlyBonusSchema = createInsertSchema(monthlyBonuses);
export const insertMilestoneBonusSchema = createInsertSchema(milestoneBonuses);
export const insertCommissionAdjustmentSchema = createInsertSchema(commissionAdjustments);

// Create types
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