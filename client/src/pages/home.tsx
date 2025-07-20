import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Copy, Save, Check } from "lucide-react";
import { insertQuoteSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

// Extend the schema with validation
const formSchema = insertQuoteSchema.extend({
  contactEmail: z.string().email("Please enter a valid email address"),
  cleanupMonths: z.number().min(1, "Minimum 1 month required"),
});

type FormData = z.infer<typeof formSchema>;

// Pricing data
const baseFees = {
  '<$10K': 150,
  '10K-25K': 300,
  '25K-75K': 800,
  '75K-250K': 1200,
  '250K-1M': 1800,
  '1M+': 2500
};

const txSurcharge = {
  '<100': 0,
  '100-300': 100,
  '300-600': 500,
  '600-1000': 800,
  '1000-2000': 1200,
  '2000+': 1600
};

const complexityMultiplier = {
  'SaaS': 1.0,
  'Agencies': 1.1,
  'Real Estate': 1.05,
  'E-commerce': 1.15,
  'Construction': 1.08,
  'Multi-entity': 1.25
};

function roundToNearest5(num: number): number {
  return Math.round(num / 5) * 5;
}

function calculateFees(data: Partial<FormData>) {
  if (!data.revenueBand || !data.monthlyTransactions || !data.industry || !data.cleanupMonths || !data.cleanupComplexity) {
    return { monthlyFee: 0, setupFee: 0 };
  }

  const baseFee = baseFees[data.revenueBand as keyof typeof baseFees] || 0;
  const txFee = txSurcharge[data.monthlyTransactions as keyof typeof txSurcharge] || 0;
  const multiplier = complexityMultiplier[data.industry as keyof typeof complexityMultiplier] || 1;
  
  const monthlyFee = roundToNearest5((baseFee + txFee) * multiplier);
  const setupFee = Math.max(monthlyFee, monthlyFee * parseFloat(data.cleanupComplexity) * data.cleanupMonths);
  
  return { monthlyFee, setupFee };
}

export default function Home() {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactEmail: "",
      revenueBand: "",
      monthlyTransactions: "",
      industry: "",
      cleanupMonths: 1,
      cleanupComplexity: "",
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const fees = calculateFees(data);
      const quoteData = {
        ...data,
        monthlyFee: fees.monthlyFee.toString(),
        setupFee: fees.setupFee.toString(),
      };
      return apiRequest("POST", "/api/quotes", quoteData);
    },
    onSuccess: () => {
      toast({
        title: "Quote Saved",
        description: "Your quote has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();
  const { monthlyFee, setupFee } = calculateFees(watchedValues);
  const isCalculated = monthlyFee > 0 && setupFee > 0;

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

  const onSubmit = (data: FormData) => {
    if (!isCalculated) {
      toast({
        title: "Calculation Required",
        description: "Please fill in all fields to calculate fees before saving.",
        variant: "destructive",
      });
      return;
    }
    createQuoteMutation.mutate(data);
  };

  const getBreakdownValues = () => {
    if (!watchedValues.revenueBand || !watchedValues.monthlyTransactions || !watchedValues.industry) {
      return null;
    }
    
    const baseFee = baseFees[watchedValues.revenueBand as keyof typeof baseFees] || 0;
    const txFee = txSurcharge[watchedValues.monthlyTransactions as keyof typeof txSurcharge] || 0;
    const multiplier = complexityMultiplier[watchedValues.industry as keyof typeof complexityMultiplier] || 1;
    
    return { baseFee, txFee, multiplier };
  };

  const breakdown = getBreakdownValues();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Seed Financial
          </h1>
          <p className="text-lg text-gray-200">
            Internal Pricing Calculator
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Card */}
          <Card className="bg-gray-50 shadow-xl">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Quote Details
              </h2>
              
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
                          <Input 
                            type="email"
                            placeholder="client@company.com"
                            className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                            {...field}
                          />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                  {/* Monthly Transactions */}
                  <FormField
                    control={form.control}
                    name="monthlyTransactions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Transactions</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                  {/* Industry */}
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SaaS">SaaS</SelectItem>
                            <SelectItem value="Agencies">Agencies</SelectItem>
                            <SelectItem value="Real Estate">Real Estate</SelectItem>
                            <SelectItem value="E-commerce">E-commerce</SelectItem>
                            <SelectItem value="Construction">Construction</SelectItem>
                            <SelectItem value="Multi-entity">Multi-entity</SelectItem>
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
                            min="1"
                            placeholder="6"
                            className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                              <SelectValue placeholder="Select complexity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0.5">Easy (50%)</SelectItem>
                            <SelectItem value="0.75">Standard (75%)</SelectItem>
                            <SelectItem value="1.0">Messy AF (100%)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card className="bg-white shadow-xl">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Quote Summary
              </h2>
              
              <div className="space-y-6">
                {/* Monthly Fee */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-600">
                      Monthly Bookkeeping Fee
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs bg-[#253e31] text-white border-[#253e31] hover:bg-[#253e31]/90"
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
                  <div className="text-3xl font-bold text-gray-800">
                    {isCalculated ? `$${monthlyFee.toLocaleString()}` : '$0'}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Per month, ongoing
                  </p>
                </div>

                {/* Setup Fee */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-600">
                      One-time Setup Fee
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs bg-[#253e31] text-white border-[#253e31] hover:bg-[#253e31]/90"
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
                  <div className="text-3xl font-bold text-[#e24c00]">
                    {isCalculated ? `$${setupFee.toLocaleString()}` : '$0'}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Includes {watchedValues.cleanupMonths || 0} months of cleanup
                  </p>
                </div>

                {/* Calculation Breakdown */}
                {breakdown && isCalculated && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Breakdown
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Fee ({watchedValues.revenueBand}):</span>
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
                  <Button
                    type="submit"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={createQuoteMutation.isPending || !isCalculated}
                    className="w-full bg-[#253e31] text-white font-semibold py-4 px-6 rounded-lg hover:bg-[#253e31]/90 active:bg-[#253e31]/80 focus:ring-2 focus:ring-[#e24c00] focus:ring-offset-2"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {createQuoteMutation.isPending ? 'Saving...' : 'Save Quote'}
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      Quote valid for 30 days • Generated on {new Date().toLocaleDateString('en-US', {
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

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white text-sm opacity-80">
            Internal Tool • Seed Financial SDR Team • 
            <span className="font-medium"> Target: ≤30s quotes with ≥60% margins</span>
          </p>
        </div>
      </div>
    </div>
  );
}
