import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Target,
  Users,
  Award,
  Zap,
  Trophy,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Star,
  Gift,
  PlusCircle,
  Eye,
  Bell,
  User,
  Settings,
  LogOut,
  Filter,
  Download,
  Search,
  ExternalLink,
  Edit,
  FileText,
  Calculator,
  Building2,
  CreditCard,
  TrendingDown,
  AlertTriangle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Commission {
  id: string;
  dealId: string;
  dealName: string;
  companyName: string;
  salesRep: string;
  serviceType: string;
  type: 'month_1' | 'residual';
  monthNumber: number;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  dateEarned: string;
  datePaid?: string;
  hubspotDealId?: string;
}

interface Deal {
  id: string;
  dealName: string;
  companyName: string;
  salesRep: string;
  serviceType: string;
  amount: number;
  setupFee: number;
  monthlyFee: number;
  status: 'open' | 'closed_won' | 'closed_lost';
  closedDate?: string;
  hubspotDealId?: string;
  probability?: number;
  pipelineStage?: string;
}

interface AdjustmentRequest {
  id: string;
  commissionId: string;
  salesRep: string;
  originalAmount: number;
  requestedAmount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewNotes?: string;
}

export default function SalesCommissionTracker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");

  // Fetch commissions data and filter for current user
  const { data: allCommissions = [], isLoading: commissionsLoading } = useQuery({
    queryKey: ['/api/commission-tracker'],
    queryFn: async (): Promise<Commission[]> => {
      const response = await fetch('/api/commission-tracker');
      if (!response.ok) {
        throw new Error('Failed to fetch commissions');
      }
      const data = await response.json();
      
      // Filter commissions for current user
      const userFullName = `${user?.firstName} ${user?.lastName}`;
      return data.filter((commission: Commission) => 
        commission.salesRep === user?.email || commission.salesRep === userFullName
      );
    }
  });

  // Fetch pipeline projections data and filter for current user  
  const { data: allPipelineProjections = [], isLoading: pipelineLoading } = useQuery({
    queryKey: ['/api/pipeline-projections'],
    queryFn: async (): Promise<Deal[]> => {
      const response = await fetch('/api/pipeline-projections');
      if (!response.ok) {
        throw new Error('Failed to fetch pipeline projections');
      }
      const data = await response.json();
      
      // Filter pipeline projections for current user
      const userFullName = `${user?.firstName} ${user?.lastName}`;
      return data.filter((deal: Deal) => 
        deal.salesRep === user?.email || deal.salesRep === userFullName
      );
    }
  });

  // Adjustment request mutation
  const adjustmentMutation = useMutation({
    mutationFn: async (adjustmentData: {
      commissionId: string;
      requestedAmount: number;
      reason: string;
    }) => {
      const response = await apiRequest('/api/adjustment-requests', {
        method: 'POST',
        body: JSON.stringify(adjustmentData),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commission-tracker'] });
      setIsAdjustmentDialogOpen(false);
      setSelectedCommission(null);
      setAdjustmentReason("");
      setAdjustmentAmount("");
    },
  });

  // Calculate metrics
  const currentPeriodTotal = allCommissions
    .filter(c => c.status !== 'disputed')
    .reduce((sum, c) => sum + c.amount, 0);
  
  const projectedCommissions = allPipelineProjections
    .reduce((sum, deal) => sum + (deal.setupFee * 0.2 + deal.monthlyFee * 0.4), 0);

  const weightedPipeline = allPipelineProjections
    .reduce((sum, deal) => sum + ((deal.setupFee * 0.2 + deal.monthlyFee * 0.4) * (deal.probability || 50) / 100), 0);

  const handleRequestAdjustment = () => {
    if (!selectedCommission || !adjustmentAmount || !adjustmentReason) return;

    adjustmentMutation.mutate({
      commissionId: selectedCommission.id,
      requestedAmount: parseFloat(adjustmentAmount),
      reason: adjustmentReason,
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'disputed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getServiceTypeIcon = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'bookkeeping':
        return <Calculator className="h-4 w-4" />;
      case 'taas':
        return <FileText className="h-4 w-4" />;
      case 'payroll':
        return <Users className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  if (commissionsLoading || pipelineLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UniversalNavbar />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your commission data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <UniversalNavbar />
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/sales-dashboard">
              <Button variant="outline" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
                My Commission Tracker
              </h1>
              <p className="text-gray-600" data-testid="text-page-description">
                Track your personal commission earnings and pipeline projections
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Current Period */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                Current Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600" data-testid="text-current-period">
                ${currentPeriodTotal.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {allCommissions.length} commission{allCommissions.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          {/* Projected Commissions */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                Projected Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600" data-testid="text-projected-commissions">
                ${projectedCommissions.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {allPipelineProjections.length} deal{allPipelineProjections.length !== 1 ? 's' : ''} in pipeline
              </p>
            </CardContent>
          </Card>

          {/* Weighted Pipeline */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Target className="h-4 w-4 mr-2 text-purple-600" />
                Weighted Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600" data-testid="text-weighted-pipeline">
                ${weightedPipeline.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Probability-adjusted projections
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="commissions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white shadow-sm">
            <TabsTrigger value="commissions" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Commission History
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Pipeline Projections
            </TabsTrigger>
          </TabsList>

          {/* Commission History Tab */}
          <TabsContent value="commissions">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  Commission History
                </CardTitle>
                <CardDescription>
                  Your earned commissions and their current status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allCommissions.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No commissions yet</h3>
                    <p className="text-gray-500">Your commission history will appear here once deals are closed.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deal</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date Earned</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allCommissions.map((commission) => (
                          <TableRow key={commission.id}>
                            <TableCell className="font-medium">
                              {commission.dealName}
                            </TableCell>
                            <TableCell>{commission.companyName}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {getServiceTypeIcon(commission.serviceType)}
                                <span className="ml-2 capitalize">{commission.serviceType}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {commission.type === 'month_1' ? 'Month 1' : 'Residual'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              ${commission.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(commission.status)} className="capitalize">
                                {commission.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(commission.dateEarned).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {commission.status === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCommission(commission);
                                    setAdjustmentAmount(commission.amount.toString());
                                    setIsAdjustmentDialogOpen(true);
                                  }}
                                  data-testid={`button-request-adjustment-${commission.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Request Adjustment
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipeline Projections Tab */}
          <TabsContent value="pipeline">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Pipeline Projections
                </CardTitle>
                <CardDescription>
                  Projected commissions from your current sales pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allPipelineProjections.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pipeline deals</h3>
                    <p className="text-gray-500">Your pipeline projections will appear here as you work deals.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deal</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Deal Value</TableHead>
                          <TableHead>Projected Commission</TableHead>
                          <TableHead>Probability</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allPipelineProjections.map((deal) => (
                          <TableRow key={deal.id}>
                            <TableCell className="font-medium">
                              {deal.dealName}
                            </TableCell>
                            <TableCell>{deal.companyName}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {getServiceTypeIcon(deal.serviceType)}
                                <span className="ml-2 capitalize">{deal.serviceType}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {deal.pipelineStage}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              ${deal.amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-semibold text-blue-600">
                              ${(deal.setupFee * 0.2 + deal.monthlyFee * 0.4).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Progress value={deal.probability || 50} className="w-16 h-2" />
                                <span className="text-sm text-gray-500">{deal.probability || 50}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Adjustment Request Dialog */}
        <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Commission Adjustment</DialogTitle>
              <DialogDescription>
                Request an adjustment to your commission amount. Please provide a detailed reason.
              </DialogDescription>
            </DialogHeader>
            
            {selectedCommission && (
              <div className="space-y-4">
                <div>
                  <Label>Deal</Label>
                  <p className="text-sm text-gray-600">{selectedCommission.dealName}</p>
                </div>
                
                <div>
                  <Label>Current Amount</Label>
                  <p className="text-sm text-gray-600">${selectedCommission.amount.toFixed(2)}</p>
                </div>
                
                <div>
                  <Label htmlFor="adjustment-amount">Requested Amount</Label>
                  <Input
                    id="adjustment-amount"
                    type="number"
                    step="0.01"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    placeholder="Enter requested amount"
                    data-testid="input-adjustment-amount"
                  />
                </div>
                
                <div>
                  <Label htmlFor="adjustment-reason">Reason for Adjustment</Label>
                  <Textarea
                    id="adjustment-reason"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="Please provide a detailed explanation for the adjustment request..."
                    rows={4}
                    data-testid="textarea-adjustment-reason"
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAdjustmentDialogOpen(false)}
                data-testid="button-cancel-adjustment"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestAdjustment}
                disabled={!adjustmentAmount || !adjustmentReason || adjustmentMutation.isPending}
                data-testid="button-submit-adjustment"
              >
                {adjustmentMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}