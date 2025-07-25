import { z } from "zod";

// Get current month number (1-12)
const currentMonth = new Date().getMonth() + 1;

// Create comprehensive form schema for the quote form
export const formSchema = z.object({
  // Contact Information
  contactEmail: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  companyName: z.string().optional(),
  
  // Basic Quote Information
  revenueBand: z.string().min(1, "Please select a revenue band"),
  entityType: z.string().min(1, "Please select an entity type"),
  transactionVolume: z.string().min(1, "Please select transaction volume"),
  industryType: z.string().min(1, "Please select an industry type"),
  
  // Bookkeeping Fields
  bookkeepingComplexity: z.string().min(1, "Please select complexity level"),
  bookkeepingQuality: z.string().min(1, "Please select current quality"),
  cleanupMonths: z.number().min(0, "Cannot be negative").max(24, "Maximum 24 months"),
  customSetupFee: z.string().optional(),
  
  // Service Flags
  includesBookkeeping: z.boolean().default(true),
  includesTaas: z.boolean().default(false),
  
  // TaaS Fields
  taasEntityType: z.string().optional(),
  taasRevenueBand: z.string().optional(),
  taasPriorYearsBehind: z.number().min(0).max(10).default(0),
  
  // Package and Override Fields
  hasSeedPackage: z.boolean().default(false),
  overrideReason: z.string().optional(),
  cleanupOverride: z.boolean().default(false),
  customOverrideReason: z.string().optional(),
  
  // TaaS Specific Fields
  numEntities: z.number().min(1, "Must have at least 1 entity").optional(),
  statesFiled: z.number().min(1, "Must file in at least 1 state").optional(),
  internationalFiling: z.boolean().optional(),
  numBusinessOwners: z.number().min(1, "Must have at least 1 business owner").optional(),
  include1040s: z.boolean().optional(),
  priorYearsUnfiled: z.number().min(0, "Cannot be negative").max(5, "Maximum 5 years").optional(),
  alreadyOnSeedBookkeeping: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // If cleanup override is checked, require a reason
  if (data.cleanupOverride && !data.overrideReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Override reason is required when cleanup override is enabled",
      path: ["overrideReason"],
    });
  }
  
  // If "Other" is selected as reason, require custom text
  if (data.cleanupOverride && data.overrideReason === "Other" && (!data.customOverrideReason || data.customOverrideReason.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide a detailed reason for the override",
      path: ["customOverrideReason"]
    });
  }
  
  // If override is not checked or not approved, enforce minimum cleanup months (only for bookkeeping)
  if (data.includesBookkeeping && !data.cleanupOverride && data.cleanupMonths < currentMonth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Minimum ${currentMonth} months required (current calendar year) unless override is approved`,
      path: ["cleanupMonths"],
    });
  }
  
  // TaaS validations
  if (data.includesTaas) {
    if (!data.numEntities) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Number of entities is required for TaaS quotes",
        path: ["numEntities"],
      });
    }
    if (!data.statesFiled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "States filed is required for TaaS quotes",
        path: ["statesFiled"],
      });
    }
    if (!data.numBusinessOwners) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Number of business owners is required for TaaS quotes",
        path: ["numBusinessOwners"],
      });
    }
    if (data.include1040s === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify if 1040s should be included",
        path: ["include1040s"],
      });
    }
    if (data.priorYearsUnfiled === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Prior years unfiled is required for TaaS quotes",
        path: ["priorYearsUnfiled"],
      });
    }
    if (data.alreadyOnSeedBookkeeping === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify if already on Seed bookkeeping",
        path: ["alreadyOnSeedBookkeeping"],
      });
    }
  }
});

export type FormData = z.infer<typeof formSchema>;