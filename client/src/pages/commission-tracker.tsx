import { useState, useEffect } from "react";
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
import { calculateMonthlyBonus, calculateMilestoneBonus, getNextMilestone, calculateTotalEarnings } from "@shared/commission-calculator";
import { queryClient } from "@/lib/queryClient";

interface Commission {
  id: string;
  dealName: string;
  serviceType: 'bookkeeping' | 'taas' | 'combined';
  type: 'month_1' | 'residual';
  amount: number;
  monthNumber: number;
  status: 'pending' | 'processing' | 'paid';
  dateEarned: string;
  datePaid?: string;
  companyName: string;
  salesRep: string;
  dealId: string;
  hubspotDealId?: string;
}

interface Deal {
  id: string;
  dealName: string;
  companyName: string;
  amount: number;
  setupFee: number;
  monthlyFee: number;
  status: 'open' | 'closed_won' | 'closed_lost';
  closedDate?: string;
  serviceType: 'bookkeeping' | 'taas' | 'combined';
  salesRep: string;
  hubspotDealId?: string;
  pipelineStage?: string;
  probability?: number;
}

interface MonthlyBonus {
  id: string;
  month: string;
  clientsClosedCount: number;
  bonusAmount: number;
  bonusType: 'cash' | 'airpods' | 'apple_watch' | 'macbook_air';
  status: 'pending' | 'processing' | 'paid';
  dateEarned: string;
  datePaid?: string;
  salesRep: string;
}

interface MilestoneBonus {
  id: string;
  milestone: number;
  bonusAmount: number;
  includesEquity: boolean;
  status: 'pending' | 'processing' | 'paid';
  dateEarned: string;
  datePaid?: string;
  salesRep: string;
}

interface SalesRepStats {
  totalClientsClosedMonthly: number;
  totalClientsClosedAllTime: number;
  currentMonthDeals: number;
  pipelineValue: number;
  projectedCommissions: number;
}

