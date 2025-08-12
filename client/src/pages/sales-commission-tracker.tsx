import { useState } from "react";
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
import { calculateMonthlyBonus, calculateMilestoneBonus, getNextMilestone, calculateTotalEarnings } from "@shared/commission-calculator";

interface Commission {
  id: string;
  dealId: string;
  dealName: string;
  companyName: string;
  salesRep: string;
  serviceType: string;
  type: 'setup' | 'month_1' | 'residual' | 'total';
  monthNumber: number;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  dateEarned: string;
  datePaid?: string;
  hubspotDealId?: string;
  setupAmount?: number;
  month1Amount?: number;
  residualAmount?: number;
  breakdown?: {
    setup: number;
    month1: number;
    residual: number;
  };
}

interface Deal {
  id: string;
  dealId?: string;
  dealName: string;
  companyName: string;
  salesRep: string;
  serviceType: string;
  dealValue: number;
  dealStage: string;
  setupCommission: number;
  monthlyCommission: number;
  projectedCommission: number;
  closeDate?: string;
  createDate: string;
  status: 'projected' | 'closed_won' | 'closed_lost';
}

export function SalesCommissionTracker() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  // Calculate current commission period dynamically
  const getCurrentPeriod = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const periodStart = new Date(currentYear, currentMonth - 1, 14);
    const periodEnd = new Date(currentYear, currentMonth, 13);
    const paymentDate = new Date(currentYear, currentMonth, 15);
    
    return {
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0], 
      paymentDate: paymentDate.toISOString().split('T')[0]
    };
  };

  const [currentPeriod, setCurrentPeriod] = useState(getCurrentPeriod());

  // State for dialogs and forms
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user exists
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">Please log in to view your commission tracker.</p>
            <Button onClick={() => navigate('/auth')} variant="outline">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch commission data filtered by logged-in user's email
  const { data: liveCommissions = [], isLoading: commissionsLoading, refetch: refetchCommissions } = useQuery({
    queryKey: ['/api/commissions', user.email],
    queryFn: async () => {
      console.log('🔄 Making fresh commissions API call for:', user.email);
      const response = await fetch('/api/commissions?v=' + Date.now(), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        console.error('Commissions API error:', response.status, response.statusText);
        throw new Error('Failed to fetch commissions');
      }
      const data = await response.json();
      console.log('📥 Raw commissions API response:', data);
      // Filter commissions to only show current user's commissions
      const filteredData = data.filter((commission: Commission) => commission.salesRep === user.email);
      console.log('📊 Filtered commissions for user:', filteredData);
      return filteredData;
    }
  });

  // Fetch pipeline projections filtered by logged-in user's email
  const { data: livePipelineProjections = [], isLoading: pipelineLoading } = useQuery({
    queryKey: ['/api/pipeline-projections', user.email],
    queryFn: async () => {
      console.log('🔄 Making fresh pipeline projections API call for:', user.email);
      const response = await fetch('/api/pipeline-projections?v=' + Date.now(), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        console.error('Pipeline projections API error:', response.status, response.statusText);
        throw new Error('Failed to fetch pipeline projections');
      }
      const data = await response.json();
      console.log('📥 Raw pipeline projections API response:', data);
      // Filter pipeline projections to only show current user's deals
      const filteredData = data.filter((deal: Deal) => deal.salesRep === user.email);
      console.log('📊 Filtered pipeline projections for user:', filteredData);
      return filteredData;
    }
  });

  // Transform commission data for display
  const transformedInvoiceCommissions = liveCommissions.map((commission: any) => ({
    id: commission.id?.toString() || commission.dealId?.toString(),
    dealId: commission.dealId?.toString() || commission.id?.toString(),
    dealName: commission.dealName || commission.companyName,
    companyName: commission.companyName,
    salesRep: commission.salesRep,
    serviceType: commission.serviceType,
    type: commission.type,
    monthNumber: commission.monthNumber || 1,
    amount: commission.amount,
    status: commission.status,
    dateEarned: commission.dateEarned,
    hubspotDealId: commission.hubspotDealId?.toString(),
    breakdown: commission.breakdown || {
      setup: commission.setupAmount || 0,
      month1: commission.month1Amount || 0,
      residual: commission.residualAmount || 0
    }
  }));

  // Calculate metrics
  const totalCurrentPeriodCommissions = transformedInvoiceCommissions
    .filter(commission => commission.status === 'pending' || commission.status === 'approved' || commission.status === 'paid')
    .reduce((sum, commission) => sum + commission.amount, 0);

  const projectedCommissions = livePipelineProjections.reduce((sum, deal) => sum + deal.projectedCommission, 0);

  const weightedPipelineValue = projectedCommissions * 0.7; // 70% probability applied

  // Filter commissions based on search and status
  const filteredCommissions = transformedInvoiceCommissions.filter(commission => {
    const matchesSearch = searchTerm === '' || 
      commission.dealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || commission.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Filter pipeline projections based on search
  const filteredPipelineProjections = livePipelineProjections.filter(deal => {
    const matchesSearch = searchTerm === '' || 
      deal.dealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate bonus tracking (same logic as admin but for current user only)
  const userDealsThisMonth = livePipelineProjections.filter(deal => {
    const dealDate = new Date(deal.createDate);
    const currentDate = new Date();
    return dealDate.getMonth() === currentDate.getMonth() && 
           dealDate.getFullYear() === currentDate.getFullYear();
  }).length;

  const totalClientsAllTime = transformedInvoiceCommissions.length + livePipelineProjections.length;

  const monthlyBonusTracking = calculateMonthlyBonus(userDealsThisMonth);
  const milestoneBonusTracking = calculateMilestoneBonus(totalClientsAllTime);

  // Adjustment request mutation
  const queryClient = useQueryClient();
  const adjustmentMutation = useMutation({
    mutationFn: async (adjustmentData: any) => {
      return await apiRequest('/api/commission-adjustments', {
        method: 'POST',
        body: JSON.stringify(adjustmentData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commission-adjustments'] });
      setAdjustmentDialogOpen(false);
      setSelectedCommission(null);
      setAdjustmentAmount('');
      setAdjustmentReason('');
    }
  });

  const handleRequestAdjustment = (commission: Commission) => {
    setSelectedCommission(commission);
    setAdjustmentAmount(commission.amount.toString());
    setAdjustmentDialogOpen(true);
  };

  const handleSubmitAdjustment = async () => {
    if (!selectedCommission || !adjustmentReason.trim()) return;

    try {
      await adjustmentMutation.mutateAsync({
        commissionId: selectedCommission.id,
        originalAmount: selectedCommission.amount,
        requestedAmount: parseFloat(adjustmentAmount) || selectedCommission.amount,
        reason: adjustmentReason
      });
    } catch (error) {
      console.error('Error submitting adjustment request:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <UniversalNavbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Commission Tracker</h1>
            <p className="text-gray-600 mt-1">Track your earnings and performance metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={() => refetchCommissions()} variant="outline" data-testid="button-refresh">
              <Calculator className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Current Period */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-current-period">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Period</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${totalCurrentPeriodCommissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">
                    Period: {new Date(currentPeriod.periodStart).toLocaleDateString()} - {new Date(currentPeriod.periodEnd).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projected Commissions */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-projected">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Projected Commissions</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${projectedCommissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">from pipeline</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weighted Pipeline */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-pipeline-weighted">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Weighted Pipeline</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${weightedPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    70% probability applied
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bonus Tracking Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Monthly Bonus Progress */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gift className="w-5 h-5 mr-2 text-purple-600" />
                Monthly Bonus Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Clients This Month: {userDealsThisMonth}</span>
                    <span className="font-semibold">{monthlyBonusTracking.description}</span>
                  </div>
                  <Progress 
                    value={(userDealsThisMonth / (monthlyBonusTracking.clientsCount || 1)) * 100} 
                    className="h-3"
                    data-testid="progress-monthly-bonus"
                  />
                </div>
                <div className="text-center">
                  <Badge 
                    variant={monthlyBonusTracking.isEarned ? "default" : "secondary"}
                    className="text-sm px-3 py-1"
                  >
                    {monthlyBonusTracking.isEarned ? "🎉 Bonus Earned!" : `${monthlyBonusTracking.clientsCount - userDealsThisMonth} more needed`}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestone Bonus Progress */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
                Milestone Bonus Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Total Clients: {totalClientsAllTime}</span>
                    <span className="font-semibold">{milestoneBonusTracking.description}</span>
                  </div>
                  <Progress 
                    value={milestoneBonusTracking.progress} 
                    className="h-3"
                    data-testid="progress-milestone-bonus"
                  />
                </div>
                <div className="text-center">
                  <Badge 
                    variant={milestoneBonusTracking.isEarned ? "default" : "secondary"}
                    className="text-sm px-3 py-1"
                  >
                    {milestoneBonusTracking.isEarned ? "🏆 Milestone Achieved!" : `${milestoneBonusTracking.nextMilestone - totalClientsAllTime} more needed`}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="commissions" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="commissions">My Commissions</TabsTrigger>
            <TabsTrigger value="pipeline">My Pipeline</TabsTrigger>
          </TabsList>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Commission History</CardTitle>
                <CardDescription>
                  Your earned commissions from closed deals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search deals or companies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                      data-testid="input-search-commissions"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48" data-testid="select-filter-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="disputed">Disputed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Commissions Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Earned</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissionsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Loading commissions...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredCommissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No commissions found matching your criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCommissions.map((commission) => (
                          <TableRow key={commission.id} data-testid={`row-commission-${commission.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{commission.dealName}</p>
                                <p className="text-sm text-gray-500">{commission.companyName}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {commission.serviceType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              ${commission.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={commission.status === 'paid' ? 'default' : 
                                        commission.status === 'approved' ? 'secondary' : 
                                        commission.status === 'disputed' ? 'destructive' : 'outline'}
                              >
                                {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(commission.dateEarned).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRequestAdjustment(commission)}
                                data-testid={`button-adjust-commission-${commission.id}`}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Request Adjustment
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline">
            <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Pipeline Projections</CardTitle>
                <CardDescription>
                  Your projected commissions from open deals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal</TableHead>
                        <TableHead>Deal Value</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Projected Commission</TableHead>
                        <TableHead>Setup Commission</TableHead>
                        <TableHead>Monthly Commission</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pipelineLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Loading pipeline...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredPipelineProjections.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No pipeline deals found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPipelineProjections.map((deal) => (
                          <TableRow key={deal.id} data-testid={`row-pipeline-${deal.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{deal.dealName}</p>
                                <p className="text-sm text-gray-500">{deal.companyName}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              ${(deal.dealValue || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{deal.dealStage || 'Unknown'}</p>
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              ${(deal.projectedCommission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">${(deal.setupCommission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <p className="text-gray-500">20% of setup fees</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">${(deal.monthlyCommission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <p className="text-gray-500">40% of first month</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => console.log('View deal details:', deal.id)}
                                  data-testid={`button-view-pipeline-${deal.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {deal.dealId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    data-testid={`button-hubspot-pipeline-${deal.id}`}
                                  >
                                    <a href={`https://app.hubspot.com/contacts/21143099/deal/${deal.dealId}`} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Adjustment Request Dialog */}
        <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" data-testid="dialog-adjustment-request">
            <DialogHeader>
              <DialogTitle>Request Commission Adjustment</DialogTitle>
              <DialogDescription>
                {selectedCommission && `Request an adjustment for ${selectedCommission.dealName}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCommission && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Current Amount:</span>
                      <p className="text-lg font-bold">${selectedCommission.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Commission Type:</span>
                      <p>{selectedCommission.type === 'month_1' ? 'First Month' : `Month ${selectedCommission.monthNumber}`}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="adjustment-amount">Requested Amount</Label>
                <Input
                  id="adjustment-amount"
                  type="text"
                  value={adjustmentAmount ? `$${parseFloat(adjustmentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[$,]/g, '');
                    if (value === '' || !isNaN(parseFloat(value))) {
                      setAdjustmentAmount(value);
                    }
                  }}
                  placeholder={`$${selectedCommission?.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  data-testid="input-adjustment-amount"
                />
              </div>
              
              <div>
                <Label htmlFor="adjustment-reason">Reason for Adjustment *</Label>
                <Textarea
                  id="adjustment-reason"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Please provide a detailed reason for this adjustment request..."
                  className="min-h-[100px]"
                  data-testid="textarea-adjustment-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setAdjustmentDialogOpen(false)}
                data-testid="button-cancel-adjustment"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitAdjustment}
                disabled={!adjustmentReason.trim()}
                data-testid="button-submit-adjustment"
              >
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default SalesCommissionTracker;