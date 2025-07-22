import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    </div>
  );
}