interface SalesRep {
  id: string;
  name: string;
  email: string;
  hubspotUserId?: string;
  totalCommissions: number;
  currentPeriodCommissions: number;
  projectedCommissions: number;
  isActive: boolean;
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

interface CommissionPeriod {
  id: string;
  periodStart: string; // 14th of month
  periodEnd: string;   // 13th of next month
  status: 'active' | 'closed' | 'processing';
  totalPaid: number;
  totalPending: number;
  payrollDate: string; // 15th of month after period ends
}

export default function CommissionTracker() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  // State management
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [monthlyBonuses, setMonthlyBonuses] = useState<MonthlyBonus[]>([]);
  const [milestoneBonuses, setMilestoneBonuses] = useState<MilestoneBonus[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [adjustmentRequests, setAdjustmentRequests] = useState<AdjustmentRequest[]>([]);
  const [commissionPeriods, setCommissionPeriods] = useState<CommissionPeriod[]>([]);
  
  // Filter and search states
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog states
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedAdjustmentRequest, setSelectedAdjustmentRequest] = useState<AdjustmentRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [dealDetailsDialogOpen, setDealDetailsDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Comprehensive sample data for admin commission tracking
  useEffect(() => {
    // Sales reps data
    const sampleSalesReps: SalesRep[] = [
      {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah@seedfinancial.io',
        hubspotUserId: 'hs_001',
        totalCommissions: 12540.00,
        currentPeriodCommissions: 2840.00,
        projectedCommissions: 8450.00,
        isActive: true
      },
      {
        id: '2',
        name: 'Mike Chen',
        email: 'mike@seedfinancial.io',
        hubspotUserId: 'hs_002',
        totalCommissions: 9820.00,
        currentPeriodCommissions: 1950.00,
        projectedCommissions: 6200.00,
        isActive: true
      },
      {
        id: '3',
        name: 'Jessica Rodriguez',
        email: 'jessica@seedfinancial.io',
        hubspotUserId: 'hs_003',
        totalCommissions: 8760.00,
        currentPeriodCommissions: 1230.00,
        projectedCommissions: 4800.00,
        isActive: true
      }
    ];

    // Commission periods (14th to 13th cycle)
    const sampleCommissionPeriods: CommissionPeriod[] = [
      {
        id: '1',
        periodStart: '2025-01-14',
        periodEnd: '2025-02-13',
        status: 'active',
        totalPaid: 0,
        totalPending: 6020.00,
        payrollDate: '2025-02-15'
      },
      {
        id: '2',
        periodStart: '2024-12-14',
        periodEnd: '2025-01-13',
        status: 'closed',
        totalPaid: 11580.00,
        totalPending: 0,
        payrollDate: '2025-01-15'
      }
    ];

    // Enhanced commission data with sales rep assignments
    const sampleCommissions: Commission[] = [
      {
        id: '1',
        dealName: 'TechFlow Solutions - Bookkeeping + TaaS',
        companyName: 'TechFlow Solutions',
        serviceType: 'combined',
        type: 'month_1',
        amount: 840,
        monthNumber: 1,
        status: 'paid',
        dateEarned: '2025-01-15',
        datePaid: '2025-01-30',
        salesRep: 'Sarah Johnson',
        dealId: '1',
        hubspotDealId: 'hs_deal_001'
      },
      {
        id: '2',
        dealName: 'Wellness Hub Inc - Bookkeeping',
        companyName: 'Wellness Hub Inc',
        serviceType: 'bookkeeping',
        type: 'month_1',
        amount: 420,
        monthNumber: 1,
        status: 'processing',
        dateEarned: '2025-01-20',
        salesRep: 'Mike Chen',
        dealId: '2',
        hubspotDealId: 'hs_deal_002'
      },
      {
        id: '3',
        dealName: 'TechFlow Solutions - Bookkeeping + TaaS',
        companyName: 'TechFlow Solutions',
        serviceType: 'combined',
        type: 'residual',
        amount: 85,
        monthNumber: 2,
        status: 'pending',
        dateEarned: '2025-02-15',
        salesRep: 'Sarah Johnson',
        dealId: '1',
        hubspotDealId: 'hs_deal_001'
      },
      {
        id: '4',
        dealName: 'Creative Agency LLC - Bookkeeping',
        companyName: 'Creative Agency LLC',
        serviceType: 'bookkeeping',
        type: 'month_1',
        amount: 320,
        monthNumber: 1,
        status: 'pending',
        dateEarned: '2025-01-25',
        salesRep: 'Jessica Rodriguez',
        dealId: '3',
        hubspotDealId: 'hs_deal_003'
      },
      {
        id: '5',
        dealName: 'DataSync Corp - TaaS',
        companyName: 'DataSync Corp',
        serviceType: 'taas',
        type: 'month_1',
        amount: 600,
        monthNumber: 1,
        status: 'pending',
        dateEarned: '2025-02-01',
        salesRep: 'Sarah Johnson',
        dealId: '4',
        hubspotDealId: 'hs_deal_004'
      }
    ];

    // Enhanced deals with pipeline data
    const sampleDeals: Deal[] = [
      {
        id: '1',
        dealName: 'TechFlow Solutions - Bookkeeping + TaaS',
        companyName: 'TechFlow Solutions',
        amount: 3350,
        setupFee: 2500,
        monthlyFee: 850,
        status: 'closed_won',
        closedDate: '2025-01-15',
        serviceType: 'combined',
        salesRep: 'Sarah Johnson',
        hubspotDealId: 'hs_deal_001'
      },
      {
        id: '2',
        dealName: 'Wellness Hub Inc - Bookkeeping',
        companyName: 'Wellness Hub Inc',
        amount: 1650,
        setupFee: 1200,
        monthlyFee: 450,
        status: 'closed_won',
        closedDate: '2025-01-20',
        serviceType: 'bookkeeping',
        salesRep: 'Mike Chen',
        hubspotDealId: 'hs_deal_002'
      },
      {
        id: '3',
        dealName: 'Creative Agency LLC - Bookkeeping',
        companyName: 'Creative Agency LLC',
        amount: 1400,
        setupFee: 800,
        monthlyFee: 600,
        status: 'closed_won',
        closedDate: '2025-01-25',
        serviceType: 'bookkeeping',
        salesRep: 'Jessica Rodriguez',
        hubspotDealId: 'hs_deal_003'
      },
      {
        id: '4',
        dealName: 'DataSync Corp - TaaS',
        companyName: 'DataSync Corp',
        amount: 2100,
        setupFee: 1500,
        monthlyFee: 600,
        status: 'closed_won',
        closedDate: '2025-02-01',
        serviceType: 'taas',
        salesRep: 'Sarah Johnson',
        hubspotDealId: 'hs_deal_004'
      },
      // Pipeline deals for projections
      {
        id: '5',
        dealName: 'FinTech Startup - Combined',
        companyName: 'FinTech Startup',
        amount: 4200,
        setupFee: 3000,
        monthlyFee: 1200,
        status: 'open',
        serviceType: 'combined',
        salesRep: 'Sarah Johnson',
        hubspotDealId: 'hs_deal_005',
        pipelineStage: 'Proposal Sent',
        probability: 75
      },
      {
        id: '6',
        dealName: 'Retail Chain - Bookkeeping',
        companyName: 'Retail Chain',
        amount: 2800,
        setupFee: 2000,
        monthlyFee: 800,
        status: 'open',
        serviceType: 'bookkeeping',
        salesRep: 'Mike Chen',
        hubspotDealId: 'hs_deal_006',
        pipelineStage: 'Contract Review',
        probability: 90
      }
    ];

    // Adjustment requests for admin review
    const sampleAdjustmentRequests: AdjustmentRequest[] = [
      {
        id: '1',
        commissionId: '2',
        salesRep: 'Mike Chen',
        originalAmount: 420,
        requestedAmount: 480,
        reason: 'Client negotiated additional services not reflected in original commission calculation. Added premium support package worth $150 monthly.',
        status: 'pending',
        requestedDate: '2025-02-01'
      },
      {
        id: '2',
        commissionId: '4',
        salesRep: 'Jessica Rodriguez',
        originalAmount: 320,
        requestedAmount: 380,
        reason: 'Deal closed with expedited setup timeline, deserving of bonus commission per company policy.',
        status: 'approved',
        requestedDate: '2025-01-28',
        reviewedBy: 'Jon Seed',
        reviewedDate: '2025-01-30',
        reviewNotes: 'Approved - expedited setup justified per policy section 4.2'
      }
    ];

    // Enhanced bonuses with sales rep assignments
    const sampleMonthlyBonuses: MonthlyBonus[] = [
      {
        id: '1',
        month: '2025-01',
        clientsClosedCount: 8,
        bonusAmount: 1000,
        bonusType: 'cash',
        status: 'processing',
        dateEarned: '2025-01-31',
        salesRep: 'Sarah Johnson'
      },
      {
        id: '2',
        month: '2025-01',
        clientsClosedCount: 5,
        bonusAmount: 500,
        bonusType: 'cash',
        status: 'processing',
        dateEarned: '2025-01-31',
        salesRep: 'Mike Chen'
      }
    ];

    const sampleMilestoneBonuses: MilestoneBonus[] = [
      {
        id: '1',
        milestone: 40,
        bonusAmount: 5000,
        includesEquity: false,
        status: 'paid',
        dateEarned: '2025-01-10',
        datePaid: '2025-01-25',
        salesRep: 'Sarah Johnson'
      }
    ];

    // Set all data
    setSalesReps(sampleSalesReps);
    setCommissionPeriods(sampleCommissionPeriods);
    setCommissions(sampleCommissions);
    setDeals(sampleDeals);
    setAdjustmentRequests(sampleAdjustmentRequests);
    setMonthlyBonuses(sampleMonthlyBonuses);
    setMilestoneBonuses(sampleMilestoneBonuses);
  }, []);

  // Calculate key metrics for admin dashboard
  const currentPeriod = commissionPeriods.find(p => p.status === 'active') || commissionPeriods[0];
  const totalCurrentPeriodCommissions = commissions
    .filter(c => c.dateEarned >= currentPeriod.periodStart && c.dateEarned <= currentPeriod.periodEnd)
    .reduce((sum, c) => sum + c.amount, 0);
  
  const totalPendingCommissions = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);
  
