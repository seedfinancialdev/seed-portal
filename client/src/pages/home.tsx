import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Copy, Save, Check, Search, ArrowUpDown, Edit, AlertCircle, Archive, CheckCircle, XCircle, Loader2, Upload, User, LogOut, Calculator, FileText, Sparkles, DollarSign, X, Plus, ChevronLeft, ChevronRight, HelpCircle, Bell, Settings, MoreHorizontal } from "lucide-react";
import { useLocation } from "wouter";
import { insertQuoteSchema, type Quote } from "@shared/schema";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { UniversalNavbar } from "@/components/UniversalNavbar";

// Get current month number (1-12)
const currentMonth = new Date().getMonth() + 1;

// Helper functions for approval logic
const getApprovalButtonDisabledReason = (formValues: any, isRequestingApproval: boolean, hasRequestedApproval: boolean): string | null => {
  if (isRequestingApproval) return null;
  if (!formValues.contactEmail) return "Contact email is required";
  if (!formValues.overrideReason) return "Please select a reason for override";
  
  const overrideReason = formValues.overrideReason;
  const cleanupMonths = formValues.cleanupMonths || 0;
  const customSetupFee = formValues.customSetupFee?.trim();
  const customOverrideReason = formValues.customOverrideReason?.trim();
  
  if (overrideReason === "Other") {
    if (!customOverrideReason) return "Please explain the reason for override";
    // For "Other", button is enabled if custom setup fee is entered OR cleanup months are decreased
    const hasCustomSetupFee = customSetupFee && customSetupFee !== "";
    const hasDecreasedMonths = cleanupMonths < currentMonth;
    if (!hasCustomSetupFee && !hasDecreasedMonths) {
      return "Enter a custom setup fee OR reduce cleanup months below the minimum";
    }
  } else if (overrideReason === "Brand New Business" || overrideReason === "Books Confirmed Current") {
    // For these reasons, button is only enabled if cleanup months are decreased
    if (cleanupMonths >= currentMonth) {
      return "Reduce cleanup months below the minimum to request approval";
    }
  }
  
  return null;
};

const isApprovalButtonDisabled = (formValues: any, isRequestingApproval: boolean, hasRequestedApproval: boolean): boolean => {
  return getApprovalButtonDisabledReason(formValues, isRequestingApproval, hasRequestedApproval) !== null;
};

