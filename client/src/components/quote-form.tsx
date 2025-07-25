import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SelectQuote } from "../../../shared/schema";

// Basic form schema
const formSchema = z.object({
  contactEmail: z.string().email("Please enter a valid email address"),
  companyName: z.string().optional(),
  revenueBand: z.string().min(1, "Please select a revenue band"),
  entityType: z.string().min(1, "Please select an entity type"),
  transactionVolume: z.string().min(1, "Please select transaction volume"),
  industryType: z.string().min(1, "Please select an industry type"),
  bookkeepingComplexity: z.string().min(1, "Please select complexity level"),
  bookkeepingQuality: z.string().min(1, "Please select current quality"),
  cleanupMonths: z.number().min(0).max(24),
  customSetupFee: z.string().optional(),
  includesBookkeeping: z.boolean().default(true),
  includesTaas: z.boolean().default(false),
  taasEntityType: z.string().optional(),
  taasRevenueBand: z.string().optional(),
  taasPriorYearsBehind: z.number().min(0).max(10).default(0),
  hasSeedPackage: z.boolean().default(false),
  overrideReason: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function QuoteForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showQuotes, setShowQuotes] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);

  const form = useForm<FormValues>({
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

  // Query for quotes
  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ['/api/quotes'],
    enabled: showQuotes,
  });

  // Save quote mutation
  const saveQuoteMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          monthlyFee: calculateMonthlyFee(data),
          setupFee: calculateSetupFee(data),
        }),
      });
      if (!response.ok) throw new Error('Failed to save quote');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Quote saved successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
    },
    onError: () => {
      toast({ title: "Failed to save quote", variant: "destructive" });
    },
  });

  // Archive quote mutation
  const archiveQuoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/quotes/${id}/archive`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to archive quote');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Quote archived successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
    },
  });

  // Simple pricing calculations
  const calculateMonthlyFee = (data: FormValues) => {
    const revenueBands: Record<string, number> = {
      "0-100k": 299,
      "100k-500k": 399,
      "500k-1M": 499,
      "1M-3M": 699,
      "3M-5M": 899,
      "5M+": 1199,
    };
    return revenueBands[data.revenueBand] || 299;
  };

  const calculateSetupFee = (data: FormValues) => {
    if (data.customSetupFee && !isNaN(Number(data.customSetupFee))) {
      return Number(data.customSetupFee);
    }
    return data.cleanupMonths * 150;
  };

  const onSubmit = (data: FormValues) => {
    saveQuoteMutation.mutate(data);
  };

  const loadQuote = (quote: SelectQuote) => {
    form.reset({
      contactEmail: quote.contactEmail,
      companyName: quote.companyName || "",
      revenueBand: quote.revenueBand,
      entityType: quote.entityType,
      transactionVolume: quote.transactionVolume,
      industryType: quote.industryType,
      bookkeepingComplexity: quote.bookkeepingComplexity,
      bookkeepingQuality: quote.bookkeepingQuality,
      cleanupMonths: quote.cleanupMonths,
      customSetupFee: quote.customSetupFee?.toString() || "",
      includesBookkeeping: quote.includesBookkeeping,
      includesTaas: quote.includesTaas,
      taasEntityType: quote.taasEntityType || "",
      taasRevenueBand: quote.taasRevenueBand || "",
      taasPriorYearsBehind: quote.taasPriorYearsBehind || 0,
      hasSeedPackage: quote.hasSeedPackage,
      overrideReason: quote.overrideReason || "",
    });
    setEditingQuoteId(quote.id);
    setShowQuotes(false);
  };

  if (showQuotes) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Saved Quotes</h1>
          <Button onClick={() => setShowQuotes(false)}>Back to Form</Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            {quotesLoading ? (
              <div>Loading...</div>
            ) : quotes.length === 0 ? (
              <div className="text-center text-gray-500">No saved quotes found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Revenue Band</TableHead>
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Setup Fee</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote: SelectQuote) => (
                    <TableRow key={quote.id}>
                      <TableCell>{quote.contactEmail}</TableCell>
                      <TableCell>{quote.companyName || 'N/A'}</TableCell>
                      <TableCell>{quote.revenueBand}</TableCell>
                      <TableCell>${quote.monthlyFee}</TableCell>
                      <TableCell>${quote.setupFee}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" onClick={() => loadQuote(quote)}>
                          Load
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => archiveQuoteMutation.mutate(quote.id)}
                        >
                          Archive
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const watchedValues = form.watch();
  const monthlyFee = calculateMonthlyFee(watchedValues);
  const setupFee = calculateSetupFee(watchedValues);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Quote Generator</h1>
        <p className="text-lg text-gray-600 mt-2">Generate accurate pricing for Seed Financial services</p>
      </div>

      <div className="flex items-center space-x-4 justify-center">
        <Button onClick={() => setShowQuotes(true)} variant="outline">
          View Saved Quotes
        </Button>
        <Button onClick={() => form.reset()} variant="outline">
          Reset Form
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Quote Details</CardTitle>
              <CardDescription>
                {editingQuoteId ? 'Editing existing quote' : 'Create a new quote for your client'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input placeholder="client@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Company Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              <SelectItem value="0-100k">$0 - $100k</SelectItem>
                              <SelectItem value="100k-500k">$100k - $500k</SelectItem>
                              <SelectItem value="500k-1M">$500k - $1M</SelectItem>
                              <SelectItem value="1M-3M">$1M - $3M</SelectItem>
                              <SelectItem value="3M-5M">$3M - $5M</SelectItem>
                              <SelectItem value="5M+">$5M+</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="transactionVolume"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction Volume</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select volume" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Low">Low (0-50/month)</SelectItem>
                              <SelectItem value="Medium">Medium (51-150/month)</SelectItem>
                              <SelectItem value="High">High (151-300/month)</SelectItem>
                              <SelectItem value="Very High">Very High (300+/month)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="industryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="E-commerce">E-commerce</SelectItem>
                              <SelectItem value="Professional Services">Professional Services</SelectItem>
                              <SelectItem value="Real Estate">Real Estate</SelectItem>
                              <SelectItem value="Construction">Construction</SelectItem>
                              <SelectItem value="Technology">Technology</SelectItem>
                              <SelectItem value="Healthcare">Healthcare</SelectItem>
                              <SelectItem value="Restaurant/Food Service">Restaurant/Food Service</SelectItem>
                              <SelectItem value="Hospitality">Hospitality</SelectItem>
                              <SelectItem value="Retail">Retail</SelectItem>
                              <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bookkeepingComplexity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bookkeeping Complexity</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select complexity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Simple">Simple</SelectItem>
                              <SelectItem value="Moderate">Moderate</SelectItem>
                              <SelectItem value="Complex">Complex</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bookkeepingQuality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Bookkeeping Quality</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select quality" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Outside CPA">Outside CPA</SelectItem>
                              <SelectItem value="Self-Managed">Self-Managed</SelectItem>
                              <SelectItem value="Not Done / Behind">Not Done / Behind</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cleanupMonths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cleanup Months</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="24" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customSetupFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Setup Fee (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter custom amount" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <Button 
                      type="submit" 
                      disabled={saveQuoteMutation.isPending}
                      className="px-8"
                    >
                      {saveQuoteMutation.isPending ? 'Saving...' : 
                       editingQuoteId ? 'Update Quote' : 'Save Quote'}
                    </Button>
                    
                    {editingQuoteId && (
                      <Badge variant="secondary">
                        Editing Quote #{editingQuoteId}
                      </Badge>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Display */}
        <div className="w-full lg:w-96">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Monthly Fee:</span>
                  <span className="text-xl font-bold">${monthlyFee}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Setup Fee:</span>
                  <span className="text-xl font-bold">${setupFee}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total First Month:</span>
                    <span className="text-2xl font-bold text-[#e24c00]">
                      ${monthlyFee + setupFee}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}