  const totalProcessingCommissions = commissions
    .filter(c => c.status === 'processing')
    .reduce((sum, c) => sum + c.amount, 0);

  // Calculate projected commissions based on pipeline
  const projectedCommissions = deals
    .filter(d => d.status === 'open' && d.probability)
    .reduce((sum, d) => {
      const firstMonthCommission = (d.setupFee * 0.2) + (d.monthlyFee * 0.4);
      return sum + (firstMonthCommission * (d.probability! / 100));
    }, 0);

  // Filter commissions based on current filters
  const filteredCommissions = commissions.filter(commission => {
    const matchesRep = selectedSalesRep === 'all' || commission.salesRep === selectedSalesRep;
    const matchesStatus = statusFilter === 'all' || commission.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      commission.dealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.salesRep.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRep && matchesStatus && matchesSearch;
  });

  // Calculate sales rep performance metrics 
  const getSalesRepMetrics = (repName: string) => {
    const repCommissions = commissions.filter(c => c.salesRep === repName);
    const repDeals = deals.filter(d => d.salesRep === repName);
    
    const currentPeriodCommissions = repCommissions
      .filter(c => c.dateEarned >= currentPeriod.periodStart && c.dateEarned <= currentPeriod.periodEnd)
      .reduce((sum, c) => sum + c.amount, 0);
    
    const firstMonthCommissions = repCommissions
      .filter(c => c.type === 'month_1')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const residualCommissions = repCommissions
      .filter(c => c.type === 'residual')
      .reduce((sum, c) => sum + c.amount, 0);

    const pipelineValue = repDeals
      .filter(d => d.status === 'open')
      .reduce((sum, d) => sum + d.amount, 0);

    return {
      currentPeriodCommissions,
      firstMonthCommissions,
      residualCommissions,
      pipelineValue,
      totalCommissions: repCommissions.reduce((sum, c) => sum + c.amount, 0)
    };
  };

