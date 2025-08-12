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

interface SalesRep {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  totalCommissions: number;
  projectedCommissions: number;
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

export function AdminCommissionTracker() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  // State for commission period
  // Calculate current commission period dynamically
  const getCurrentPeriod = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-based (0 = January, 7 = August)
    const currentYear = now.getFullYear();
    
    // Commission period runs from 14th of previous month to 13th of current month
    // Payment date is 15th of current month
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

  // State for commissions and data
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  // No longer using local state - adjustmentRequests comes from database query below

  // State for dialogs and forms
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [dealDetailsDialogOpen, setDealDetailsDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [selectedAdjustmentRequest, setSelectedAdjustmentRequest] = useState<AdjustmentRequest | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSalesRep, setFilterSalesRep] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sync states
  const [syncLoading, setSyncLoading] = useState(false);

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">This page is only accessible to administrators.</p>
            <Button onClick={() => navigate('/admin')} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch real commission data from API
  const { data: liveCommissions = [], isLoading: commissionsLoading, refetch: refetchCommissions } = useQuery({
    queryKey: ['/api/commissions'],
    queryFn: async () => {
      const response = await fetch('/api/commissions');
      if (!response.ok) throw new Error('Failed to fetch commissions');
      const data = await response.json();
      console.log('📥 Raw API response:', data);
      return data;
    }
  });

  const { data: liveSalesReps = [], isLoading: salesRepsLoading } = useQuery({
    queryKey: ['/api/sales-reps'],
    queryFn: async () => {
      const response = await fetch('/api/sales-reps');
      if (!response.ok) throw new Error('Failed to fetch sales reps');
      return response.json();
    }
  });

