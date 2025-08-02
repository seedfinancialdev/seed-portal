import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Control } from "react-hook-form";
import { FormData } from "./QuoteFormSchema";

interface BookkeepingSectionProps {
  control: Control<FormData>;
  currentFormView: 'bookkeeping' | 'taas';
}

export function BookkeepingSection({ control, currentFormView }: BookkeepingSectionProps) {
  if (currentFormView !== 'bookkeeping') return null;

  return (
    <div className="space-y-6 border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-800">Bookkeeping Service Details</h3>
      
      {/* Monthly Transactions */}
      <FormField
        control={control}
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

      {/* Cleanup Complexity */}
      <FormField
        control={control}
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
                <SelectItem value="0.5">Low (0.5x)</SelectItem>
                <SelectItem value="0.75">Medium (0.75x)</SelectItem>
                <SelectItem value="1.0">High (1.0x)</SelectItem>
                <SelectItem value="1.25">Very High (1.25x)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Cleanup Months */}
      <FormField
        control={control}
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
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Additional Information Section */}
      <div className="border-t pt-6 space-y-6">
        <h4 className="text-md font-medium text-gray-700">Additional Information</h4>
        
        {/* Accounting Basis */}
        <FormField
          control={control}
          name="accountingBasis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Accounting Basis</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent">
                    <SelectValue placeholder="Select accounting basis" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Accrual">Accrual</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Business Loans */}
        <FormField
          control={control}
          name="businessLoans"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="border-gray-300 data-[state=checked]:bg-[#e24c00] data-[state=checked]:border-[#e24c00]"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-normal">
                  Business Loans?
                </FormLabel>
                <p className="text-xs text-muted-foreground">
                  Check if the business has any loans
                </p>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}