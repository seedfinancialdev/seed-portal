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
      const response = await fetch("/api/quotes", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch quotes");
      return response.json();
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
      
      const quoteData = {
        ...data,
        monthlyFee: feeCalculation.combined.monthlyFee.toString(),
        setupFee: feeCalculation.combined.setupFee.toString(),
        taasMonthlyFee: feeCalculation.taas.monthlyFee.toString(),
        taasPriorYearsFee: feeCalculation.taas.setupFee.toString(),
        approvalRequired: data.cleanupOverride,
      };
      
      if (editingQuoteId) {
        const response = await apiRequest("PUT", `/api/quotes/${editingQuoteId}`, quoteData);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/quotes", quoteData);
        return response.json();
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