  const { data: liveDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['/api/deals'],
    queryFn: async () => {
      const response = await fetch('/api/deals');
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json();
    }
  });

  const queryClient = useQueryClient();

  // Fetch commission adjustments from database
  const { data: adjustmentRequests = [], refetch: refetchAdjustments } = useQuery({
    queryKey: ['/api/commission-adjustments'],
    enabled: !!user?.role && user.role === 'admin'
  });

  // Mutations for commission adjustments
  const createAdjustmentMutation = useMutation({
    mutationFn: (adjustmentData: any) => 
      apiRequest('/api/commission-adjustments', {
        method: 'POST',
        body: JSON.stringify(adjustmentData)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commission-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/commissions'] });
    }
  });

  const updateAdjustmentMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => 
      apiRequest(`/api/commission-adjustments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commission-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/commissions'] });
    }
  });

  // Update component state when data loads
  useEffect(() => {
    if (liveCommissions.length > 0) {
      // Transform API data to match component interface
      const transformedCommissions: Commission[] = liveCommissions.map(invoice => ({
        id: invoice.id.toString(),
        dealId: invoice.dealId?.toString() || invoice.id.toString(),
        dealName: invoice.companyName,
        companyName: invoice.companyName || 'Unknown Company',
        salesRep: invoice.salesRep || 'Unknown Rep',
        serviceType: invoice.serviceType || 'mixed',
        type: 'total' as any,
        monthNumber: 1,
        amount: invoice.amount || 0,
        status: invoice.status || 'pending',
        dateEarned: invoice.dateEarned || new Date().toISOString().split('T')[0],
        hubspotDealId: invoice.hubspotDealId,
        breakdown: {
          setup: invoice.setupAmount || 0,
          month1: invoice.month1Amount || 0,
          residual: invoice.residualAmount || 0
        }
      }));
      setCommissions(transformedCommissions);
      console.log('📊 Transformed invoice commissions:', transformedCommissions);
    }
  }, [liveCommissions]);

  useEffect(() => {
    if (liveSalesReps.length > 0) {
      // Transform API data to match component interface  
      const transformedSalesReps: SalesRep[] = liveSalesReps.map(rep => ({
        id: rep.id.toString(),
        name: rep.name || `${rep.first_name || ''} ${rep.last_name || ''}`.trim(),
        email: rep.email || 'unknown@email.com',
        isActive: rep.is_active !== false,
        totalCommissions: 0, // Will be calculated
        projectedCommissions: 0 // Will be calculated
      }));
      setSalesReps(transformedSalesReps);
    }
  }, [liveSalesReps]);

  useEffect(() => {
    if (liveDeals.length > 0) {
      // Transform API data to match component interface
      const transformedDeals: Deal[] = liveDeals.map(deal => ({
        id: deal.id.toString(),
        dealName: deal.deal_name || deal.name || 'Untitled Deal',
        companyName: deal.company_name || 'Unknown Company',
        salesRep: deal.sales_rep_name || 'Unknown Rep',
        serviceType: deal.service_type || 'bookkeeping',
        amount: deal.amount || 0,
        setupFee: deal.setup_fee || 0,
        monthlyFee: deal.monthly_fee || 0,
        status: deal.status || 'open',
        probability: deal.probability || 50,
        closedDate: deal.closed_date,
        hubspotDealId: deal.hubspot_deal_id
      }));
      setDeals(transformedDeals);
    }
  }, [liveDeals]);

  // Data is now fetched via useQuery hooks above

  // Filter commissions based on current filters
  const filteredCommissions = commissions.filter(commission => {
    const matchesStatus = filterStatus === 'all' || commission.status === filterStatus;
    const matchesSalesRep = filterSalesRep === 'all' || commission.salesRep === filterSalesRep;
    const matchesSearch = searchTerm === '' || 
      commission.dealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.salesRep.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSalesRep && matchesSearch;
  });

  // Calculate metrics
  const totalCurrentPeriodCommissions = filteredCommissions
    .filter(c => c.dateEarned >= currentPeriod.periodStart && c.dateEarned <= currentPeriod.periodEnd)
    .reduce((sum, c) => sum + c.amount, 0);

  const projectedCommissions = deals
    .filter(d => d.status === 'open' && d.probability)
    .reduce((sum, d) => sum + ((d.setupFee * 0.2) + (d.monthlyFee * 0.4)) * ((d.probability || 0) / 100), 0);

  // Helper functions
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      disputed: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getServiceTypeIcon = (serviceType: string) => {
    const icons = {
      bookkeeping: <Calculator className="w-4 h-4 text-blue-600" />,
      'bookkeeping + taas': <div className="flex gap-1"><Calculator className="w-3 h-3 text-blue-600" /><Building2 className="w-3 h-3 text-purple-600" /></div>,
      taas: <Building2 className="w-4 h-4 text-purple-600" />,
      payroll: <CreditCard className="w-4 h-4 text-green-600" />,
      'ap/ar lite': <FileText className="w-4 h-4 text-orange-600" />,
      'fp&a lite': <BarChart3 className="w-4 h-4 text-red-600" />,
      mixed: <div className="flex gap-1"><Calculator className="w-3 h-3 text-blue-600" /><Building2 className="w-3 h-3 text-purple-600" /></div>
    };
    
    return icons[serviceType as keyof typeof icons] || <Calculator className="w-4 h-4 text-gray-600" />;
  };

  const getPriorityIcon = (probability?: number) => {
    if (!probability) return <Clock className="w-4 h-4 text-gray-400" />;
    if (probability >= 75) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (probability >= 50) return <Target className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const getSalesRepMetrics = (repName: string) => {
    const repCommissions = commissions.filter(c => c.salesRep === repName);
    const currentPeriodCommissions = repCommissions
      .filter(c => c.dateEarned >= currentPeriod.periodStart && c.dateEarned <= currentPeriod.periodEnd)
      .reduce((sum, c) => sum + c.amount, 0);
    
    const firstMonthCommissions = repCommissions
      .filter(c => c.type === 'month_1')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const residualCommissions = repCommissions
      .filter(c => c.type === 'residual')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const totalCommissions = repCommissions.reduce((sum, c) => sum + c.amount, 0);
    
    const pipelineValue = deals
      .filter(d => d.salesRep === repName && d.status === 'open')
      .reduce((sum, d) => sum + d.amount, 0);

    return {
      currentPeriodCommissions,
      firstMonthCommissions,
      residualCommissions,
      totalCommissions,
      pipelineValue
    };
  };

  // Event handlers
  const handleRequestAdjustment = (commission: Commission) => {
    setSelectedCommission(commission);
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setAdjustmentDialogOpen(true);
  };

  const handleSubmitAdjustment = () => {
    if (selectedCommission && adjustmentReason.trim()) {
      const adjustmentData = {
        commissionId: parseInt(selectedCommission.id),
        originalAmount: selectedCommission.amount,
        requestedAmount: adjustmentAmount ? parseFloat(adjustmentAmount) : selectedCommission.amount,
        reason: adjustmentReason
      };
      
      createAdjustmentMutation.mutate(adjustmentData);
      setAdjustmentDialogOpen(false);
      setSelectedCommission(null);
      setAdjustmentAmount('');
      setAdjustmentReason('');
    }
  };

  const handleReviewAdjustment = (request: AdjustmentRequest) => {
    setSelectedAdjustmentRequest(request);
    setReviewNotes('');
    setReviewDialogOpen(true);
  };

  const handleApproveAdjustment = () => {
    if (selectedAdjustmentRequest) {
      const updateData = {
        id: selectedAdjustmentRequest.id,
        status: 'approved',
        finalAmount: selectedAdjustmentRequest.requestedAmount,
        notes: reviewNotes
      };
      
      updateAdjustmentMutation.mutate(updateData);
      setReviewDialogOpen(false);
      setSelectedAdjustmentRequest(null);
      setReviewNotes('');
    }
  };

  const handleRejectAdjustment = () => {
    if (selectedAdjustmentRequest) {
      const updateData = {
        id: selectedAdjustmentRequest.id,
        status: 'rejected',
        notes: reviewNotes
      };
      
      updateAdjustmentMutation.mutate(updateData);
      setReviewDialogOpen(false);
      setSelectedAdjustmentRequest(null);
      setReviewNotes('');
    }
  };

  const handleViewDealDetails = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId) || commissions.find(c => c.dealId === dealId);
    if (deal) {
      // Convert commission to deal format if needed
      const dealData = 'setupFee' in deal ? deal : {
        id: deal.dealId,
        dealName: deal.dealName,
        companyName: deal.companyName,
        salesRep: deal.salesRep,
        serviceType: deal.serviceType,
        // Calculate actual deal amount from commission breakdown
        // Setup commission is 20% of setup fee, month1 commission is 40% of monthly fee
        amount: ((deal as any).breakdown?.setup || 0) / 0.20 + ((deal as any).breakdown?.month1 || 0) / 0.40,
        setupFee: (deal as any).breakdown?.setup || 0, // Actual setup commission
        monthlyFee: (deal as any).breakdown?.month1 || 0, // Actual month 1 commission
        status: 'closed_won' as const,
        closedDate: deal.dateEarned,
        hubspotDealId: deal.hubspotDealId
      };
      
      setSelectedDeal(dealData);
      setDealDetailsDialogOpen(true);
    }
  };

  const handleApproveCommission = async (commissionId: string) => {
    try {
      // Get CSRF token first
      const csrfResponse = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfResponse.json();
      
      const response = await fetch(`/api/commissions/${commissionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        }
      });

      if (response.ok) {
        console.log(`Commission ${commissionId} approved`);
        // Refresh commissions data
        await refetchCommissions();
      } else {
        const error = await response.json();
        console.error('Failed to approve commission:', error);
        alert('Failed to approve commission: ' + error.message);
      }
    } catch (error) {
      console.error('Approve commission error:', error);
      alert('Failed to approve commission. Please try again.');
    }
  };

  const handleRejectCommission = async (commissionId: string) => {
    try {
      // Get CSRF token first
      const csrfResponse = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfResponse.json();
      
      const response = await fetch(`/api/commissions/${commissionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        }
      });

      if (response.ok) {
        console.log(`Commission ${commissionId} rejected`);
        // Refresh commissions data
        await refetchCommissions();
      } else {
        const error = await response.json();
        console.error('Failed to reject commission:', error);
        alert('Failed to reject commission: ' + error.message);
      }
    } catch (error) {
      console.error('Reject commission error:', error);
      alert('Failed to reject commission. Please try again.');
    }
  };

  const handleSyncHubSpot = async () => {
    setSyncLoading(true);
    try {
      // Get CSRF token first
      const csrfResponse = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfResponse.json();
      
      const response = await fetch('/api/commissions/sync-hubspot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('HubSpot sync completed:', result);
        
        // Show success message
        alert(`HubSpot sync completed successfully!\n\nResults:\n- Sales reps: ${result.results.salesRepsProcessed}\n- Invoices: ${result.results.invoicesProcessed}\n- Deals: ${result.results.dealsProcessed}\n- Commissions: ${result.results.commissionsCreated}`);
        
        // Refresh all data after sync
        await refetchCommissions();
      } else {
        const error = await response.json();
        console.error('HubSpot sync failed:', error);
        alert('Failed to sync HubSpot data: ' + error.message);
      }
    } catch (error) {
      console.error('HubSpot sync error:', error);
      alert('Failed to sync HubSpot data. Please try again.');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] via-emerald-800 to-green-900">
      <UniversalNavbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-end mb-8">
          <div className="flex items-center gap-3">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSyncHubSpot}
              disabled={syncLoading}
              data-testid="button-sync-hubspot"
            >
              {syncLoading ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {syncLoading ? 'Syncing...' : 'Sync HubSpot Data'}
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Period Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-current-period">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Period</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${totalCurrentPeriodCommissions.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(currentPeriod.periodStart).toLocaleDateString()} - {new Date(currentPeriod.periodEnd).toLocaleDateString()}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-pending-approvals">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {commissions.filter(c => c.status === 'pending').length}
                  </p>
                  <p className="text-xs text-gray-500">
                    ${commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-adjustment-requests">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Adjustment Requests</p>
                  <p className="text-2xl font-bold text-red-600">
                    {adjustmentRequests.filter(r => r.status === 'pending').length}
                  </p>
                  <p className="text-xs text-gray-500">requiring review</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-projected">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Projected Commissions</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${projectedCommissions.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-gray-500">from pipeline</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/95 backdrop-blur border-0 shadow-xl mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search deals, companies, or reps..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                    data-testid="input-search"
                  />
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40" data-testid="select-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterSalesRep} onValueChange={setFilterSalesRep}>
                  <SelectTrigger className="w-48" data-testid="select-sales-rep">
                    <SelectValue placeholder="Sales Rep" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sales Reps</SelectItem>
                    {salesReps.map((rep) => (
                      <SelectItem key={rep.id} value={rep.name}>
                        {rep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-gray-500">
                Showing {filteredCommissions.length} of {commissions.length} commissions
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Tabbed Interface */}
        <Tabs defaultValue="commissions" className="space-y-6" data-testid="main-tabs">
          <TabsList className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="tabs-list">
            <TabsTrigger value="commissions" className="data-[state=active]:bg-[#253e31] data-[state=active]:text-white" data-testid="tab-commissions">
              Commission Tracking
            </TabsTrigger>
            <TabsTrigger value="reps" className="data-[state=active]:bg-[#253e31] data-[state=active]:text-white" data-testid="tab-reps">
              Sales Rep Performance
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="data-[state=active]:bg-[#253e31] data-[state=active]:text-white" data-testid="tab-adjustments">
              Adjustment Requests ({adjustmentRequests.filter(req => req.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-[#253e31] data-[state=active]:text-white" data-testid="tab-pipeline">
              Pipeline Projections
            </TabsTrigger>
          </TabsList>

          {/* Commission Tracking Tab */}
          <TabsContent value="commissions" data-testid="content-commissions">
            <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Commission Tracking - Current Period
                </CardTitle>
                <CardDescription>
                  Commissions earned between {new Date(currentPeriod.periodStart).toLocaleDateString()} and {new Date(currentPeriod.periodEnd).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table data-testid="table-commissions">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Sales Rep</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Commission Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Earned</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCommissions.map((commission) => (
                        <TableRow key={commission.id} data-testid={`row-commission-${commission.id}`}>
                          <TableCell className="font-medium">
                            <p className="font-semibold text-gray-900">{commission.companyName}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span>{commission.salesRep}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getServiceTypeIcon(commission.serviceType)}
                              <span className="capitalize">{commission.serviceType.replace('_', ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={commission.type === 'month_1' ? 'default' : 'secondary'} data-testid={`badge-type-${commission.type}`}>
                              {commission.type === 'month_1' ? 'First Month' : `Month ${commission.monthNumber}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${commission.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(commission.status)}
                          </TableCell>
                          <TableCell>
                            {new Date(commission.dateEarned).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDealDetails(commission.dealId)}
                                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                data-testid={`button-view-deal-${commission.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {commission.status === 'pending' && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleApproveCommission(commission.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                    data-testid={`button-approve-${commission.id}`}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRejectCommission(commission.id)}
                                    data-testid={`button-reject-${commission.id}`}
                                  >
                                    <AlertCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Rep Performance Tab */}
          <TabsContent value="reps" data-testid="content-reps">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {salesReps.map((rep) => {
                const metrics = getSalesRepMetrics(rep.name);
                return (
                  <Card key={rep.id} className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid={`card-rep-${rep.id}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#253e31] to-[#75c29a] rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{rep.name}</h3>
                            <p className="text-sm text-gray-500">{rep.email}</p>
                          </div>
                        </div>
                        <Badge variant={rep.isActive ? 'default' : 'secondary'} data-testid={`badge-status-${rep.id}`}>
                          {rep.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Current Period</span>
                            <span className="font-semibold">${metrics.currentPeriodCommissions.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">First Month Premium</span>
                            <span className="font-semibold text-green-600">${metrics.firstMonthCommissions.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Residual Monthly</span>
                            <span className="font-semibold text-blue-600">${metrics.residualCommissions.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Commissions</span>
                            <span className="font-semibold">${metrics.totalCommissions.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Pipeline Value</span>
                            <span className="font-semibold text-purple-600">${metrics.pipelineValue.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Projected</span>
                            <span className="font-semibold text-orange-600">${rep.projectedCommissions.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Performance Progress */}
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Commission Progress</span>
                            <span className="text-sm text-gray-500">
                              {Math.round((metrics.currentPeriodCommissions / 5000) * 100)}%
                            </span>
                          </div>
                          <Progress 
                            value={Math.min((metrics.currentPeriodCommissions / 5000) * 100, 100)} 
                            className="h-2"
                            data-testid={`progress-commission-${rep.id}`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Adjustment Requests Tab */}
          <TabsContent value="adjustments" data-testid="content-adjustments">
            <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Adjustment Requests
                </CardTitle>
                <CardDescription>
                  Review and approve commission adjustment requests from sales reps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table data-testid="table-adjustments">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sales Rep</TableHead>
                        <TableHead>Deal</TableHead>
                        <TableHead>Original Amount</TableHead>
                        <TableHead>Requested Amount</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Requested</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adjustmentRequests.map((request) => {
                        const commission = commissions.find(c => c.id === request.commissionId);
                        return (
                          <TableRow key={request.id} data-testid={`row-adjustment-${request.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span>{request.salesRep}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {commission ? (
                                <div>
                                  <p className="font-semibold text-gray-900">{commission.dealName}</p>
                                  <p className="text-sm text-gray-500">{commission.companyName}</p>
                                </div>
                              ) : (
                                <span className="text-gray-400">Deal not found</span>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              ${request.originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-semibold">
                              <span className={request.requestedAmount > request.originalAmount ? 'text-green-600' : 'text-red-600'}>
                                ${request.requestedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm text-gray-700 line-clamp-2">{request.reason}</p>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(request.status)}
                              {request.reviewedBy && (
                                <p className="text-xs text-gray-500 mt-1">
                                  By {request.reviewedBy}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(request.requestedDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {request.status === 'pending' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReviewAdjustment(request)}
                                  data-testid={`button-review-${request.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Review
                                </Button>
                              ) : (
                                <span className="text-sm text-gray-500">
                                  {request.status === 'approved' ? 'Approved' : 'Rejected'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipeline Projections Tab */}
          <TabsContent value="pipeline" data-testid="content-pipeline">
            <div className="space-y-6">
              {/* Pipeline Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-pipeline-total">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Pipeline Value</p>
                        <p className="text-2xl font-bold text-purple-600">
                          ${deals.filter(d => d.status === 'open').reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-pipeline-weighted">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Weighted Pipeline</p>
                        <p className="text-2xl font-bold text-blue-600">
                          ${deals
                            .filter(d => d.status === 'open' && d.probability)
                            .reduce((sum, d) => sum + (d.amount * (d.probability! / 100)), 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-pipeline-commission">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Projected Commissions</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${projectedCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pipeline Deals Table */}
              <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Pipeline Deals & Commission Projections
                  </CardTitle>
                  <CardDescription>
                    Future commission projections based on current pipeline and probability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table data-testid="table-pipeline">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Sales Rep</TableHead>
                          <TableHead>Deal Value</TableHead>
                          <TableHead>Stage / Probability</TableHead>
                          <TableHead>Projected Commission</TableHead>
                          <TableHead>Setup Fee Commission</TableHead>
                          <TableHead>Monthly Commission</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deals.filter(deal => deal.status === 'open').map((deal) => {
                          const firstMonthCommission = (deal.setupFee * 0.2) + (deal.monthlyFee * 0.4);
                          const monthlyCommission = deal.monthlyFee * 0.1;
                          const projectedCommission = firstMonthCommission * ((deal.probability || 0) / 100);
                          
                          return (
                            <TableRow key={deal.id} data-testid={`row-pipeline-${deal.id}`}>
                              <TableCell className="font-medium">
                                <div>
                                  <p className="font-semibold text-gray-900">{deal.dealName}</p>
                                  <p className="text-sm text-gray-500">{deal.companyName}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span>{deal.salesRep}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold">
                                ${deal.amount.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getPriorityIcon(deal.probability)}
                                  <div>
                                    <p className="text-sm font-medium">{deal.pipelineStage || 'Unknown'}</p>
                                    <p className="text-xs text-gray-500">{deal.probability || 0}% probability</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-green-600">
                                ${projectedCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="font-medium">${(deal.setupFee * 0.2).toLocaleString()}</p>
                                  <p className="text-gray-500">20% of ${deal.setupFee.toLocaleString()}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="font-medium">${monthlyCommission.toLocaleString()}</p>
                                  <p className="text-gray-500">10% of ${deal.monthlyFee.toLocaleString()}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDealDetails(deal.id)}
                                    data-testid={`button-view-pipeline-${deal.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {deal.hubspotDealId && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                      data-testid={`button-hubspot-pipeline-${deal.id}`}
                                    >
                                      <a href={`https://app.hubspot.com/contacts/deal/${deal.hubspotDealId}`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Adjustment Request Dialog */}
        <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" data-testid="dialog-adjustment-request">
            <DialogHeader>
              <DialogTitle>Create Commission Adjustment</DialogTitle>
              <DialogDescription>
                {selectedCommission && `Creating adjustment for ${selectedCommission.dealName}`}
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
                <Label htmlFor="adjustment-amount">New Amount</Label>
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
                  placeholder="Please provide a detailed reason for this adjustment..."
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
                Create Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Adjustment Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]" data-testid="dialog-review-adjustment">
            <DialogHeader>
              <DialogTitle>Review Adjustment Request</DialogTitle>
              <DialogDescription>
                {selectedAdjustmentRequest && `Review request from ${selectedAdjustmentRequest.salesRep}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedAdjustmentRequest && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Original Amount:</span>
                        <p className="text-lg font-bold">${selectedAdjustmentRequest.originalAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Requested Amount:</span>
                        <p className={`text-lg font-bold ${selectedAdjustmentRequest.requestedAmount > selectedAdjustmentRequest.originalAmount ? 'text-green-600' : 'text-red-600'}`}>
                          ${selectedAdjustmentRequest.requestedAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Reason for Adjustment:</Label>
                    <div className="p-3 bg-gray-50 rounded-md mt-1">
                      <p className="text-sm text-gray-700">{selectedAdjustmentRequest.reason}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="review-notes">Review Notes</Label>
                    <Textarea
                      id="review-notes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add your review notes (optional)..."
                      className="min-h-[80px]"
                      data-testid="textarea-review-notes"
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setReviewDialogOpen(false)}
                data-testid="button-cancel-review"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleRejectAdjustment}
                data-testid="button-reject-adjustment"
              >
                Reject
              </Button>
              <Button 
                onClick={handleApproveAdjustment}
                data-testid="button-approve-adjustment"
              >
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deal Details Dialog */}
        <Dialog open={dealDetailsDialogOpen} onOpenChange={setDealDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[700px]" data-testid="dialog-deal-details">
            <DialogHeader>
              <DialogTitle>Deal Details</DialogTitle>
              <DialogDescription>
                {selectedDeal && `Details for ${selectedDeal.dealName}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedDeal && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Company</Label>
                        <p className="text-lg font-semibold">{selectedDeal.companyName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Deal Value</Label>
                        <p className="text-lg font-semibold">${selectedDeal.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Service Type</Label>
                        <div className="flex items-center gap-2">
                          {getServiceTypeIcon(selectedDeal.serviceType)}
                          <span className="capitalize">{selectedDeal.serviceType.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Sales Rep</Label>
                        <p className="text-lg font-semibold">{selectedDeal.salesRep}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Status</Label>
                        <Badge variant={selectedDeal.status === 'closed_won' ? 'default' : 'secondary'}>
                          {selectedDeal.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Close Date</Label>
                        <p>{selectedDeal.closedDate ? new Date(selectedDeal.closedDate).toLocaleDateString() : 'Not closed'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium text-gray-600">Commission Breakdown</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Setup Fee Commission (20%)</p>
                        <p className="text-lg font-bold text-green-600">${selectedDeal.setupFee.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">20% of setup fee</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">First Month Commission (40%)</p>
                        <p className="text-lg font-bold text-blue-600">${selectedDeal.monthlyFee.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">40% of monthly fee</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg col-span-2">
                        <p className="text-sm text-gray-600">Total First Month Commission</p>
                        <p className="text-xl font-bold text-purple-600">
                          ${(selectedDeal.setupFee + selectedDeal.monthlyFee).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {selectedDeal.status === 'open' && selectedDeal.probability && (
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium text-gray-600">Pipeline Information</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-sm text-gray-600">Pipeline Stage</p>
                          <p className="font-semibold">{selectedDeal.pipelineStage}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Close Probability</p>
                          <p className="font-semibold">{selectedDeal.probability}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDealDetailsDialogOpen(false)}
                data-testid="button-close-deal-details"
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const commission = commissions.find(c => c.dealId === selectedDeal?.id);
                  if (commission) {
                    handleRequestAdjustment(commission);
                    setDealDetailsDialogOpen(false);
                  }
                }}
                disabled={selectedDeal && commissions.find(c => c.dealId === selectedDeal.id)?.status === 'approved' || commissions.find(c => c.dealId === selectedDeal?.id)?.status === 'paid'}
                data-testid="button-create-adjustment"
              >
                <Edit className="w-4 h-4 mr-2" />
                Create Adjustment
              </Button>
              {selectedDeal?.hubspotDealId && (
                <Button 
                  asChild
                  data-testid="button-view-hubspot-deal"
                >
                  <a href={`https://app.hubspot.com/contacts/deal/${selectedDeal.hubspotDealId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in HubSpot
                  </a>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default AdminCommissionTracker;