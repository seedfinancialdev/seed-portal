import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { formSchema } from "./quote-form/QuoteFormSchema";
import { usePricingCalculation } from "@/hooks/usePricingCalculation";
import { useQuoteManagement } from "@/hooks/useQuoteManagement";
import { useHubSpotIntegration } from "@/hooks/useHubSpotIntegration";
import { ContactSection } from "./quote-form/ContactSection";
import { ServiceCards } from "./quote-form/ServiceCards";
import { BookkeepingSection } from "./quote-form/BookkeepingSection";
import { TaasSection } from "./quote-form/TaasSection";
import { PricingDisplay } from "./quote-form/PricingDisplay";
import { FormNavigation } from "./quote-form/FormNavigation";
import { QuoteTable } from "./quote-form/QuoteTable";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";
import type { SelectQuote } from "../../../shared/schema";

export default function QuoteForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [showQuotes, setShowQuotes] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactEmail: "",
      companyName: "",
      revenueBand: "",
      entityType: "",
      transactionVolume: "",
      industryType: "",
      bookkeepingComplexity: "",
      bookkeepingQuality: "",
      cleanupMonths: 6,
      customSetupFee: "",
      includesBookkeeping: true,
      includesTaas: false,
      taasEntityType: "",
      taasRevenueBand: "",
      taasPriorYearsBehind: 0,
      hasSeedPackage: false,
      overrideReason: "",
    },
  });

  const { pricing } = usePricingCalculation(form.watch());
  const { 
    saveQuoteMutation, 
    updateQuoteMutation, 
    archiveQuoteMutation,
    loadQuote,
    resetForm 
  } = useQuoteManagement(form, setEditingQuoteId, setCurrentStep);
  
  const {
    hubspotVerificationStatus,
    hubspotContact,
    verifyHubSpotEmail,
    pushQuoteToHubSpot,
    updateQuoteInHubSpot
  } = useHubSpotIntegration();

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleQuoteLoad = useCallback(async (quote: SelectQuote) => {
    await loadQuote(quote);
    setShowQuotes(false);
  }, [loadQuote]);

  const handleArchive = useCallback(async (quoteId: number) => {
    try {
      await archiveQuoteMutation.mutateAsync(quoteId);
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      toast({
        title: "Quote archived",
        description: "The quote has been archived successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive quote. Please try again.",
        variant: "destructive",
      });
    }
  }, [archiveQuoteMutation, queryClient, toast]);

  const handleReset = useCallback(() => {
    resetForm();
    setShowQuotes(false);
  }, [resetForm]);

  if (showQuotes) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setShowQuotes(false)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Form</span>
          </Button>
          <h1 className="text-2xl font-bold">Saved Quotes</h1>
        </div>
        
        <QuoteTable
          onLoadQuote={handleQuoteLoad}
          onArchiveQuote={handleArchive}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Quote Generator</h1>
        <p className="text-lg text-gray-600 mt-2">Generate accurate pricing for Seed Financial services</p>
      </div>

      <Form {...form}>
        <form className="space-y-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Form Sections */}
            <div className="flex-1 space-y-8">
              {/* Service Selection Cards */}
              <ServiceCards form={form} />

              {/* Step-by-step form */}
              {currentStep === 1 && (
                <ContactSection 
                  form={form}
                  verificationStatus={hubspotVerificationStatus}
                  companyName={hubspotContact?.properties?.company || ""}
                  onVerifyEmail={verifyHubSpotEmail}
                />
              )}

              {form.watch('includesBookkeeping') && currentStep === 2 && (
                <BookkeepingSection form={form} />
              )}

              {form.watch('includesTaas') && (
                (form.watch('includesBookkeeping') ? currentStep === 3 : currentStep === 2)
              ) && (
                <TaasSection form={form} />
              )}

              {/* Navigation */}
              <FormNavigation
                currentStep={currentStep}
                totalSteps={form.watch('includesBookkeeping') && form.watch('includesTaas') ? 4 : 
                           form.watch('includesBookkeeping') || form.watch('includesTaas') ? 3 : 2}
                onNext={nextStep}
                onPrev={prevStep}
                onReset={handleReset}
                onShowQuotes={() => setShowQuotes(true)}
                onSave={() => saveQuoteMutation.mutate(form.getValues())}
                onUpdate={() => updateQuoteMutation.mutate({ 
                  id: editingQuoteId!, 
                  data: form.getValues() 
                })}
                onPushToHubSpot={() => pushQuoteToHubSpot(editingQuoteId!)}
                onUpdateInHubSpot={() => updateQuoteInHubSpot(editingQuoteId!)}
                editingQuoteId={editingQuoteId}
                hubspotQuoteId={hubspotContact?.properties?.hs_object_id}
                verificationStatus={hubspotVerificationStatus}
                isSaving={saveQuoteMutation.isPending}
                isUpdating={updateQuoteMutation.isPending}
                form={form}
                pricing={pricing}
              />
            </div>

            {/* Right Column - Pricing Display */}
            <div className="w-full lg:w-96">
              <PricingDisplay 
                pricing={pricing}
                includesBookkeeping={form.watch('includesBookkeeping')}
                includesTaas={form.watch('includesTaas')}
              />
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}