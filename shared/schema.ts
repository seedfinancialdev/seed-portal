import { pgTable, serial, text, decimal, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Original Quote Calculator Tables
export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  contactEmail: text('contact_email').notNull(),
  companyName: text('company_name'),
  hubspotContactId: text('hubspot_contact_id'),
  hubspotDealId: text('hubspot_deal_id'),
  hubspotQuoteId: text('hubspot_quote_id'),
  revenueBand: text('revenue_band').notNull(),
  entityType: text('entity_type').notNull(),
  transactionVolume: text('transaction_volume').notNull(),
  industryType: text('industry_type').notNull(),
  bookkeepingComplexity: text('bookkeeping_complexity').notNull(),
  bookkeepingQuality: text('bookkeeping_quality').notNull(),
  cleanupMonths: integer('cleanup_months').notNull(),
  customSetupFee: decimal('custom_setup_fee', { precision: 10, scale: 2 }),
  includesBookkeeping: boolean('includes_bookkeeping').default(true).notNull(),
  includesTaas: boolean('includes_taas').default(false).notNull(),
  taasEntityType: text('taas_entity_type'),
  taasRevenueBand: text('taas_revenue_band'),
  taasPriorYearsBehind: integer('taas_prior_years_behind'),
  hasSeedPackage: boolean('has_seed_package').default(false).notNull(),
  monthlyFee: decimal('monthly_fee', { precision: 10, scale: 2 }).notNull(),
  setupFee: decimal('setup_fee', { precision: 10, scale: 2 }).notNull(),
  taasMonthlyFee: decimal('taas_monthly_fee', { precision: 10, scale: 2 }),
  taasPriorYearsFee: decimal('taas_prior_years_fee', { precision: 10, scale: 2 }),
  overrideReason: text('override_reason'),
  approvalRequired: boolean('approval_required').default(false).notNull(),
  userId: integer('user_id').notNull(),
  archived: boolean('archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const approvalCodes = pgTable('approval_codes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  userId: integer('user_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Quote Calculator Schemas
export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertApprovalCodeSchema = createInsertSchema(approvalCodes).omit({
  id: true,
  createdAt: true
});

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type SelectQuote = typeof quotes.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;
export type InsertApprovalCode = z.infer<typeof insertApprovalCodeSchema>;
export type SelectApprovalCode = typeof approvalCodes.$inferSelect;