// Create form schema without the calculated fields
const formSchema = insertQuoteSchema.omit({
  monthlyFee: true,
  setupFee: true,
  taasMonthlyFee: true,
  taasPriorYearsFee: true,
  hubspotContactId: true,
  hubspotDealId: true,
  hubspotQuoteId: true,
  hubspotContactVerified: true,
}).extend({
  contactEmail: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  cleanupMonths: z.number().min(0, "Cannot be negative"),
  cleanupOverride: z.boolean().default(false),
  overrideReason: z.string().optional(),
  customOverrideReason: z.string().optional(),
  customSetupFee: z.string().optional(),
  companyName: z.string().optional(),
  // TaaS fields
  numEntities: z.number().min(1, "Must have at least 1 entity").optional(),
  customNumEntities: z.number().min(6, "Custom entities must be at least 6").optional(),
  statesFiled: z.number().min(1, "Must file in at least 1 state").optional(),
  customStatesFiled: z.number().min(7, "Custom states must be at least 7").max(50, "Maximum 50 states").optional(),
  internationalFiling: z.boolean().optional(),
  numBusinessOwners: z.number().min(1, "Must have at least 1 business owner").optional(),
  customNumBusinessOwners: z.number().min(6, "Custom owners must be at least 6").optional(),
  include1040s: z.boolean().optional(),
  priorYearsUnfiled: z.number().min(0, "Cannot be negative").max(5, "Maximum 5 years").optional(),
  alreadyOnSeedBookkeeping: z.boolean().optional(),
  qboSubscription: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // If cleanup override is checked, require a reason
  if (data.cleanupOverride && !data.overrideReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Override reason is required when cleanup override is enabled",
      path: ["overrideReason"],
    });
  }
  
  // If "Other" is selected as reason, require custom text and setup fee
  if (data.cleanupOverride && data.overrideReason === "Other") {
    if (!data.customOverrideReason || data.customOverrideReason.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide a detailed reason for the override",
        path: ["customOverrideReason"]
      });
    }
    if (!data.customSetupFee || data.customSetupFee.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a custom setup fee for manual approval",
        path: ["customSetupFee"]
      });
    }
  }
  
  // If override is not checked or not approved, enforce minimum cleanup months (only for bookkeeping)
  if (data.quoteType === 'bookkeeping' && !data.cleanupOverride && data.cleanupMonths < currentMonth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Minimum ${currentMonth} months required (current calendar year) unless override is approved`,
      path: ["cleanupMonths"],
    });
  }
  
  // TaaS validations
  if (data.quoteType === 'taas') {
    if (!data.entityType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Entity type is required for TaaS quotes",
        path: ["entityType"],
      });
    }
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
    if (!data.bookkeepingQuality) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bookkeeping quality is required for TaaS quotes",
        path: ["bookkeepingQuality"],
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
        message: "Please specify if already on Seed Bookkeeping",
        path: ["alreadyOnSeedBookkeeping"],
      });
    }
  }
});

type FormData = z.infer<typeof formSchema>;

// Pricing data
const baseMonthlyFee = 150; // Starting base fee (updated to $150/mo)

const revenueMultipliers = {
  '<$10K': 1.0,
  '10K-25K': 1.0,
  '25K-75K': 2.2,
  '75K-250K': 3.5,
  '250K-1M': 5.0,
  '1M+': 7.0
};

const txSurcharge = {
  '<100': 0,
  '100-300': 100,
  '300-600': 500,
  '600-1000': 800,
  '1000-2000': 1200,
  '2000+': 1600
};

const industryMultipliers = {
  'Software/SaaS': { monthly: 1.0, cleanup: 1.0 },
  'Professional Services': { monthly: 1.0, cleanup: 1.1 },
  'Consulting': { monthly: 1.0, cleanup: 1.05 },
  'Healthcare/Medical': { monthly: 1.4, cleanup: 1.3 },
  'Real Estate': { monthly: 1.25, cleanup: 1.05 },
  'Property Management': { monthly: 1.3, cleanup: 1.2 },
  'E-commerce/Retail': { monthly: 1.35, cleanup: 1.15 },
  'Restaurant/Food Service': { monthly: 1.6, cleanup: 1.4 },
  'Hospitality': { monthly: 1.6, cleanup: 1.4 },
  'Construction/Trades': { monthly: 1.5, cleanup: 1.08 },
  'Manufacturing': { monthly: 1.45, cleanup: 1.25 },
  'Transportation/Logistics': { monthly: 1.4, cleanup: 1.2 },
  'Nonprofit': { monthly: 1.2, cleanup: 1.15 },
  'Law Firm': { monthly: 1.3, cleanup: 1.35 },
  'Accounting/Finance': { monthly: 1.1, cleanup: 1.1 },
  'Marketing/Advertising': { monthly: 1.15, cleanup: 1.1 },
  'Insurance': { monthly: 1.35, cleanup: 1.25 },
  'Automotive': { monthly: 1.4, cleanup: 1.2 },
  'Education': { monthly: 1.25, cleanup: 1.2 },
  'Fitness/Wellness': { monthly: 1.3, cleanup: 1.15 },
  'Entertainment/Events': { monthly: 1.5, cleanup: 1.3 },
  'Agriculture': { monthly: 1.45, cleanup: 1.2 },
  'Technology/IT Services': { monthly: 1.1, cleanup: 1.05 },
  'Multi-entity/Holding Companies': { monthly: 1.35, cleanup: 1.25 },
  'Other': { monthly: 1.2, cleanup: 1.15 }
};

function roundToNearest5(num: number): number {
  return Math.round(num / 5) * 5;
}

function roundToNearest25(num: number): number {
  return Math.ceil(num / 25) * 25;
}

function calculateFees(data: Partial<FormData>) {
  if (!data.revenueBand || !data.monthlyTransactions || !data.industry || data.cleanupMonths === undefined) {
    return { 
      monthlyFee: 0, 
      setupFee: 0,
      breakdown: {
        baseFee: 0,
        revenueMultiplier: 1,
        afterRevenue: 0,
        txFee: 0,
        afterTx: 0,
        industryMultiplier: 1,
        finalMonthly: 0,
        cleanupComplexity: 0,
        cleanupMonths: 0,
        setupCalc: 0
      }
    };
  }
  
  // If cleanup months is 0, cleanup complexity is not required
  if (data.cleanupMonths > 0 && !data.cleanupComplexity) {
    return { 
      monthlyFee: 0, 
      setupFee: 0,
      breakdown: {
        baseFee: 0,
        revenueMultiplier: 1,
        afterRevenue: 0,
        txFee: 0,
        afterTx: 0,
        industryMultiplier: 1,
        finalMonthly: 0,
        cleanupComplexity: 0,
        cleanupMonths: 0,
        setupCalc: 0
      }
    };
  }

  const revenueMultiplier = revenueMultipliers[data.revenueBand as keyof typeof revenueMultipliers] || 1.0;
  const txFee = txSurcharge[data.monthlyTransactions as keyof typeof txSurcharge] || 0;
  const industryData = industryMultipliers[data.industry as keyof typeof industryMultipliers] || { monthly: 1, cleanup: 1 };
  
  // Step-by-step calculation for breakdown
  const afterRevenue = baseMonthlyFee * revenueMultiplier;
  const afterTx = afterRevenue + txFee;
  let monthlyFee = Math.round(afterTx * industryData.monthly);
  
  // Add QBO Subscription fee if selected
  if (data.qboSubscription) {
    monthlyFee += 80;
  }
  
  // Use the actual cleanup months value (override just allows values below normal minimum)
  const effectiveCleanupMonths = data.cleanupMonths;
  
  // Calculate setup fee - custom setup fee ALWAYS overrides calculated values
  let setupFee = 0;
  let setupCalc = 0;
  const cleanupComplexityMultiplier = parseFloat(data.cleanupComplexity || "0.5");
  let industryCleanupMultiplier = 1;
  let cleanupBeforeIndustry = 0;
  
  // Check for custom setup fee override first (takes precedence regardless of cleanup months)
  if (data.overrideReason === "Other" && data.customSetupFee && parseFloat(data.customSetupFee) > 0) {
    setupFee = parseFloat(data.customSetupFee);
  } else if (effectiveCleanupMonths > 0) {
    // Standard cleanup calculation only if no custom override
    industryCleanupMultiplier = industryData.cleanup;
    cleanupBeforeIndustry = monthlyFee * cleanupComplexityMultiplier * effectiveCleanupMonths;
    const cleanupMultiplier = cleanupComplexityMultiplier * industryData.cleanup;
    setupCalc = monthlyFee * cleanupMultiplier * effectiveCleanupMonths;
    setupFee = roundToNearest25(Math.max(monthlyFee, setupCalc));
  }
  // If cleanup months is 0 and no custom override, setup fee remains 0
  
  return { 
    monthlyFee, 
    setupFee,
    breakdown: {
      baseFee: baseMonthlyFee,
      revenueMultiplier,
      afterRevenue: Math.round(afterRevenue),
      txFee,
      afterTx: Math.round(afterTx),
      industryMultiplier: industryData.monthly,
      finalMonthly: monthlyFee,
      cleanupComplexity: cleanupComplexityMultiplier * 100, // As percentage
      cleanupMonths: effectiveCleanupMonths,
      setupCalc: Math.round(setupCalc),
      cleanupBeforeIndustry: Math.round(cleanupBeforeIndustry),
      industryCleanupMultiplier
    }
  };
}

// TaaS-specific calculation function based on provided logic
function calculateTaaSFees(data: Partial<FormData>, existingBookkeepingFees?: { monthlyFee: number; setupFee: number }) {
  if (!data.revenueBand || !data.industry || !data.entityType || !data.numEntities || !data.statesFiled || 
      data.internationalFiling === undefined || !data.numBusinessOwners || !data.bookkeepingQuality || 
      data.include1040s === undefined || data.priorYearsUnfiled === undefined || data.alreadyOnSeedBookkeeping === undefined) {
    return { 
      monthlyFee: 0, 
      setupFee: 0,
      breakdown: {
        base: 0,
        entityUpcharge: 0,
        stateUpcharge: 0,
        intlUpcharge: 0,
        ownerUpcharge: 0,
        bookUpcharge: 0,
        personal1040: 0,
        beforeMultipliers: 0,
        industryMult: 1,
        revenueMult: 1,
        afterMultipliers: 0,
        seedDiscount: 0,
        finalMonthly: 0,
        priorYearsUnfiled: 0,
        perYearFee: 0,
        setupFee: 0
      }
    };
  }

  const base = 150;

  // Get effective numbers (use custom values if "more" is selected)
  const effectiveNumEntities = data.customNumEntities || data.numEntities;
  const effectiveStatesFiled = data.customStatesFiled || data.statesFiled;
  const effectiveNumBusinessOwners = data.customNumBusinessOwners || data.numBusinessOwners;

  // Entity upcharge: Every entity above 5 adds $75/mo
  let entityUpcharge = 0;
  if (effectiveNumEntities > 5) {
    entityUpcharge = (effectiveNumEntities - 5) * 75;
  }
  
  // State upcharge: $50 per state above 1, up to 50 states
  let stateUpcharge = 0;
  if (effectiveStatesFiled > 1) {
    const additionalStates = Math.min(effectiveStatesFiled - 1, 49); // Cap at 49 additional states (50 total)
    stateUpcharge = additionalStates * 50;
  }
  
  // International filing upcharge
  const intlUpcharge = data.internationalFiling ? 200 : 0;
  
  // Owner upcharge: Every owner above 5 is $25/mo per owner
  let ownerUpcharge = 0;
  if (effectiveNumBusinessOwners > 5) {
    ownerUpcharge = (effectiveNumBusinessOwners - 5) * 25;
  }
  
  // Bookkeeping quality upcharge
  const bookUpcharge = data.bookkeepingQuality === 'Clean (Seed)' ? 0 : 
                       data.bookkeepingQuality === 'Outside CPA' ? 75 : 150;
  
  // Personal 1040s
  const personal1040 = data.include1040s ? effectiveNumBusinessOwners * 25 : 0;

  // Use the same comprehensive industry multipliers as bookkeeping (monthly values)
  const industryData = industryMultipliers[data.industry as keyof typeof industryMultipliers] || { monthly: 1.0, cleanup: 1.0 };
  const industryMult = industryData.monthly;

  // Revenue multiplier (map our revenue bands to average monthly revenue)
  const avgMonthlyRevenue = data.revenueBand === '<$10K' ? 5000 :
                           data.revenueBand === '10K-25K' ? 17500 :
                           data.revenueBand === '25K-75K' ? 50000 :
                           data.revenueBand === '75K-250K' ? 162500 :
                           data.revenueBand === '250K-1M' ? 625000 :
                           data.revenueBand === '1M+' ? 1000000 : 5000;

  const revenueMult = avgMonthlyRevenue <= 10000 ? 1.0 :
                     avgMonthlyRevenue <= 25000 ? 1.2 :
                     avgMonthlyRevenue <= 75000 ? 1.4 :
                     avgMonthlyRevenue <= 250000 ? 1.6 :
                     avgMonthlyRevenue <= 1000000 ? 1.8 : 2.0;

  // Step-by-step calculation for breakdown
  const beforeMultipliers = base + entityUpcharge + stateUpcharge + intlUpcharge + ownerUpcharge + bookUpcharge + personal1040;
  const afterMultipliers = beforeMultipliers * industryMult * revenueMult;

  // Apply Seed Bookkeeping discount if applicable (15% for existing clients)
  const isBookkeepingClient = data.alreadyOnSeedBookkeeping;
  const seedDiscount = isBookkeepingClient ? afterMultipliers * 0.15 : 0;
  const discountedFee = afterMultipliers - seedDiscount;
  const monthlyFee = Math.max(150, Math.round(discountedFee / 5) * 5);

  // Setup fee calculation - 0.5 × monthly × 12 with $1000 minimum per year
  const perYearFee = Math.max(1000, monthlyFee * 0.5 * 12);
  const setupFee = data.priorYearsUnfiled > 0 ? Math.max(monthlyFee, perYearFee * data.priorYearsUnfiled) : 0;

  // Add intermediate calculation for better breakdown display
  const afterIndustryMult = beforeMultipliers * industryMult;

  const breakdown = {
    base,
    entityUpcharge,
    stateUpcharge,
    intlUpcharge,
    ownerUpcharge,
    bookUpcharge,
    personal1040,
    beforeMultipliers,
    industryMult,
    afterIndustryMult: Math.round(afterIndustryMult),
    revenueMult,
    afterMultipliers: Math.round(afterMultipliers),
    seedDiscount: Math.round(seedDiscount),
    finalMonthly: monthlyFee,
    priorYearsUnfiled: data.priorYearsUnfiled,
    perYearFee: Math.round(perYearFee),
    setupFee
  };

  // If we have existing bookkeeping fees, add them on top
  if (existingBookkeepingFees) {
    return {
      monthlyFee: monthlyFee + existingBookkeepingFees.monthlyFee,
      setupFee: setupFee + existingBookkeepingFees.setupFee,
      breakdown
    };
  }

  return { monthlyFee, setupFee, breakdown };
}

// Combined calculation function for quotes that include both services
function calculateCombinedFees(data: Partial<FormData>) {
  const includesBookkeeping = data.includesBookkeeping !== false; // Default to true
  const includesTaas = data.includesTaas === true;
  
  let bookkeepingFees: any = { monthlyFee: 0, setupFee: 0, breakdown: undefined };
  let taasFees: any = { monthlyFee: 0, setupFee: 0, breakdown: undefined };
  
  if (includesBookkeeping) {
    bookkeepingFees = calculateFees(data);
  }
  
  if (includesTaas) {
    taasFees = calculateTaaSFees(data);
  }
  
  return {
    bookkeeping: bookkeepingFees,
    taas: taasFees,
    combined: {
      monthlyFee: bookkeepingFees.monthlyFee + taasFees.monthlyFee,
      setupFee: bookkeepingFees.setupFee + taasFees.setupFee
    },
    includesBookkeeping,
    includesTaas
  };
}

function Home() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Approval system state
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalCode, setApprovalCode] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [customOverrideReason, setCustomOverrideReason] = useState("");
  const [hasRequestedApproval, setHasRequestedApproval] = useState(false);
  const [customSetupFee, setCustomSetupFee] = useState<string>("");
  
  // Simplified approval system - lock fields permanently after approval
  const [fieldsLocked, setFieldsLocked] = useState(false);
  const [unlockConfirmDialog, setUnlockConfirmDialog] = useState(false);
  const [originalCleanupMonths, setOriginalCleanupMonths] = useState<number>(currentMonth);
  
  // Archive dialog state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedQuoteForArchive, setSelectedQuoteForArchive] = useState<{id: number, email: string} | null>(null);
  const [dontShowArchiveDialog, setDontShowArchiveDialog] = useState(() => {
    return localStorage.getItem('dontShowArchiveDialog') === 'true';
  });
  
  // HubSpot integration state
  const [hubspotVerificationStatus, setHubspotVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'not-found'>('idle');
  const [hubspotContact, setHubspotContact] = useState<any>(null);
  const [lastVerifiedEmail, setLastVerifiedEmail] = useState('');
  
  // Existing quotes state
  const [existingQuotesForEmail, setExistingQuotesForEmail] = useState<Quote[]>([]);
  const [showExistingQuotesNotification, setShowExistingQuotesNotification] = useState(false);
  
  // Custom dialog states
  const [resetConfirmDialog, setResetConfirmDialog] = useState(false);
  const [discardChangesDialog, setDiscardChangesDialog] = useState(false);
  const [pendingQuoteToLoad, setPendingQuoteToLoad] = useState<Quote | null>(null);
  
  // Debounce state for HubSpot verification
  const [verificationTimeoutId, setVerificationTimeoutId] = useState<NodeJS.Timeout | null>(null);
  
  // TaaS state

  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
  
  // Form navigation state
  const [currentFormView, setCurrentFormView] = useState<'bookkeeping' | 'taas'>('bookkeeping');
  
  // Helper functions for navigation
  const getActiveServices = () => {
    const services: ('bookkeeping' | 'taas')[] = [];
    if (feeCalculation.includesBookkeeping) services.push('bookkeeping');
    if (feeCalculation.includesTaas) services.push('taas');
    return services;
  };
  
  const canNavigateLeft = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(currentFormView);
    return currentIndex > 0;
  };
  
  const canNavigateRight = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(currentFormView);
    return currentIndex < activeServices.length - 1;
  };
  
  const navigateLeft = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(currentFormView);
    if (currentIndex > 0) {
      setCurrentFormView(activeServices[currentIndex - 1]);
    }
  };
  
  const navigateRight = () => {
    const activeServices = getActiveServices();
    const currentIndex = activeServices.indexOf(currentFormView);
    if (currentIndex < activeServices.length - 1) {
      setCurrentFormView(activeServices[currentIndex + 1]);
    }
  };
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactEmail: "",
      revenueBand: "",
      monthlyTransactions: "",
      industry: "",
      cleanupMonths: currentMonth,
      cleanupComplexity: "",
      cleanupOverride: false,
      overrideReason: "",
      customOverrideReason: "",
      customSetupFee: "",
      companyName: "",
      quoteType: "bookkeeping",
      // Service flags for combined quotes
      includesBookkeeping: true,
      includesTaas: false,
      // TaaS defaults
      numEntities: 1,
      statesFiled: 1,
      internationalFiling: false,
      numBusinessOwners: 1,
      include1040s: false,
      priorYearsUnfiled: 0,
      alreadyOnSeedBookkeeping: false,
      qboSubscription: false,
    },
  });

  // Query to fetch all quotes
  const { data: allQuotes = [], refetch: refetchQuotes } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", { search: searchTerm, sortField, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
      
      const response = await apiRequest(`/api/quotes?${params.toString()}`);
      return response || [];
    },
    retry: false, // Don't retry on auth failures
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log('Submitting quote data:', data);
      
      // Use combined calculation system
      const feeCalculation = calculateCombinedFees(data);
      console.log('Calculated combined fees:', feeCalculation);
      
      const quoteData = {
        ...data,
        monthlyFee: feeCalculation.combined.monthlyFee.toString(),
        setupFee: feeCalculation.combined.setupFee.toString(),
        taasMonthlyFee: feeCalculation.taas.monthlyFee.toString(),
        taasPriorYearsFee: feeCalculation.taas.setupFee.toString(),
        approvalRequired: data.cleanupOverride && isApproved,
      };
      
      console.log('Final quote data:', quoteData);
      
      if (editingQuoteId) {
        const response = await apiRequest(`/api/quotes/${editingQuoteId}`, {
          method: "PUT",
          body: JSON.stringify(quoteData)
        });
        return response;
      } else {
        const response = await apiRequest("/api/quotes", {
          method: "POST",
          body: JSON.stringify(quoteData)
        });
        return response;
      }
    },
    onSuccess: (data) => {
      console.log('Quote saved successfully:', data);
      toast({
        title: editingQuoteId ? "Quote Updated" : "Quote Saved",
        description: editingQuoteId ? "Your quote has been updated successfully." : "Your quote has been saved successfully.",
      });
      // When saving a new quote, set editingQuoteId so user can immediately update it in HubSpot
      if (!editingQuoteId && data.id) {
        setEditingQuoteId(data.id);
      }
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      refetchQuotes();
    },
    onError: (error) => {
      console.error('Quote save error:', error);
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Archive quote mutation
  const archiveQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const response = await apiRequest(`/api/quotes/${quoteId}/archive`, {
        method: "PATCH",
        body: JSON.stringify({})
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Quote Archived",
        description: "Quote has been archived successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      refetchQuotes();
    },
    onError: (error) => {
      console.error('Archive error:', error);
      toast({
        title: "Error",
        description: "Failed to archive quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleArchiveQuote = (quoteId: number, contactEmail: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click event
    
    // If user has chosen to not show the dialog, directly archive
    if (dontShowArchiveDialog) {
      archiveQuoteMutation.mutate(quoteId);
      return;
    }
    
    // Otherwise, show the custom dialog
    setSelectedQuoteForArchive({ id: quoteId, email: contactEmail });
    setArchiveDialogOpen(true);
  };

  const handleConfirmArchive = () => {
    if (selectedQuoteForArchive) {
      archiveQuoteMutation.mutate(selectedQuoteForArchive.id);
      setArchiveDialogOpen(false);
      setSelectedQuoteForArchive(null);
    }
  };

  const handleArchiveDialogDontShow = (checked: boolean) => {
    setDontShowArchiveDialog(checked);
    localStorage.setItem('dontShowArchiveDialog', checked.toString());
  };

  // HubSpot email verification with proper debouncing
  const verifyHubSpotEmail = async (email: string) => {
    if (!email || email === lastVerifiedEmail) return;
    
    // Clear any pending verification timeout
    if (verificationTimeoutId) {
      clearTimeout(verificationTimeoutId);
    }
    
    setHubspotVerificationStatus('verifying');
    setLastVerifiedEmail(email);
    
    try {
      // Check for existing quotes and verify HubSpot contact in parallel
      const [hubspotResult, existingQuotesResult] = await Promise.all([
        apiRequest('/api/hubspot/verify-contact', {
          method: 'POST',
          body: JSON.stringify({ email })
        }),
        apiRequest('/api/quotes/check-existing', {
          method: 'POST',
          body: JSON.stringify({ email })
        })
      ]);
      
      // Handle HubSpot verification
      if (hubspotResult.verified && hubspotResult.contact) {
        setHubspotVerificationStatus('verified');
        setHubspotContact(hubspotResult.contact);
        
        // Clear any email validation errors since HubSpot verification succeeded
        form.clearErrors('contactEmail');
        
        // Auto-fill company name if available
        if (hubspotResult.contact.properties.company && !form.getValues('companyName')) {
          form.setValue('companyName', hubspotResult.contact.properties.company);
        }
      } else {
        setHubspotVerificationStatus('not-found');
        setHubspotContact(null);
      }
      
      // Handle existing quotes
      if (existingQuotesResult.hasExistingQuotes) {
        setExistingQuotesForEmail(existingQuotesResult.quotes);
        setShowExistingQuotesNotification(true);
        // Automatically filter the saved quotes table to show only this email's quotes
        setSearchTerm(email);
      } else {
        setExistingQuotesForEmail([]);
        setShowExistingQuotesNotification(false);
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      setHubspotVerificationStatus('not-found');
      setHubspotContact(null);
      setExistingQuotesForEmail([]);
      setShowExistingQuotesNotification(false);
    }
  };

  // Debounced email verification function
  const debouncedVerifyEmail = (email: string) => {
    // Clear any existing timeout
    if (verificationTimeoutId) {
      clearTimeout(verificationTimeoutId);
    }
    
    // Set verification status to idle while waiting
    setHubspotVerificationStatus('idle');
    
    // Set new timeout
    const timeoutId = setTimeout(() => {
      if (email && email.includes('@') && email.includes('.')) {
        verifyHubSpotEmail(email);
      }
    }, 750); // Increased debounce delay to 750ms for better UX
    
    setVerificationTimeoutId(timeoutId);
  };

  // Push to HubSpot mutation
  const pushToHubSpotMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const result = await apiRequest("/api/hubspot/push-quote", {
        method: "POST",
        body: JSON.stringify({ quoteId })
      });
      return { ...result, quoteId }; // Include the original quoteId in the response
    },
    onSuccess: (data) => {
      toast({
        title: "Pushed to HubSpot",
        description: `Deal "${data.dealName}" created successfully in HubSpot.`,
      });
      // Set editingQuoteId so subsequent changes can update the HubSpot quote
      if (data.quoteId) {
        setEditingQuoteId(data.quoteId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      refetchQuotes();
    },
    onError: (error: any) => {
      console.error('Push to HubSpot error:', error);
      toast({
        title: "HubSpot Error",
        description: error.message || "Failed to push quote to HubSpot. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update HubSpot quote mutation
  const updateHubSpotMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const currentFormData = form.getValues();
      
      // Ensure calculated fees are included in form data
      const enhancedFormData = {
        ...currentFormData,
        monthlyFee: feeCalculation.combined.monthlyFee.toString(),
        setupFee: feeCalculation.combined.setupFee.toString(),
        taasMonthlyFee: feeCalculation.taas.monthlyFee.toString(),
        taasPriorYearsFee: feeCalculation.taas.setupFee.toString()
      };
      
      const result = await apiRequest("/api/hubspot/update-quote", {
        method: "POST",
        body: JSON.stringify({
          quoteId, 
          currentFormData: enhancedFormData 
        })
      });
      return result;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "HubSpot Updated",
          description: "Quote successfully updated in HubSpot and saved.",
        });
        // Refresh the quotes list to show updated data
        queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
        refetchQuotes();
        setHasUnsavedChanges(false);
      } else if (data.needsNewQuote) {
        toast({
          title: "Quote Expired",
          description: "The HubSpot quote is no longer active. Use 'Push to HubSpot' to create a new quote.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('Update HubSpot error:', error);
      toast({
        title: "HubSpot Error",
        description: error.message || "Failed to update quote in HubSpot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();
  
  // Calculate fees using combined system
  const feeCalculation = calculateCombinedFees(watchedValues);
  const monthlyFee = feeCalculation.combined.monthlyFee;
  const setupFee = feeCalculation.combined.setupFee;
  
  const isCalculated = monthlyFee > 0;
  


  // Track form changes for unsaved changes detection
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (verificationTimeoutId) {
        clearTimeout(verificationTimeoutId);
      }
    };
  }, [verificationTimeoutId]);

  const loadQuoteIntoForm = async (quote: Quote) => {
    if (hasUnsavedChanges) {
      setPendingQuoteToLoad(quote);
      setDiscardChangesDialog(true);
      return;
    }
    
    doLoadQuote(quote);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const resetForm = () => {
    // Always show confirmation dialog when there are changes or when editing a quote
    if (hasUnsavedChanges || editingQuoteId !== null) {
      setResetConfirmDialog(true);
      return;
    }
    
    doResetForm();
  };

  // Helper function to actually load a quote (used by both direct loading and after dialog confirmation)
  const doLoadQuote = (quote: Quote) => {
    console.log('Loading quote into form:', quote);
    setEditingQuoteId(quote.id);
    
    // Set approval state before form reset
    setIsApproved(quote.approvalRequired || false);
    
    // Reset form with quote data
    const formData = {
      contactEmail: quote.contactEmail,
      revenueBand: quote.revenueBand,
      monthlyTransactions: quote.monthlyTransactions,
      industry: quote.industry,
      cleanupMonths: quote.cleanupMonths,
      cleanupComplexity: parseFloat(quote.cleanupComplexity).toString(), // Convert "1.00" to "1"
      cleanupOverride: quote.cleanupOverride || false,
      overrideReason: quote.overrideReason || "",
      companyName: quote.companyName || "",
      // Quote type and service flags
      quoteType: quote.quoteType || "bookkeeping",
      includesBookkeeping: quote.includesBookkeeping ?? true,
      includesTaas: quote.includesTaas ?? false,
      // TaaS-specific fields (ensure proper type conversion)
      entityType: quote.entityType || "LLC",
      numEntities: quote.numEntities ? Number(quote.numEntities) : 1,
      statesFiled: quote.statesFiled ? Number(quote.statesFiled) : 1,
      internationalFiling: quote.internationalFiling ?? false,
      numBusinessOwners: quote.numBusinessOwners ? Number(quote.numBusinessOwners) : 1,
      bookkeepingQuality: quote.bookkeepingQuality || "Clean (Seed)",
      include1040s: quote.include1040s ?? false,
      priorYearsUnfiled: quote.priorYearsUnfiled ? Number(quote.priorYearsUnfiled) : 0,
      alreadyOnSeedBookkeeping: quote.alreadyOnSeedBookkeeping ?? false,
    };
    
    console.log('Loading quote into form:', quote.id);
    
    form.reset(formData);
    
    // Force trigger and individual field updates to ensure all form fields update properly
    setTimeout(() => {
      // Force update individual TaaS fields to ensure Select components render correctly
      if (quote.entityType) form.setValue('entityType', quote.entityType);
      if (quote.numEntities) form.setValue('numEntities', Number(quote.numEntities));
      if (quote.statesFiled) form.setValue('statesFiled', Number(quote.statesFiled));
      if (quote.numBusinessOwners) form.setValue('numBusinessOwners', Number(quote.numBusinessOwners));
      if (quote.priorYearsUnfiled !== undefined) form.setValue('priorYearsUnfiled', Number(quote.priorYearsUnfiled));
      if (quote.bookkeepingQuality) form.setValue('bookkeepingQuality', quote.bookkeepingQuality);
      
      form.trigger();
    }, 100);
    
    // Reset HubSpot verification state and re-verify if email exists
    setHubspotVerificationStatus('idle');
    setHubspotContact(null);
    setLastVerifiedEmail('');
    
    // Re-verify the email if it exists
    if (quote.contactEmail) {
      debouncedVerifyEmail(quote.contactEmail);
    }
    
    // Set the appropriate form view based on the quote's services (delayed to ensure form reset completes)
    setTimeout(() => {
      if (quote.includesBookkeeping && quote.includesTaas) {
        // Combined quote - default to bookkeeping view
        setCurrentFormView('bookkeeping');
      } else if (quote.includesTaas) {
        // TaaS only
        setCurrentFormView('taas');
      } else {
        // Bookkeeping only (default)
        setCurrentFormView('bookkeeping');
      }
    }, 150);
    
    setHasUnsavedChanges(false);
  };

  // Helper function to actually reset the form (used by both direct reset and after dialog confirmation)
  const doResetForm = () => {
    setEditingQuoteId(null);
    form.reset({
      contactEmail: "",
      revenueBand: "",
      monthlyTransactions: "",
      industry: "",
      cleanupMonths: currentMonth,
      cleanupComplexity: "",
      cleanupOverride: false,
      overrideReason: "",
      customOverrideReason: "",
      customSetupFee: "",
      companyName: "",
      quoteType: "bookkeeping",
      // Service flags for combined quotes
      includesBookkeeping: true,
      includesTaas: false,
      // TaaS defaults
      entityType: "LLC",
      numEntities: 1,
      statesFiled: 1,
      internationalFiling: false,
      numBusinessOwners: 1,
      bookkeepingQuality: "Clean (Seed)",
      include1040s: false,
      priorYearsUnfiled: 0,
      alreadyOnSeedBookkeeping: false,
    });
    
    // Reset all HubSpot verification state
    setHubspotVerificationStatus('idle');
    setHubspotContact(null);
    setLastVerifiedEmail('');
    setIsApproved(false);
    setHasRequestedApproval(false);
    setCustomSetupFee("");
    
    // Reset existing quotes state
    setExistingQuotesForEmail([]);
    setShowExistingQuotesNotification(false);
    
    // Clear search term to show all quotes again
    setSearchTerm("");
    
    // Reset form view to default (bookkeeping)
    setCurrentFormView('bookkeeping');
    
    setHasUnsavedChanges(false);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied to Clipboard",
        description: `$${text} has been copied to your clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Request approval code from server and send Slack notification
  const requestApproval = async () => {
    setIsRequestingApproval(true);
    try {
      const formData = form.getValues();
      const fees = calculateFees(formData);
      
      // Include custom setup fee if "Other" reason is selected
      const setupFee = formData.overrideReason === "Other" && formData.customSetupFee 
        ? parseFloat(formData.customSetupFee) 
        : fees.setupFee;
      
      const result = await apiRequest("/api/approval/request", {
        method: "POST",
        body: JSON.stringify({
          contactEmail: formData.contactEmail,
          quoteData: {
            contactEmail: formData.contactEmail,
            revenueBand: formData.revenueBand,
            monthlyTransactions: formData.monthlyTransactions,
            industry: formData.industry,
            cleanupMonths: formData.cleanupMonths,
            requestedCleanupMonths: formData.cleanupMonths, // Add requested months
            overrideReason: formData.overrideReason || "",
            customOverrideReason: formData.customOverrideReason || "",
            customSetupFee: formData.customSetupFee || "",
            monthlyFee: fees.monthlyFee,
            setupFee: setupFee,
            originalCleanupMonths: currentMonth // Include original minimum
          }
        })
      });
      
      if (result) {
        setHasRequestedApproval(true);
        toast({
          title: "Approval Requested",
          description: "Check Slack for the approval code.",
        });
        setIsApprovalDialogOpen(true);
      } else {
        throw new Error('Failed to request approval');
      }
    } catch (error) {
      console.error('Error requesting approval:', error);
      toast({
        title: "Request Failed",
        description: "Failed to request approval. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingApproval(false);
    }
  };

  // Validate approval code entered by user
  const validateApprovalCode = async () => {
    if (!approvalCode || approvalCode.length !== 4) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 4-digit approval code.",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingCode(true);
    try {
      const result = await apiRequest("/api/approval/validate", {
        method: "POST",
        body: JSON.stringify({
          code: approvalCode,
          contactEmail: form.getValues().contactEmail
        })
      });
      
      if (result.valid) {
        // Lock all fields permanently after approval
        setIsApproved(true);
        setFieldsLocked(true);
        setIsApprovalDialogOpen(false);
        setApprovalCode("");
        toast({
          title: "Approval Granted",
          description: "Setup fee fields are now locked. Use the unlock button to make changes.",
        });
      } else {
        toast({
          title: "Invalid Code",
          description: result.message || "Please check the code and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error validating approval code:', error);
      toast({
        title: "Validation Failed",
        description: "Failed to validate code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCode(false);
    }
  };

  // Handle unlocking fields with confirmation
  const handleUnlockFields = () => {
    setUnlockConfirmDialog(true);
  };

  const confirmUnlockFields = () => {
    setFieldsLocked(false);
    setIsApproved(false);
    setHasRequestedApproval(false);
    setUnlockConfirmDialog(false);
    toast({
      title: "Fields Unlocked",
      description: "You can now make changes, but will need a new approval code before saving.",
      variant: "destructive",
    });
  };

  const onSubmit = (data: FormData) => {
    console.log('onSubmit called with data:', data);
    if (!isCalculated) {
      console.log('Form not calculated, isCalculated:', isCalculated);
      toast({
        title: "Calculation Required",
        description: "Please fill in all fields to calculate fees before saving.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if override is used but not approved
    if (data.cleanupOverride && !isApproved) {
      toast({
        title: "Approval Required",
        description: "You must get approval before saving quotes with cleanup overrides.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Submitting quote via createQuoteMutation');
    createQuoteMutation.mutate(data);
  };

  // Remove the old breakdown function since it's now handled in the calculation logic above

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <UniversalNavbar 
        showBackButton={true} 
        backButtonText="Back to Portal" 
        backButtonPath="/" 
      />
      
      <main className="container mx-auto px-6 py-8">
        {/* Main Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Quote Calculator</h1>
          <p className="text-lg text-green-100">Generate accurate pricing for your services</p>
        </div>

        {/* Enhanced Client Information Section */}
        <div className="max-w-5xl mx-auto mb-10">
          <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl ring-1 ring-white/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-[#e24c00] to-orange-500 rounded-xl shadow-lg">
                  <User className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-gray-900">Client Information</CardTitle>
                  <p className="text-gray-600 mt-1">Enter client details to begin quote generation</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">Contact Email *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="email"
                              placeholder="client@company.com"
                              className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-[#e24c00] text-lg h-12"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                const email = e.target.value;
                                
                                if (!email.trim()) {
                                  setExistingQuotesForEmail([]);
                                  setShowExistingQuotesNotification(false);
                                  setHubspotVerificationStatus('idle');
                                  setHubspotContact(null);
                                  setLastVerifiedEmail('');
                                  return;
                                }
                                
                                debouncedVerifyEmail(email);
                                setHasUnsavedChanges(true);
                              }}
                            />
                            {hubspotVerificationStatus === 'verifying' && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              </div>
                            )}
                            {hubspotVerificationStatus === 'verified' && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                            {hubspotVerificationStatus === 'not-found' && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <XCircle className="h-4 w-4 text-red-500" />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                        {hubspotVerificationStatus === 'verified' && hubspotContact && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">Contact verified in HubSpot</span>
                            </div>
                            {hubspotContact.companyName && (
                              <div className="mt-1 text-sm text-green-700">
                                Company: <span className="font-medium">{hubspotContact.companyName}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {hubspotVerificationStatus === 'not-found' && (
                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium text-red-800">Contact not found in HubSpot</span>
                            </div>
                            <div className="mt-1 text-sm text-red-700">
                              This contact will be created when you save the quote.
                            </div>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">Company Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Company Name"
                            className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-[#e24c00] text-lg h-12"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setHasUnsavedChanges(true);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Service Selection - Compact for 6 services */}
        <div className="max-w-7xl mx-auto mb-10">
          <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl ring-1 ring-white/20">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-green-600 to-green-500 rounded-xl shadow-lg">
                    <Settings className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-gray-900">Service Selection</CardTitle>
                    <p className="text-gray-600 mt-1">Choose services to include in this quote</p>
                  </div>
                </div>
                {/* Templates Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Templates
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="text-gray-500">
                      No templates saved
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-4">
                {/* Bookkeeping Service Card - Compact */}
                <div 
                  className={`
                    cursor-pointer transition-all duration-300 rounded-lg p-4 border shadow-md hover:shadow-lg transform hover:scale-105
                    ${feeCalculation.includesBookkeeping 
                      ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300 shadow-green-200/50' 
                      : 'bg-gray-50 border-gray-200 hover:border-green-200 hover:bg-green-50/50'
                    }
                  `}
                  onClick={() => {
                    const newValue = !feeCalculation.includesBookkeeping;
                    form.setValue('includesBookkeeping', newValue);
                    form.trigger();
                    
                    if (newValue) {
                      setCurrentFormView('bookkeeping');
                    } else if (feeCalculation.includesTaas) {
                      setCurrentFormView('taas');
                    }
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      feeCalculation.includesBookkeeping ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      {feeCalculation.includesBookkeeping && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <h4 className={`font-semibold text-sm ${
                      feeCalculation.includesBookkeeping ? 'text-green-800' : 'text-gray-600'
                    }`}>
                      Bookkeeping
                    </h4>
                  </div>
                  <p className={`text-xs ${
                    feeCalculation.includesBookkeeping ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    Monthly books & statements
                  </p>
                </div>

                {/* TaaS Service Card - Compact */}
                <div 
                  className={`
                    cursor-pointer transition-all duration-300 rounded-lg p-4 border shadow-md hover:shadow-lg transform hover:scale-105
                    ${feeCalculation.includesTaas 
                      ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-blue-200/50' 
                      : 'bg-gray-50 border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                    }
                  `}
                  onClick={() => {
                    const newValue = !feeCalculation.includesTaas;
                    form.setValue('includesTaas', newValue);
                    form.trigger();
                    
                    if (newValue) {
                      setCurrentFormView('taas');
                    } else if (feeCalculation.includesBookkeeping) {
                      setCurrentFormView('bookkeeping');
                    }
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      feeCalculation.includesTaas ? 'bg-blue-500' : 'bg-gray-300'
                    }`}>
                      {feeCalculation.includesTaas && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <h4 className={`font-semibold text-sm ${
                      feeCalculation.includesTaas ? 'text-blue-800' : 'text-gray-600'
                    }`}>
                      TaaS
                    </h4>
                  </div>
                  <p className={`text-xs ${
                    feeCalculation.includesTaas ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    Tax prep & planning
                  </p>
                </div>

                {/* Payroll Service Card - Compact */}
                <div className="cursor-not-allowed rounded-lg p-4 border border-gray-200 bg-gray-50 opacity-60">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                      <Plus className="h-3 w-3 text-gray-500" />
                    </div>
                    <h4 className="font-semibold text-sm text-gray-500">Payroll</h4>
                  </div>
                  <p className="text-xs text-gray-500">Coming Soon</p>
                </div>

                {/* FP&A Lite Service Card - Compact */}
                <div className="cursor-not-allowed rounded-lg p-4 border border-gray-200 bg-gray-50 opacity-60">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                      <Plus className="h-3 w-3 text-gray-500" />
                    </div>
                    <h4 className="font-semibold text-sm text-gray-500">FP&A Lite</h4>
                  </div>
                  <p className="text-xs text-gray-500">Coming Soon</p>
                </div>

                {/* AP/AR Lite Service Card - Compact */}
                <div className="cursor-not-allowed rounded-lg p-4 border border-gray-200 bg-gray-50 opacity-60">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                      <Plus className="h-3 w-3 text-gray-500" />
                    </div>
                    <h4 className="font-semibold text-sm text-gray-500">AP/AR Lite</h4>
                  </div>
                  <p className="text-xs text-gray-500">Coming Soon</p>
                </div>

                {/* Fractional CFO Service Card - Compact */}
                <div className="cursor-not-allowed rounded-lg p-4 border border-gray-200 bg-gray-50 opacity-60">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                      <Plus className="h-3 w-3 text-gray-500" />
                    </div>
                    <h4 className="font-semibold text-sm text-gray-500">Fractional CFO</h4>
                  </div>
                  <p className="text-xs text-gray-500">Coming Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area - Form and Pricing */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quote Form Card */}
            <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl ring-1 ring-white/20">
              <CardContent className="p-6">
                {/* Form Navigation for Multiple Services */}
                {getActiveServices().length > 1 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-center">
                      <div className="relative bg-gray-100 rounded-xl p-1">
                        <div className="flex items-center gap-1 relative">
                          {getActiveServices().map((service) => (
                            <button
                              key={service}
                              type="button"
                              onClick={() => setCurrentFormView(service)}
                              className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                currentFormView === service
                                  ? 'bg-white shadow-md text-[#e24c00] scale-105'
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              {service === 'bookkeeping' ? 'Bookkeeping' : 'Tax Service'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic Form Content Based on Selected Services */}
                {getActiveServices().length > 0 ? (
                  <div>
                    {/* Form Header */}
                    <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-[#e24c00] to-[#ff6b35] rounded-lg">
                        {currentFormView === 'bookkeeping' ? <Calculator className="h-5 w-5 text-white" /> : <FileText className="h-5 w-5 text-white" />}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          {currentFormView === 'bookkeeping' ? 'Bookkeeping Configuration' : 'Tax Service Configuration'}
                        </h2>
                        <p className="text-sm text-gray-600">
                          {currentFormView === 'bookkeeping' ? 'Configure bookkeeping service parameters' : 'Configure tax service parameters'}
                        </p>
                      </div>
                    </div>

                    {/* Bookkeeping Form */}
                    {currentFormView === 'bookkeeping' && feeCalculation.includesBookkeeping && (
                      <Form {...form}>
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="revenueBand"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Revenue Band</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select revenue band" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="0-250k">$0 - $250K</SelectItem>
                                      <SelectItem value="250k-500k">$250K - $500K</SelectItem>
                                      <SelectItem value="500k-1m">$500K - $1M</SelectItem>
                                      <SelectItem value="1m-3m">$1M - $3M</SelectItem>
                                      <SelectItem value="3m-5m">$3M - $5M</SelectItem>
                                      <SelectItem value="5m+">$5M+</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="monthlyTransactions"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Monthly Transactions</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select transaction volume" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="0-50">0 - 50</SelectItem>
                                      <SelectItem value="51-150">51 - 150</SelectItem>
                                      <SelectItem value="151-300">151 - 300</SelectItem>
                                      <SelectItem value="301-500">301 - 500</SelectItem>
                                      <SelectItem value="501-1000">501 - 1000</SelectItem>
                                      <SelectItem value="1000+">1000+</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="industry"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Industry</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select industry" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Professional Services">Professional Services</SelectItem>
                                      <SelectItem value="E-commerce">E-commerce</SelectItem>
                                      <SelectItem value="Restaurant/Food Service">Restaurant/Food Service</SelectItem>
                                      <SelectItem value="Hospitality">Hospitality</SelectItem>
                                      <SelectItem value="Real Estate">Real Estate</SelectItem>
                                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                                      <SelectItem value="Technology">Technology</SelectItem>
                                      <SelectItem value="Construction">Construction</SelectItem>
                                      <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="cleanupComplexity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cleanup Complexity</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select complexity" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="1">Low (1x)</SelectItem>
                                      <SelectItem value="1.25">Medium (1.25x)</SelectItem>
                                      <SelectItem value="1.5">High (1.5x)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </Form>
                    )}

                    {/* TaaS Form */}
                    {currentFormView === 'taas' && feeCalculation.includesTaas && (
                      <Form {...form}>
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="entityType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Entity Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select entity type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="LLC">LLC</SelectItem>
                                      <SelectItem value="S-Corp">S-Corp</SelectItem>
                                      <SelectItem value="C-Corp">C-Corp</SelectItem>
                                      <SelectItem value="Partnership">Partnership</SelectItem>
                                      <SelectItem value="Non-Profit">Non-Profit</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="numEntities"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Number of Entities</FormLabel>
                                  <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select entities" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="1">1</SelectItem>
                                      <SelectItem value="2">2</SelectItem>
                                      <SelectItem value="3">3</SelectItem>
                                      <SelectItem value="4">4</SelectItem>
                                      <SelectItem value="5">5</SelectItem>
                                      <SelectItem value="6">6+</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="statesFiled"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>States Filed</FormLabel>
                                  <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select states" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="1">1</SelectItem>
                                      <SelectItem value="2">2</SelectItem>
                                      <SelectItem value="3">3</SelectItem>
                                      <SelectItem value="4">4</SelectItem>
                                      <SelectItem value="5">5</SelectItem>
                                      <SelectItem value="6">6</SelectItem>
                                      <SelectItem value="7">7+</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="numBusinessOwners"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Business Owners</FormLabel>
                                  <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select owners" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="1">1</SelectItem>
                                      <SelectItem value="2">2</SelectItem>
                                      <SelectItem value="3">3</SelectItem>
                                      <SelectItem value="4">4</SelectItem>
                                      <SelectItem value="5">5</SelectItem>
                                      <SelectItem value="6">6+</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </Form>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <Settings className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Services</h3>
                        <p className="text-gray-600">Choose at least one service above to configure pricing.</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Pricing Summary */}
            <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl ring-1 ring-white/20">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-green-600 to-green-500 rounded-xl shadow-lg">
                    <DollarSign className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-gray-900">Pricing Summary</CardTitle>
                    <p className="text-gray-600 mt-1">Real-time pricing calculations</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {getActiveServices().length > 0 ? (
                  <div className="space-y-6">
                    {/* Bookkeeping Pricing */}
                    {feeCalculation.includesBookkeeping && (
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-green-800">Bookkeeping Service</h3>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-800">
                              ${feeCalculation.bookkeeping.monthlyFee.toLocaleString()}/mo
                            </div>
                            <div className="text-sm text-green-600">
                              ${feeCalculation.bookkeeping.setupFee.toLocaleString()} setup
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-green-700">Monthly bookkeeping, cleanup, and financial statements</p>
                      </div>
                    )}

                    {/* TaaS Pricing */}
                    {feeCalculation.includesTaas && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-blue-800">Tax Service (TaaS)</h3>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-800">
                              ${feeCalculation.taas.monthlyFee.toLocaleString()}/mo
                            </div>
                            <div className="text-sm text-blue-600">
                              ${feeCalculation.taas.setupFee.toLocaleString()} setup
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-blue-700">Tax preparation, filing and planning services</p>
                      </div>
                    )}

                    {/* Total Summary */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Total Monthly</h3>
                          <p className="text-sm text-gray-600">Recurring monthly fees</p>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                          ${feeCalculation.totalMonthly.toLocaleString()}/mo
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Total Setup</h3>
                          <p className="text-sm text-gray-600">One-time setup fees</p>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          ${feeCalculation.totalSetup.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-4">
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold py-3"
                        disabled={!form.formState.isValid}
                      >
                        Save Quote
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-green-300 text-green-700 hover:bg-green-50"
                      >
                        Push to HubSpot
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <DollarSign className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Selected</h3>
                        <p className="text-gray-600">Select services to see pricing calculations.</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
