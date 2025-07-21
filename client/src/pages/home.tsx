import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Copy, Save, Check, Search, ArrowUpDown, Edit, AlertCircle, Archive, CheckCircle, XCircle, Loader2, Upload, User, LogOut, Calculator, FileText, Sparkles, DollarSign, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

// Get current month number (1-12)
const currentMonth = new Date().getMonth() + 1;

// Create form schema without the calculated fields
const formSchema = insertQuoteSchema.omit({
  monthlyFee: true,
  setupFee: true,
  hubspotContactId: true,
  hubspotDealId: true,
  hubspotQuoteId: true,
  hubspotContactVerified: true,
}).extend({
  contactEmail: z.string().email("Please enter a valid email address"),
  cleanupMonths: z.number().min(0, "Cannot be negative"),
  cleanupOverride: z.boolean().default(false),
  overrideReason: z.string().optional(),
  customOverrideReason: z.string().optional(),
  companyName: z.string().optional(),
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
  
  // If override is not checked or not approved, enforce minimum cleanup months
  if (!data.cleanupOverride && data.cleanupMonths < currentMonth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Minimum ${currentMonth} months required (current calendar year) unless override is approved`,
      path: ["cleanupMonths"],
    });
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
    return { monthlyFee: 0, setupFee: 0 };
  }
  
  // If cleanup months is 0, cleanup complexity is not required
  if (data.cleanupMonths > 0 && !data.cleanupComplexity) {
    return { monthlyFee: 0, setupFee: 0 };
  }

  const revenueMultiplier = revenueMultipliers[data.revenueBand as keyof typeof revenueMultipliers] || 1.0;
  const txFee = txSurcharge[data.monthlyTransactions as keyof typeof txSurcharge] || 0;
  const industryData = industryMultipliers[data.industry as keyof typeof industryMultipliers] || { monthly: 1, cleanup: 1 };
  
  // Dynamic calculation: base fee * revenue multiplier + transaction surcharge, then apply industry multiplier
  const monthlyFee = Math.round((baseMonthlyFee * revenueMultiplier + txFee) * industryData.monthly);
  
  // Use the actual cleanup months value (override just allows values below normal minimum)
  const effectiveCleanupMonths = data.cleanupMonths;
  
  // If no cleanup months, setup fee is $0, but monthly fee remains normal
  let setupFee = 0;
  if (effectiveCleanupMonths > 0) {
    const cleanupMultiplier = parseFloat(data.cleanupComplexity || "0.75") * industryData.cleanup;
    setupFee = roundToNearest25(Math.max(monthlyFee, monthlyFee * cleanupMultiplier * effectiveCleanupMonths));
  }
  
  return { monthlyFee, setupFee };
}

export default function Home() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
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
      companyName: "",
    },
  });

  // Query to fetch all quotes
  const { data: allQuotes = [], refetch: refetchQuotes } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", { search: searchTerm, sortField, sortOrder }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
      
      return fetch(`/api/quotes?${params.toString()}`)
        .then(res => res.json());
    }
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log('Submitting quote data:', data);
      const fees = calculateFees(data);
      console.log('Calculated fees:', fees);
      
      const quoteData = {
        ...data,
        monthlyFee: fees.monthlyFee.toString(),
        setupFee: fees.setupFee.toString(),
        approvalRequired: data.cleanupOverride && isApproved,
      };
      
      console.log('Final quote data:', quoteData);
      
      if (editingQuoteId) {
        const response = await apiRequest("PUT", `/api/quotes/${editingQuoteId}`, quoteData);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/quotes", quoteData);
        return response.json();
      }
    },
    onSuccess: (data) => {
      console.log('Quote saved successfully:', data);
      toast({
        title: editingQuoteId ? "Quote Updated" : "Quote Saved",
        description: editingQuoteId ? "Your quote has been updated successfully." : "Your quote has been saved successfully.",
      });
      setEditingQuoteId(null);
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
      const response = await apiRequest("PATCH", `/api/quotes/${quoteId}/archive`, {});
      return response.json();
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
      const [hubspotResponse, existingQuotesResponse] = await Promise.all([
        apiRequest('POST', '/api/hubspot/verify-contact', { email }),
        apiRequest('POST', '/api/quotes/check-existing', { email })
      ]);
      
      const hubspotResult = await hubspotResponse.json();
      const existingQuotesResult = await existingQuotesResponse.json();
      
      // Handle HubSpot verification
      if (hubspotResult.verified && hubspotResult.contact) {
        setHubspotVerificationStatus('verified');
        setHubspotContact(hubspotResult.contact);
        
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
      const response = await apiRequest("POST", "/api/hubspot/push-quote", { quoteId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pushed to HubSpot",
        description: `Deal "${data.dealName}" created successfully in HubSpot.`,
      });
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
      const response = await apiRequest("POST", "/api/hubspot/update-quote", { 
        quoteId, 
        currentFormData 
      });
      return response.json();
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
  const { monthlyFee, setupFee } = calculateFees(watchedValues);
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
    };
    
    console.log('Resetting form with data:', formData);
    form.reset(formData);
    
    // Use setTimeout to ensure form is reset before checking values
    setTimeout(() => {
      console.log('Form values after reset:', form.getValues());
    }, 50);
    
    // Reset HubSpot verification state and re-verify if email exists
    setHubspotVerificationStatus('idle');
    setHubspotContact(null);
    setLastVerifiedEmail('');
    
    // Re-verify the email if it exists
    if (quote.contactEmail) {
      debouncedVerifyEmail(quote.contactEmail);
    }
    
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
      companyName: "",
    });
    
    // Reset all HubSpot verification state
    setHubspotVerificationStatus('idle');
    setHubspotContact(null);
    setLastVerifiedEmail('');
    setIsApproved(false);
    
    // Reset existing quotes state
    setExistingQuotesForEmail([]);
    setShowExistingQuotesNotification(false);
    
    // Clear search term to show all quotes again
    setSearchTerm("");
    
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
      
      const response = await apiRequest("POST", "/api/approval/request", {
        contactEmail: formData.contactEmail,
        quoteData: {
          contactEmail: formData.contactEmail,
          revenueBand: formData.revenueBand,
          monthlyTransactions: formData.monthlyTransactions,
          industry: formData.industry,
          cleanupMonths: formData.cleanupMonths,
          overrideReason: formData.overrideReason || "",
          customOverrideReason: formData.customOverrideReason || "",
          monthlyFee: fees.monthlyFee,
          setupFee: fees.setupFee
        }
      });
      
      if (response.ok) {
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
      const response = await apiRequest("POST", "/api/approval/validate", {
        code: approvalCode,
        contactEmail: form.getValues().contactEmail
      });
      
      const result = await response.json();
      
      if (result.valid) {
        setIsApproved(true);
        setIsApprovalDialogOpen(false);
        setApprovalCode("");
        toast({
          title: "Approval Granted",
          description: "You can now modify cleanup months.",
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
    
    console.log('Submitting quote via createQuoteMutation');
    createQuoteMutation.mutate(data);
  };

  const getBreakdownValues = () => {
    if (!watchedValues.revenueBand || !watchedValues.monthlyTransactions || !watchedValues.industry) {
      return null;
    }
    
    const revenueMultiplier = revenueMultipliers[watchedValues.revenueBand as keyof typeof revenueMultipliers] || 1.0;
    const baseFee = Math.round(baseMonthlyFee * revenueMultiplier);
    const txFee = txSurcharge[watchedValues.monthlyTransactions as keyof typeof txSurcharge] || 0;
    const industryData = industryMultipliers[watchedValues.industry as keyof typeof industryMultipliers] || { monthly: 1, cleanup: 1 };
    
    return { baseFee, txFee, multiplier: industryData.monthly, revenueMultiplier };
  };

  const breakdown = getBreakdownValues();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="relative mb-8">
          {/* User Menu - Top Right */}
          <div className="absolute top-0 right-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:text-orange-200 hover:bg-white/10">
                  <User className="h-4 w-4 mr-2" />
                  {user?.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled>
                  <User className="h-4 w-4 mr-2" />
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {logoutMutation.isPending ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Logo and Title - Center */}
          <div className="text-center">
            <img 
              src={logoPath} 
              alt="Seed Financial Logo" 
              className="h-16 mx-auto mb-4"
            />
            <p className="text-lg text-gray-200">
              Internal Pricing Calculator
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Card */}
          <Card className="bg-gray-50 shadow-xl border-0 quote-card">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-[#253e31] to-[#75c29a] rounded-lg">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Quote Builder
                  </h2>
                  <p className="text-sm text-gray-500">Configure your pricing details</p>
                </div>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Contact Email */}
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="email"
                              placeholder="client@company.com"
                              className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent pr-10"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                const email = e.target.value;
                                
                                // If email is cleared, reset existing quotes state
                                if (!email.trim()) {
                                  setExistingQuotesForEmail([]);
                                  setShowExistingQuotesNotification(false);
                                  setHubspotVerificationStatus('idle');
                                  setHubspotContact(null);
                                  setLastVerifiedEmail('');
                                  setSearchTerm(""); // Clear search filter when email is cleared
                                  form.setValue('companyName', ''); // Clear company name when email is cleared
                                }
                                
                                debouncedVerifyEmail(email);
                              }}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              {hubspotVerificationStatus === 'verifying' && (
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              )}
                              {hubspotVerificationStatus === 'verified' && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              {hubspotVerificationStatus === 'not-found' && (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Company Name */}
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Company Name"
                            className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        {hubspotVerificationStatus === 'verified' && hubspotContact?.properties.company && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Found in HubSpot: {hubspotContact.properties.company}
                          </p>
                        )}
                        {hubspotVerificationStatus === 'not-found' && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠ Contact not found in HubSpot - quote will be saved but cannot be pushed to HubSpot
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* Existing Quotes Notification */}
                  {showExistingQuotesNotification && existingQuotesForEmail.length > 0 && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <strong>Existing quotes found!</strong> This email has {existingQuotesForEmail.length} existing quote{existingQuotesForEmail.length > 1 ? 's' : ''}. 
                        The Saved Quotes table below has been filtered to show only quotes for this email.
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 ml-2 text-blue-600 underline"
                          onClick={() => setShowExistingQuotesNotification(false)}
                        >
                          Dismiss
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Monthly Transactions */}
                  <FormField
                    control={form.control}
                    name="monthlyTransactions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Transactions</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                              <SelectValue placeholder="Select transaction volume" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="<100">&lt;100</SelectItem>
                            <SelectItem value="100-300">100 - 300</SelectItem>
                            <SelectItem value="300-600">300 - 600</SelectItem>
                            <SelectItem value="600-1000">600 - 1,000</SelectItem>
                            <SelectItem value="1000-2000">1,000 - 2,000</SelectItem>
                            <SelectItem value="2000+">2,000+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Revenue Band */}
                  <FormField
                    control={form.control}
                    name="revenueBand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Revenue Band</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                              <SelectValue placeholder="Select revenue band" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="<$10K">&lt;$10K</SelectItem>
                            <SelectItem value="10K-25K">$10K - $25K</SelectItem>
                            <SelectItem value="25K-75K">$25K - $75K</SelectItem>
                            <SelectItem value="75K-250K">$75K - $250K</SelectItem>
                            <SelectItem value="250K-1M">$250K - $1M</SelectItem>
                            <SelectItem value="1M+">$1M+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Industry */}
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Software/SaaS">Software/SaaS</SelectItem>
                            <SelectItem value="Professional Services">Professional Services</SelectItem>
                            <SelectItem value="Consulting">Consulting</SelectItem>
                            <SelectItem value="Healthcare/Medical">Healthcare/Medical</SelectItem>
                            <SelectItem value="Real Estate">Real Estate</SelectItem>
                            <SelectItem value="Property Management">Property Management</SelectItem>
                            <SelectItem value="E-commerce/Retail">E-commerce/Retail</SelectItem>
                            <SelectItem value="Restaurant/Food Service">Restaurant/Food Service</SelectItem>
                            <SelectItem value="Construction/Trades">Construction/Trades</SelectItem>
                            <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="Transportation/Logistics">Transportation/Logistics</SelectItem>
                            <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                            <SelectItem value="Law Firm">Law Firm</SelectItem>
                            <SelectItem value="Accounting/Finance">Accounting/Finance</SelectItem>
                            <SelectItem value="Marketing/Advertising">Marketing/Advertising</SelectItem>
                            <SelectItem value="Insurance">Insurance</SelectItem>
                            <SelectItem value="Automotive">Automotive</SelectItem>
                            <SelectItem value="Education">Education</SelectItem>
                            <SelectItem value="Fitness/Wellness">Fitness/Wellness</SelectItem>
                            <SelectItem value="Entertainment/Events">Entertainment/Events</SelectItem>
                            <SelectItem value="Agriculture">Agriculture</SelectItem>
                            <SelectItem value="Technology/IT Services">Technology/IT Services</SelectItem>
                            <SelectItem value="Multi-entity/Holding Companies">Multi-entity/Holding Companies</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cleanup Complexity */}
                  <FormField
                    control={form.control}
                    name="cleanupComplexity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cleanup Complexity</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                              <SelectValue placeholder="Select complexity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0.5">Clean and Current</SelectItem>
                            <SelectItem value="0.75">Standard</SelectItem>
                            <SelectItem value="1.0">Not Done / Years Behind</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cleanup Months */}
                  <FormField
                    control={form.control}
                    name="cleanupMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Months of Cleanup Required</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={(form.watch("cleanupOverride") && isApproved) ? "0" : currentMonth.toString()}
                            max="120"
                            placeholder={currentMonth.toString()}
                            className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                            disabled={form.watch("cleanupOverride") && !isApproved}
                            {...field}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (isNaN(value)) {
                                field.onChange(form.watch("cleanupOverride") && isApproved ? 0 : currentMonth);
                              } else {
                                field.onChange(Math.max(0, value));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cleanup Override Checkbox with Request Approval Button */}
                  <FormField
                    control={form.control}
                    name="cleanupOverride"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-y-0">
                        <div className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (!checked) {
                                  form.setValue("overrideReason", "");
                                  setIsApproved(false);
                                }
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Override Minimum Cleanup
                            </FormLabel>
                          </div>
                        </div>
                        
                        {/* Request Approval Button */}
                        {form.watch("cleanupOverride") && !isApproved && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={requestApproval}
                            disabled={
                              isRequestingApproval || 
                              !form.watch("contactEmail") || 
                              !form.watch("overrideReason") ||
                              (form.watch("overrideReason") === "Other" && (!form.watch("customOverrideReason") || form.watch("customOverrideReason")?.trim() === ""))
                            }
                            className="ml-4"
                          >
                            {isRequestingApproval ? "Requesting..." : "Request Approval"}
                          </Button>
                        )}
                        
                        {/* Approval Status */}
                        {form.watch("cleanupOverride") && isApproved && (
                          <div className="text-sm text-green-600 font-medium ml-4">
                            ✓ Approved
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* Override Reason */}
                  {form.watch("cleanupOverride") && (
                    <FormField
                      control={form.control}
                      name="overrideReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                                <SelectValue placeholder="Select reason for override" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Brand New Business">Brand New Business</SelectItem>
                              <SelectItem value="Books Confirmed Current">Books Confirmed Current</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Custom reason text field when "Other" is selected */}
                  {form.watch("cleanupOverride") && form.watch("overrideReason") === "Other" && (
                    <FormField
                      control={form.control}
                      name="customOverrideReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Please explain the reason for override</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter detailed reason for cleanup months override..."
                              className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent min-h-[80px]"
                              {...field}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                field.onChange(e);
                                setCustomOverrideReason(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card className="bg-white shadow-xl border-0 quote-card">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-[#e24c00] to-[#ff6b35] rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Pricing Summary
                  </h2>
                  <p className="text-sm text-gray-500">Your calculated quote breakdown</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Monthly Fee */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-green-800">
                        Monthly Bookkeeping Fee
                      </label>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs bg-green-600 text-white border-green-600 hover:bg-green-700 shadow-sm"
                      onClick={() => copyToClipboard(monthlyFee.toLocaleString(), 'monthly')}
                      disabled={!isCalculated}
                    >
                      {copiedField === 'monthly' ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedField === 'monthly' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <div className="text-4xl font-bold text-green-800 mb-1">
                    {isCalculated ? `$${monthlyFee.toLocaleString()}` : '$0'}
                  </div>
                  <p className="text-sm text-green-600 font-medium">
                    Per month, ongoing service
                  </p>
                </div>

                {/* Setup Fee */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <label className="text-sm font-semibold text-orange-800">
                        One-time Setup Fee
                      </label>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs bg-orange-600 text-white border-orange-600 hover:bg-orange-700 shadow-sm"
                      onClick={() => copyToClipboard(setupFee.toLocaleString(), 'setup')}
                      disabled={!isCalculated}
                    >
                      {copiedField === 'setup' ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedField === 'setup' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <div className="text-4xl font-bold text-orange-800 mb-1">
                    {isCalculated ? `$${setupFee.toLocaleString()}` : '$0'}
                  </div>
                  <p className="text-sm text-orange-600 font-medium">
                    Includes {watchedValues.cleanupMonths || 0} months of cleanup
                  </p>
                </div>

                {/* Calculation Breakdown */}
                {breakdown && isCalculated && (
                  <div className="border-t pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <h3 className="text-lg font-bold text-gray-800">
                        Calculation Breakdown
                      </h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Fee:</span>
                        <span className="font-medium text-gray-800">${breakdown.baseFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction Surcharge ({watchedValues.monthlyTransactions}):</span>
                        <span className="font-medium text-gray-800">${breakdown.txFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Industry Multiplier ({watchedValues.industry}):</span>
                        <span className="font-medium text-gray-800">{breakdown.multiplier}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Revenue Modifier ({watchedValues.revenueBand}):</span>
                        <span className="font-medium text-gray-800">{breakdown.revenueMultiplier}x</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600">Monthly Fee:</span>
                        <span className="font-semibold text-gray-800">${monthlyFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Cleanup ({watchedValues.cleanupMonths} months × {parseFloat(watchedValues.cleanupComplexity || '0') * 100}%):
                        </span>
                        <span className="font-semibold text-[#e24c00]">${setupFee.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-6 space-y-3">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        console.log('Save button clicked');
                        console.log('Form values:', form.getValues());
                        console.log('Form errors:', form.formState.errors);
                        form.handleSubmit(onSubmit)();
                      }}
                      disabled={createQuoteMutation.isPending || !isCalculated}
                      className="flex-1 bg-[#253e31] text-white font-semibold py-4 px-6 rounded-lg hover:bg-[#253e31]/90 active:bg-[#253e31]/80 focus:ring-2 focus:ring-[#e24c00] focus:ring-offset-2 button-shimmer transition-all duration-300"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {createQuoteMutation.isPending ? 'Saving...' : (editingQuoteId ? 'Update Quote' : 'Save Quote')}
                    </Button>
                    
                    {(editingQuoteId || hasUnsavedChanges) && (
                      <Button
                        type="button"
                        onClick={resetForm}
                        variant="outline"
                        className="px-4 py-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  
                  {/* HubSpot Integration Button */}
                  {isCalculated && (
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={async () => {
                          // Auto-save the quote first, then push to HubSpot
                          if (!editingQuoteId && hasUnsavedChanges) {
                            // Save the quote first
                            const formData = form.getValues();
                            try {
                              await new Promise((resolve, reject) => {
                                createQuoteMutation.mutate(formData, {
                                  onSuccess: (savedQuote) => {
                                    // Now push to HubSpot
                                    pushToHubSpotMutation.mutate(savedQuote.id);
                                    resolve(savedQuote);
                                  },
                                  onError: reject
                                });
                              });
                            } catch (error) {
                              console.error('Failed to save quote before pushing to HubSpot:', error);
                            }
                          } else if (editingQuoteId) {
                            // Update existing quote in HubSpot
                            updateHubSpotMutation.mutate(editingQuoteId);
                          }
                        }}
                        disabled={
                          !isCalculated || 
                          hubspotVerificationStatus !== 'verified' || 
                          pushToHubSpotMutation.isPending || 
                          updateHubSpotMutation.isPending ||
                          createQuoteMutation.isPending
                        }
                        className="flex-1 bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-700 active:bg-orange-800 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 button-shimmer transition-all duration-300"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {pushToHubSpotMutation.isPending || updateHubSpotMutation.isPending || (createQuoteMutation.isPending && !editingQuoteId)
                          ? 'Pushing to HubSpot...' 
                          : editingQuoteId 
                            ? 'Update in HubSpot' 
                            : 'Push to HubSpot'
                        }
                      </Button>
                    </div>
                  )}
                  
                  {hubspotVerificationStatus === 'not-found' && isCalculated && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        Contact not found in HubSpot. Please verify the email address or add the contact to HubSpot before pushing.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {editingQuoteId && (
                    <Alert>
                      <Edit className="h-4 w-4" />
                      <AlertDescription>
                        Editing existing quote (ID: {editingQuoteId}). Changes will update the original quote.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {hasUnsavedChanges && !editingQuoteId && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You have unsaved changes. Remember to save your quote before leaving.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="text-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-xs font-medium text-gray-600">
                        Quote valid for 30 days
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Generated on {new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quote History Section */}
        <Card className="bg-white shadow-xl mt-8 border-0 quote-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  Saved Quotes
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage and review your quote history</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by contact email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {dontShowArchiveDialog && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDontShowArchiveDialog(false);
                    localStorage.removeItem('dontShowArchiveDialog');
                    toast({
                      title: "Archive Confirmations Enabled",
                      description: "Archive confirmation dialogs will now be shown again.",
                    });
                  }}
                  className="text-xs"
                >
                  Enable Archive Confirmations
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allQuotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No quotes found. Create your first quote above!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('contactEmail')}
                      >
                        <div className="flex items-center gap-1">
                          Contact Email
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('updatedAt')}
                      >
                        <div className="flex items-center gap-1">
                          Last Updated
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('monthlyFee')}
                      >
                        <div className="flex items-center gap-1">
                          Monthly Fee
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('setupFee')}
                      >
                        <div className="flex items-center gap-1">
                          Setup Fee
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allQuotes.map((quote) => (
                      <TableRow 
                        key={quote.id} 
                        className="cursor-pointer quote-table-row"
                        onClick={() => loadQuoteIntoForm(quote)}
                      >
                        <TableCell className="font-medium">{quote.contactEmail}</TableCell>
                        <TableCell>
                          {new Date(quote.updatedAt || quote.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-semibold">${parseFloat(quote.monthlyFee).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-[#e24c00]">${parseFloat(quote.setupFee).toLocaleString()}</TableCell>
                        <TableCell>{quote.industry}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleArchiveQuote(quote.id, quote.contactEmail, e)}
                            disabled={archiveQuoteMutation.isPending}
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            title="Archive Quote"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white text-sm opacity-80">
            Internal Tool • Seed Financial Sales Team
          </p>
        </div>
      </div>
      
      {/* Approval Code Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Approval Code</DialogTitle>
            <DialogDescription>
              Enter the 4-digit approval code from Slack to unlock cleanup month editing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="approvalCode" className="block text-sm font-medium text-gray-700 mb-2">
                Approval Code
              </label>
              <Input
                id="approvalCode"
                type="text"
                maxLength={4}
                placeholder="0000"
                value={approvalCode}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setApprovalCode(value);
                }}
                className="text-center text-2xl tracking-widest font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && approvalCode.length === 4) {
                    validateApprovalCode();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsApprovalDialogOpen(false);
                  setApprovalCode("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={validateApprovalCode}
                disabled={isValidatingCode || approvalCode.length !== 4}
                className="flex-1"
              >
                {isValidatingCode ? "Validating..." : "Validate Code"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive the quote for {selectedQuoteForArchive?.email}? 
              This will hide it from the main list but preserve it for auditing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-center space-x-2 my-4">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowArchiveDialog}
              onCheckedChange={handleArchiveDialogDontShow}
            />
            <label
              htmlFor="dontShowAgain"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Don't show this dialog again
            </label>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setArchiveDialogOpen(false);
              setSelectedQuoteForArchive(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmArchive}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Archive Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetConfirmDialog} onOpenChange={setResetConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Quote</AlertDialogTitle>
            <AlertDialogDescription>
              {hasUnsavedChanges 
                ? "You have unsaved changes. Are you sure you want to start a new quote? All current data will be lost."
                : "Are you sure you want to start a new quote? This will clear all current data."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setResetConfirmDialog(false);
                doResetForm();
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Start New Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Changes Dialog */}
      <AlertDialog open={discardChangesDialog} onOpenChange={setDiscardChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load Quote</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to load this quote? All current data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingQuoteToLoad(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setDiscardChangesDialog(false);
                if (pendingQuoteToLoad) {
                  doLoadQuote(pendingQuoteToLoad);
                  setPendingQuoteToLoad(null);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
            >
              Load Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