  // Helper functions for UI
  const getStatusBadge = (status: Commission['status'] | MonthlyBonus['status'] | MilestoneBonus['status'] | AdjustmentRequest['status']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200" data-testid="badge-paid">Paid</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200" data-testid="badge-processing">Processing</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200" data-testid="badge-pending">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200" data-testid="badge-approved">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200" data-testid="badge-rejected">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200" data-testid="badge-unknown">Unknown</Badge>;
    }
  };

  const getServiceTypeIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'bookkeeping':
        return <BarChart3 className="w-4 h-4" />;
      case 'taas':
        return <Calendar className="w-4 h-4" />;
      case 'combined':
        return <Star className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getPriorityIcon = (probability?: number) => {
    if (!probability) return <Clock className="w-4 h-4 text-gray-400" />;
    if (probability >= 75) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (probability >= 50) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  // Handler functions for admin actions
  const handleRequestAdjustment = (commission: Commission) => {
    setSelectedCommission(commission);
    setAdjustmentReason('');
    setAdjustmentAmount(commission.amount.toString());
    setAdjustmentDialogOpen(true);
  };

  const handleSubmitAdjustment = () => {
    if (!selectedCommission || !adjustmentReason) return;
    
    const newRequest: AdjustmentRequest = {
      id: `adj_${Date.now()}`,
      commissionId: selectedCommission.id,
      salesRep: selectedCommission.salesRep,
      originalAmount: selectedCommission.amount,
      requestedAmount: parseFloat(adjustmentAmount) || selectedCommission.amount,
      reason: adjustmentReason,
      status: 'pending',
      requestedDate: new Date().toISOString().split('T')[0]
    };
    
    setAdjustmentRequests(prev => [...prev, newRequest]);
    setAdjustmentDialogOpen(false);
    setSelectedCommission(null);
    setAdjustmentReason('');
    setAdjustmentAmount('');
  };

  const handleReviewAdjustment = (request: AdjustmentRequest) => {
    setSelectedAdjustmentRequest(request);
    setReviewNotes('');
    setReviewDialogOpen(true);
  };

  const handleApproveAdjustment = () => {
    if (!selectedAdjustmentRequest) return;
    
    setAdjustmentRequests(prev => 
      prev.map(req => 
        req.id === selectedAdjustmentRequest.id 
          ? { 
              ...req, 
              status: 'approved', 
              reviewedBy: user?.email || 'Admin',
              reviewedDate: new Date().toISOString().split('T')[0],
              reviewNotes 
            }
          : req
      )
    );
    
    // Update the commission amount
    setCommissions(prev =>
      prev.map(comm =>
        comm.id === selectedAdjustmentRequest.commissionId
          ? { ...comm, amount: selectedAdjustmentRequest.requestedAmount }
          : comm
      )
    );
    
    setReviewDialogOpen(false);
    setSelectedAdjustmentRequest(null);
    setReviewNotes('');
  };

  const handleRejectAdjustment = () => {
    if (!selectedAdjustmentRequest) return;
    
    setAdjustmentRequests(prev => 
      prev.map(req => 
        req.id === selectedAdjustmentRequest.id 
          ? { 
              ...req, 
              status: 'rejected', 
              reviewedBy: user?.email || 'Admin',
              reviewedDate: new Date().toISOString().split('T')[0],
              reviewNotes 
            }
          : req
      )
    );
    
    setReviewDialogOpen(false);
    setSelectedAdjustmentRequest(null);
    setReviewNotes('');
  };

  const handleViewDealDetails = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      setSelectedDeal(deal);
      setDealDetailsDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <div className="max-w-7xl mx-auto p-6">
        <UniversalNavbar 
          showBackButton={true} 
          backButtonText="Back to Admin Portal" 
          backButtonPath="/admin" 
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2" data-testid="page-title">Commission Tracking</h1>
              <p className="text-white/80">
                Current Period: {new Date(currentPeriod.periodStart).toLocaleDateString()} - {new Date(currentPeriod.periodEnd).toLocaleDateString()}
                <span className="ml-4">Next Payroll: {new Date(currentPeriod.payrollDate).toLocaleDateString()}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" data-testid="button-export">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button className="bg-white text-[#253e31] hover:bg-white/90" data-testid="button-process-payroll">
                <Calculator className="w-4 h-4 mr-2" />
                Process Payroll
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-current-period">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Period Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${totalCurrentPeriodCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-pending">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    ${totalPendingCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-processing">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Processing</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${totalProcessingCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-projected">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Projected</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${projectedCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-adjustments">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Adjustments</p>
                  <p className="text-2xl font-bold text-red-600">
                    {adjustmentRequests.filter(req => req.status === 'pending').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-white/95 backdrop-blur border-0 shadow-xl mb-8" data-testid="card-filters">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search deals, companies, or reps..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                  data-testid="input-search"
                />
              </div>
              <Select value={selectedSalesRep} onValueChange={setSelectedSalesRep}>
                <SelectTrigger className="w-48" data-testid="select-sales-rep">
                  <SelectValue placeholder="All Sales Reps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sales Reps</SelectItem>
                  {salesReps.map(rep => (
                    <SelectItem key={rep.id} value={rep.name}>{rep.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="select-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40" data-testid="select-period">
                  <SelectValue placeholder="Current Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Period</SelectItem>
                  <SelectItem value="last">Last Period</SelectItem>
                  <SelectItem value="all">All Periods</SelectItem>
                </SelectContent>
              </Select>
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
                        <TableHead>Deal / Company</TableHead>
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
                            <div>
                              <p className="font-semibold text-gray-900">{commission.dealName}</p>
                              <p className="text-sm text-gray-500">{commission.companyName}</p>
                            </div>
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
                                data-testid={`button-view-deal-${commission.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRequestAdjustment(commission)}
                                disabled={commission.status === 'paid'}
                                data-testid={`button-adjust-${commission.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {commission.hubspotDealId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  data-testid={`button-hubspot-${commission.id}`}
                                >
                                  <a href={`https://app.hubspot.com/contacts/deal/${commission.hubspotDealId}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
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
                          <TableHead>Deal / Company</TableHead>
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
              <DialogTitle>Request Commission Adjustment</DialogTitle>
              <DialogDescription>
                {selectedCommission && `Requesting adjustment for ${selectedCommission.dealName}`}
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
                <Label htmlFor="adjustment-amount">New Amount (optional)</Label>
                <Input
                  id="adjustment-amount"
                  type="number"
                  step="0.01"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder={selectedCommission?.amount.toString()}
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
                        <p className="text-lg font-bold text-green-600">${(selectedDeal.setupFee * 0.2).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">from ${selectedDeal.setupFee.toLocaleString()} setup fee</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">First Month Commission (40%)</p>
                        <p className="text-lg font-bold text-blue-600">${(selectedDeal.monthlyFee * 0.4).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">from ${selectedDeal.monthlyFee.toLocaleString()} monthly fee</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg col-span-2">
                        <p className="text-sm text-gray-600">Total First Month Commission</p>
                        <p className="text-xl font-bold text-purple-600">
                          ${((selectedDeal.setupFee * 0.2) + (selectedDeal.monthlyFee * 0.4)).toLocaleString()}
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

        {/* Bonus Tracking Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Bonus Tracking */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-orange-600" />
                Monthly Bonus Progress
              </CardTitle>
              <CardDescription>
                Track your monthly client goals and bonus eligibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Clients Closed This Month</span>
                  <span className="font-medium">{salesRepStats.totalClientsClosedMonthly}</span>
                </div>
                <Progress value={(salesRepStats.totalClientsClosedMonthly / 15) * 100} className="h-2" />
              </div>
              
              {monthlyBonusEligibility && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Bonus Eligible!</span>
                  </div>
                  <p className="text-sm text-green-700">{monthlyBonusEligibility.description}</p>
                  <p className="text-lg font-bold text-green-800">${monthlyBonusEligibility.amount}</p>
                </div>
              )}

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>5 Clients</span>
                  <span>$500 or AirPods</span>
                </div>
                <div className="flex justify-between">
                  <span>10 Clients</span>
                  <span>$1,000 or Apple Watch</span>
                </div>
                <div className="flex justify-between">
                  <span>15+ Clients</span>
                  <span>$1,500 or MacBook Air</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestone Bonus Tracking */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Milestone Progress
              </CardTitle>
              <CardDescription>
                Track lifetime client milestones and major bonuses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to {nextMilestone.nextMilestone} Clients</span>
                  <span className="font-medium">{salesRepStats.totalClientsClosedAllTime}/{nextMilestone.nextMilestone}</span>
                </div>
                <Progress value={nextMilestone.progress} className="h-2" />
                <p className="text-xs text-gray-500">{nextMilestone.remaining} clients remaining</p>
              </div>

              {milestoneBonuses.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Last Achievement</span>
                  </div>
                  <p className="text-sm text-yellow-700">40 Client Milestone</p>
                  <p className="text-lg font-bold text-yellow-800">$5,000 Bonus</p>
                </div>
              )}

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>25 Clients</span>
                  <span>$1,000</span>
                </div>
                <div className="flex justify-between">
                  <span>40 Clients</span>
                  <span>$5,000</span>
                </div>
                <div className="flex justify-between">
                  <span>60 Clients</span>
                  <span>$7,500</span>
                </div>
                <div className="flex justify-between">
                  <span>100 Clients</span>
                  <span>$10,000 + Equity</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Content Tabs */}
        <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
          <CardContent className="p-6">
            <Tabs defaultValue="deals" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="deals">Recent Deals</TabsTrigger>
                <TabsTrigger value="monthly-bonuses">Monthly Bonuses</TabsTrigger>
                <TabsTrigger value="milestone-bonuses">Milestone Bonuses</TabsTrigger>
              </TabsList>

              <TabsContent value="deals" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Recent Closed Deals</h3>
                    <Badge variant="outline">{deals.length} deals</Badge>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Setup Fee</TableHead>
                          <TableHead>Monthly Fee</TableHead>
                          <TableHead>Total Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Closed Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deals.map((deal) => (
                          <TableRow key={deal.id}>
                            <TableCell className="font-medium">{deal.companyName}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getServiceTypeIcon(deal.serviceType)}
                                <span className="capitalize">{deal.serviceType}</span>
                              </div>
                            </TableCell>
                            <TableCell>${deal.setupFee.toLocaleString()}</TableCell>
                            <TableCell>${deal.monthlyFee.toLocaleString()}</TableCell>
                            <TableCell className="font-medium">${deal.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                {deal.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {deal.closedDate ? new Date(deal.closedDate).toLocaleDateString() : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="monthly-bonuses" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Monthly Bonuses</h3>
                    <Badge variant="outline">{monthlyBonuses.length} bonuses</Badge>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Clients Closed</TableHead>
                          <TableHead>Bonus Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date Earned</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyBonuses.map((bonus) => (
                          <TableRow key={bonus.id}>
                            <TableCell className="font-medium">{bonus.month}</TableCell>
                            <TableCell>{bonus.clientsClosedCount}</TableCell>
                            <TableCell className="capitalize">{bonus.bonusType.replace('_', ' ')}</TableCell>
                            <TableCell className="font-medium">
                              ${bonus.bonusAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>{getStatusBadge(bonus.status)}</TableCell>
                            <TableCell>{new Date(bonus.dateEarned).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="milestone-bonuses" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Milestone Bonuses</h3>
                    <Badge variant="outline">{milestoneBonuses.length} achievements</Badge>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Milestone</TableHead>
                          <TableHead>Bonus Amount</TableHead>
                          <TableHead>Includes Equity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date Earned</TableHead>
                          <TableHead>Date Paid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {milestoneBonuses.map((bonus) => (
                          <TableRow key={bonus.id}>
                            <TableCell className="font-medium">{bonus.milestone} Clients</TableCell>
                            <TableCell className="font-medium">
                              ${bonus.bonusAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {bonus.includesEquity ? (
                                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                                  Yes
                                </Badge>
                              ) : (
                                <span className="text-gray-500">No</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(bonus.status)}</TableCell>
                            <TableCell>{new Date(bonus.dateEarned).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {bonus.datePaid ? new Date(bonus.datePaid).toLocaleDateString() : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

