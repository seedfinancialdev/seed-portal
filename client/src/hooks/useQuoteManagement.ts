import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Quote } from '@shared/schema';
import { FormData } from '@/components/quote-form/QuoteFormSchema';
import { calculateCombinedFees } from '@shared/pricing';

export function useQuoteManagement() {
  const { toast } = useToast();
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch quotes
  const {
    data: quotes = [],
    refetch: refetchQuotes,
    isLoading: quotesLoading
  } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    queryFn: async () => {
      return await apiRequest("/api/quotes");
    }
  });

  // Create/update quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Clean up null values that might cause issues with pricing calculation
      const cleanData = {
        ...data,
        entityType: data.entityType || undefined,
        cleanupComplexity: data.cleanupComplexity || undefined,
        bookkeepingQuality: data.bookkeepingQuality || undefined,
        overrideReason: data.overrideReason || undefined,
        customOverrideReason: data.customOverrideReason || undefined,
      };
      
      const feeCalculation = calculateCombinedFees(cleanData);
      
      // Ensure all numeric fields are properly converted to numbers, never null
      const quoteData = {
        ...data,
        // Convert numeric fields to ensure they're never null
        priorYearsUnfiled: Number(data.priorYearsUnfiled) || 0,
        numEntities: Number(data.numEntities) || 1,
        statesFiled: Number(data.statesFiled) || 1,
        numBusinessOwners: Number(data.numBusinessOwners) || 1,
        cleanupMonths: Number(data.cleanupMonths) || 0,
        monthlyFee: feeCalculation.combined.monthlyFee.toString(),
        setupFee: feeCalculation.combined.setupFee.toString(),
        taasMonthlyFee: feeCalculation.taas.monthlyFee.toString(),
        taasPriorYearsFee: feeCalculation.taas.setupFee.toString(),
        approvalRequired: data.cleanupOverride,
      };
      
      console.log('Sending quote data with sanitized numbers:', {
        priorYearsUnfiled: quoteData.priorYearsUnfiled,
        numEntities: quoteData.numEntities,
        statesFiled: quoteData.statesFiled,
        numBusinessOwners: quoteData.numBusinessOwners,
        cleanupMonths: quoteData.cleanupMonths,
      });
      
      if (editingQuoteId) {
        const response = await apiRequest(`/api/quotes/${editingQuoteId}`, {
          method: "PUT",
          body: JSON.stringify(quoteData)
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update quote');
        }
        return response;
      } else {
        const response = await apiRequest("/api/quotes", {
          method: "POST",
          body: JSON.stringify(quoteData)
        });
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server validation error:', errorData);
          throw new Error(errorData.message || 'Failed to save quote');
        }
        return response;
      }
    },
    onSuccess: (data) => {
      toast({
        title: editingQuoteId ? "Quote Updated" : "Quote Saved",
        description: editingQuoteId ? "Your quote has been updated successfully." : "Your quote has been saved successfully.",
      });
      setEditingQuoteId(null);
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      refetchQuotes();
    },
    onError: (error: any) => {
      console.error('Quote save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Archive quote mutation
  const archiveQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      return await apiRequest(`/api/quotes/${quoteId}/archive`, {
        method: "PATCH",
        body: JSON.stringify({})
      });
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

  return {
    quotes,
    quotesLoading,
    refetchQuotes,
    editingQuoteId,
    setEditingQuoteId,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    createQuoteMutation,
    archiveQuoteMutation
  };
}