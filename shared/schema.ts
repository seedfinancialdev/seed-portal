import { pgTable, text, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  contactEmail: text("contact_email").notNull(),
  revenueBand: text("revenue_band").notNull(),
  monthlyTransactions: text("monthly_transactions").notNull(),
  industry: text("industry").notNull(),
  cleanupMonths: integer("cleanup_months").notNull(),
  cleanupComplexity: decimal("cleanup_complexity", { precision: 3, scale: 2 }).notNull(),
  cleanupOverride: boolean("cleanup_override").default(false).notNull(),
  overrideReason: text("override_reason"),
  approvalRequired: boolean("approval_required").default(false).notNull(),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(),
  setupFee: decimal("setup_fee", { precision: 10, scale: 2 }).notNull(),
  // TaaS pricing fields
  taasMonthlyFee: decimal("taas_monthly_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  taasPriorYearsFee: decimal("taas_prior_years_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  // Combined service flags
  includesBookkeeping: boolean("includes_bookkeeping").default(true).notNull(),
  includesTaas: boolean("includes_taas").default(false).notNull(),
  archived: boolean("archived").default(false).notNull(),
  // Quote type - 'bookkeeping' or 'taas'
  quoteType: text("quote_type").default("bookkeeping").notNull(),
  // TaaS-specific fields
  entityType: text("entity_type"), // LLC, S-Corp, C-Corp, Partnership, Sole Prop, Non-Profit
  numEntities: integer("num_entities"),
  customNumEntities: integer("custom_num_entities"), // For when "more" is selected
  statesFiled: integer("states_filed"),
  customStatesFiled: integer("custom_states_filed"), // For when "more" is selected
  internationalFiling: boolean("international_filing"),
  numBusinessOwners: integer("num_business_owners"),
  customNumBusinessOwners: integer("custom_num_business_owners"), // For when "more" is selected
  bookkeepingQuality: text("bookkeeping_quality"), // Outside CPA, Self-Managed, Not Done / Behind
  include1040s: boolean("include_1040s"),
  priorYearsUnfiled: integer("prior_years_unfiled"),
  alreadyOnSeedBookkeeping: boolean("already_on_seed_bookkeeping"),
  qboSubscription: boolean("qbo_subscription").default(false),
  // Bookkeeping-specific information fields (do not impact pricing)
  accountingBasis: text("accounting_basis"), // Cash, Accrual
  businessLoans: boolean("business_loans"),
  // Service selections - new 5-card system
  serviceBookkeeping: boolean("service_bookkeeping").default(false),
  serviceTaas: boolean("service_taas").default(false), 
  servicePayroll: boolean("service_payroll").default(false),
  serviceApArLite: boolean("service_ap_ar_lite").default(false),
  serviceFpaLite: boolean("service_fpa_lite").default(false),
  // Client address information for MSA generation
  clientStreetAddress: text("client_street_address"),
  clientCity: text("client_city"),
  clientState: text("client_state"),
  clientZipCode: text("client_zip_code"),
  clientCountry: text("client_country").default("US"),
  // Company name unlock status
  companyNameLocked: boolean("company_name_locked").default(true),
  // Additional client detail fields with lock status
  contactFirstName: text("contact_first_name"),
  contactFirstNameLocked: boolean("contact_first_name_locked").default(true),
  contactLastName: text("contact_last_name"),
  contactLastNameLocked: boolean("contact_last_name_locked").default(true),
  industryLocked: boolean("industry_locked").default(true),
  companyAddressLocked: boolean("company_address_locked").default(true),
  monthlyRevenueRange: text("monthly_revenue_range"),
  // User ownership
  ownerId: integer("owner_id").notNull(),
  // HubSpot integration fields
  hubspotContactId: text("hubspot_contact_id"),
  hubspotDealId: text("hubspot_deal_id"),
  hubspotQuoteId: text("hubspot_quote_id"),
  hubspotContactVerified: boolean("hubspot_contact_verified").default(false),
  companyName: text("company_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  ownerId: true, // Will be set by backend from authenticated user
}).extend({
  revenueBand: z.string().optional(), // Make revenueBand optional for inserts since backend maps from monthlyRevenueRange
});

export const updateQuoteSchema = createInsertSchema(quotes).omit({
  createdAt: true,
}).partial().required({ id: true });

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// Google Workspace Users table - synced nightly from Google Admin API
export const workspaceUsers = pgTable("workspace_users", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").notNull().unique(), // Google user ID
  email: text("email").notNull().unique(), // Primary email from Google Workspace
  firstName: text("first_name"),
  lastName: text("last_name"),
  fullName: text("full_name"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  suspended: boolean("suspended").default(false).notNull(),
  orgUnitPath: text("org_unit_path").default("/"),
  lastLoginTime: timestamp("last_login_time"),
  creationTime: timestamp("creation_time"),
  thumbnailPhotoUrl: text("thumbnail_photo_url"),
  // Sync metadata
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  syncSource: text("sync_source").default("google_admin_api").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWorkspaceUserSchema = createInsertSchema(workspaceUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkspaceUser = z.infer<typeof insertWorkspaceUserSchema>;
export type WorkspaceUser = typeof workspaceUsers.$inferSelect;

// Users with HubSpot integration
export const users: any = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(), // @seedfinancial.io email
  password: text("password"), // Optional for OAuth users
  firstName: text("first_name"),
  lastName: text("last_name"),
  hubspotUserId: text("hubspot_user_id"), // HubSpot user ID for ownership
  // OAuth fields
  firebaseUid: text("firebase_uid").unique(), // Firebase user ID (legacy)
  googleId: text("google_id").unique(), // Google user ID for OIDC
  authProvider: text("auth_provider").default("local"), // 'local' or 'google'
  role: text("role").default("service"), // 'admin', 'sales', 'service'
  roleAssignedBy: integer("role_assigned_by").references((): any => users.id),
  roleAssignedAt: timestamp("role_assigned_at"),
  // Profile information
  profilePhoto: text("profile_photo"), // HubSpot profile photo URL or Google photo
  phoneNumber: text("phone_number"), // Synced from HubSpot
  address: text("address"), // User-editable for weather
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("US"),
  // Weather preferences
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  lastWeatherUpdate: timestamp("last_weather_update"),
  // HubSpot sync status
  lastHubspotSync: timestamp("last_hubspot_sync"),
  hubspotSyncEnabled: boolean("hubspot_sync_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Profile update schema (includes HubSpot sync fields)
export const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  profilePhoto: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  lastHubspotSync: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// Sales Representatives (extends users)
export const salesReps = pgTable("sales_reps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  totalClientsClosedMonthly: integer("total_clients_closed_monthly").default(0).notNull(),
  totalClientsClosedAllTime: integer("total_clients_closed_all_time").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Deals (imported from HubSpot)
export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  hubspotDealId: text("hubspot_deal_id").notNull().unique(),
  dealName: text("deal_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  setupFee: decimal("setup_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(),
  stage: text("stage").notNull(), // HubSpot deal stage
  status: text("status").notNull().default("open"), // open, closed_won, closed_lost
  ownerId: integer("owner_id").notNull().references(() => users.id), // Sales rep
  hubspotOwnerId: text("hubspot_owner_id"),
  closedDate: timestamp("closed_date"),
  serviceType: text("service_type").notNull(), // bookkeeping, taas, combined
  companyName: text("company_name"),
  contactEmail: text("contact_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
});

// Commission Entries
export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => deals.id),
  salesRepId: integer("sales_rep_id").notNull().references(() => salesReps.id),
  type: text("type").notNull(), // month_1, residual
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, paid
  monthNumber: integer("month_number").notNull(), // 1, 2, 3, etc.
  dateEarned: timestamp("date_earned").notNull(),
  datePaid: timestamp("date_paid"),
  paymentMethod: text("payment_method"), // direct_deposit, check, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Monthly Bonuses
export const monthlyBonuses = pgTable("monthly_bonuses", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id").notNull().references(() => salesReps.id),
  month: text("month").notNull(), // YYYY-MM format
  clientsClosedCount: integer("clients_closed_count").notNull(),
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).notNull(),
  bonusType: text("bonus_type").notNull(), // cash, airpods, apple_watch, macbook_air
  status: text("status").notNull().default("pending"), // pending, processing, paid
  dateEarned: timestamp("date_earned").notNull(),
  datePaid: timestamp("date_paid"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Milestone Bonuses
export const milestoneBonuses = pgTable("milestone_bonuses", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id").notNull().references(() => salesReps.id),
  milestone: integer("milestone").notNull(), // 25, 40, 60, 100
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).notNull(),
  includesEquity: boolean("includes_equity").default(false).notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, paid
  dateEarned: timestamp("date_earned").notNull(),
  datePaid: timestamp("date_paid"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema exports for commission tracking
export const insertSalesRepSchema = createInsertSchema(salesReps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncedAt: true,
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMonthlyBonusSchema = createInsertSchema(monthlyBonuses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMilestoneBonusSchema = createInsertSchema(milestoneBonuses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalesRep = z.infer<typeof insertSalesRepSchema>;
export type SalesRep = typeof salesReps.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissions.$inferSelect;
export type InsertMonthlyBonus = z.infer<typeof insertMonthlyBonusSchema>;
export type MonthlyBonus = typeof monthlyBonuses.$inferSelect;
export type InsertMilestoneBonus = z.infer<typeof insertMilestoneBonusSchema>;
export type MilestoneBonus = typeof milestoneBonuses.$inferSelect;

// Approval codes for cleanup overrides
export const approvalCodes = pgTable("approval_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  contactEmail: text("contact_email").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertApprovalCodeSchema = createInsertSchema(approvalCodes).omit({
  id: true,
  createdAt: true,
});

export type InsertApprovalCode = z.infer<typeof insertApprovalCodeSchema>;
export type ApprovalCode = typeof approvalCodes.$inferSelect;

// Client Intelligence data for AI snapshots
export const clientIntelProfiles = pgTable("client_intel_profiles", {
  id: serial("id").primaryKey(),
  contactEmail: text("contact_email").notNull().unique(),
  companyName: text("company_name").notNull(),
  industry: text("industry"),
  revenue: text("revenue"),
  employees: integer("employees"),
  hubspotContactId: text("hubspot_contact_id"),
  qboCompanyId: text("qbo_company_id"),
  painPoints: text("pain_points").array(), // JSON array of pain points
  services: text("services").array(), // Current services array
  riskScore: integer("risk_score").default(0), // 0-100 risk assessment
  upsellOpportunities: text("upsell_opportunities").array(), // AI-generated opportunities
  lastAnalyzed: timestamp("last_analyzed"),
  lastActivity: timestamp("last_activity"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Client documents and uploaded files
export const clientDocuments = pgTable("client_documents", {
  id: serial("id").primaryKey(),
  clientProfileId: integer("client_profile_id").notNull().references(() => clientIntelProfiles.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // pdf, xlsx, docx, etc.
  fileSize: integer("file_size").notNull(), // bytes
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  fileUrl: text("file_url"), // Storage URL
  extractedText: text("extracted_text"), // OCR/extracted content for AI analysis
  summary: text("summary"), // AI-generated summary
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Client activity log
export const clientActivities = pgTable("client_activities", {
  id: serial("id").primaryKey(),
  clientProfileId: integer("client_profile_id").notNull().references(() => clientIntelProfiles.id),
  activityType: text("activity_type").notNull(), // email, call, meeting, quote, document_upload
  description: text("description").notNull(),
  userId: integer("user_id").references(() => users.id), // Who performed the activity
  hubspotActivityId: text("hubspot_activity_id"), // If synced from HubSpot
  activityDate: timestamp("activity_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientIntelProfileSchema = createInsertSchema(clientIntelProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientDocumentSchema = createInsertSchema(clientDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertClientActivitySchema = createInsertSchema(clientActivities).omit({
  id: true,
  createdAt: true,
});

export type InsertClientIntelProfile = z.infer<typeof insertClientIntelProfileSchema>;
export type ClientIntelProfile = typeof clientIntelProfiles.$inferSelect;
export type InsertClientDocument = z.infer<typeof insertClientDocumentSchema>;
export type ClientDocument = typeof clientDocuments.$inferSelect;
export type InsertClientActivity = z.infer<typeof insertClientActivitySchema>;
export type ClientActivity = typeof clientActivities.$inferSelect;

// Knowledge Base Schema
export const kbCategories = pgTable("kb_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon").default("folder"), // Lucide icon name
  color: text("color").default("blue"), // Category color theme
  parentId: integer("parent_id"), // For subcategories - will add reference after table definition
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kbArticles = pgTable("kb_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"), // Brief summary
  content: text("content").notNull(), // Rich text/markdown content
  categoryId: integer("category_id").notNull().references(() => kbCategories.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  status: text("status").notNull().default("draft"), // draft, published, archived
  featured: boolean("featured").default(false), // Featured articles
  tags: text("tags").array(), // Array of tags for filtering
  viewCount: integer("view_count").default(0),
  searchVector: text("search_vector"), // For full-text search
  aiSummary: text("ai_summary"), // AI-generated summary
  lastReviewedAt: timestamp("last_reviewed_at"),
  lastReviewedBy: integer("last_reviewed_by").references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kbArticleVersions = pgTable("kb_article_versions", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => kbArticles.id),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull().references(() => users.id),
  changeNote: text("change_note"), // What changed in this version
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kbBookmarks = pgTable("kb_bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  articleId: integer("article_id").notNull().references(() => kbArticles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kbSearchHistory = pgTable("kb_search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  query: text("query").notNull(),
  resultsCount: integer("results_count").default(0),
  clickedArticleId: integer("clicked_article_id").references(() => kbArticles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Knowledge Base Schemas
export const insertKbCategorySchema = createInsertSchema(kbCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKbArticleSchema = createInsertSchema(kbArticles).omit({
  id: true,
  viewCount: true,
  searchVector: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKbArticleVersionSchema = createInsertSchema(kbArticleVersions).omit({
  id: true,
  createdAt: true,
});

export const insertKbBookmarkSchema = createInsertSchema(kbBookmarks).omit({
  id: true,
  createdAt: true,
});

export const insertKbSearchHistorySchema = createInsertSchema(kbSearchHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertKbCategory = z.infer<typeof insertKbCategorySchema>;
export type KbCategory = typeof kbCategories.$inferSelect;
export type InsertKbArticle = z.infer<typeof insertKbArticleSchema>;
export type KbArticle = typeof kbArticles.$inferSelect;
export type InsertKbArticleVersion = z.infer<typeof insertKbArticleVersionSchema>;
export type KbArticleVersion = typeof kbArticleVersions.$inferSelect;
export type InsertKbBookmark = z.infer<typeof insertKbBookmarkSchema>;
export type KbBookmark = typeof kbBookmarks.$inferSelect;
export type InsertKbSearchHistory = z.infer<typeof insertKbSearchHistorySchema>;
export type KbSearchHistory = typeof kbSearchHistory.$inferSelect;
