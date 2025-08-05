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
  CreditCard
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
  serviceType: string;
  type: 'month_1' | 'residual';
  monthNumber: number;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  dateEarned: string;
  datePaid?: string;
}

interface Deal {
  id: string;
  dealName: string;
  companyName: string;
  serviceType: string;
  amount: number;
  setupFee: number;
  monthlyFee: number;
  status: 'closed_won' | 'closed_lost';
  closedDate: string;
}

interface MonthlyBonus {
  id: string;
  month: string;
  clientsClosedCount: number;
  bonusType: 'cash' | 'product';
  bonusAmount: number;
  status: 'pending' | 'approved' | 'paid';
  dateEarned: string;
  datePaid?: string;
}

interface MilestoneBonus {
  id: string;
  milestone: number;
  bonusAmount: number;
  includesEquity: boolean;
  status: 'pending' | 'approved' | 'paid';
  dateEarned: string;
  datePaid?: string;
}

interface SalesRepStats {
  totalCommissionsEarned: number;
  totalClientsClosedMonthly: number;
  totalClientsClosedAllTime: number;
  currentPeriodCommissions: number;
  projectedEarnings: number;
}

export function SalesCommissionTracker() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  // State
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [monthlyBonuses, setMonthlyBonuses] = useState<MonthlyBonus[]>([]);
  const [milestoneBonuses, setMilestoneBonuses] = useState<MilestoneBonus[]>([]);
  const [salesRepStats, setSalesRepStats] = useState<SalesRepStats>({
    totalCommissionsEarned: 0,
    totalClientsClosedMonthly: 0,
    totalClientsClosedAllTime: 0,
    currentPeriodCommissions: 0,
    projectedEarnings: 0
  });

  // Dialog states
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [commissionHistoryModalOpen, setCommissionHistoryModalOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Load sample data
  useEffect(() => {
    const userEmail = user?.email || '';
    const userName = user?.firstName + ' ' + user?.lastName || 'Sales Rep';

    // Sample data filtered for current user
    const sampleCommissions: Commission[] = [
      {
        id: 'comm-1',
        dealId: 'deal-1',
        dealName: 'Bookkeeping Setup',
        companyName: 'Tech Startup LLC',
        serviceType: 'bookkeeping',
        type: 'month_1',
        monthNumber: 1,
        amount: 2400,
        status: 'approved',
        dateEarned: '2025-01-15'
      },
      {
        id: 'comm-2',
        dealId: 'deal-2',
        dealName: 'TaaS Implementation',
        companyName: 'Growth Co',
        serviceType: 'taas',
        type: 'month_1',
        monthNumber: 1,
        amount: 3200,
        status: 'pending',
        dateEarned: '2025-01-20'
      },
      {
        id: 'comm-3',
        dealId: 'deal-1',
        dealName: 'Bookkeeping Setup',
        companyName: 'Tech Startup LLC',
        serviceType: 'bookkeeping',
        type: 'residual',
        monthNumber: 2,
        amount: 450,
        status: 'paid',
        dateEarned: '2025-02-01',
        datePaid: '2025-02-15'
      },
      {
        id: 'comm-4',
        dealId: 'deal-3',
        dealName: 'Payroll Setup',
        companyName: 'Local Restaurant',
        serviceType: 'payroll',
        type: 'month_1',
        monthNumber: 1,
        amount: 1800,
        status: 'approved',
        dateEarned: '2025-01-28'
      }
    ];

    const sampleDeals: Deal[] = [
      {
        id: 'deal-1',
        dealName: 'Bookkeeping Setup',
        companyName: 'Tech Startup LLC',
        serviceType: 'bookkeeping',
        amount: 12000,
        setupFee: 2000,
        monthlyFee: 1000,
        status: 'closed_won',
        closedDate: '2025-01-15'
      },
      {
        id: 'deal-2',
        dealName: 'TaaS Implementation',
        companyName: 'Growth Co',
        serviceType: 'taas',
        amount: 16000,
        setupFee: 3000,
        monthlyFee: 1300,
        status: 'closed_won',
        closedDate: '2025-01-20'
      },
      {
        id: 'deal-3',
        dealName: 'Payroll Setup',
        companyName: 'Local Restaurant',
        serviceType: 'payroll',
        amount: 9000,
        setupFee: 1500,
        monthlyFee: 750,
        status: 'closed_won',
        closedDate: '2025-01-28'
      }
    ];

    const sampleMonthlyBonuses: MonthlyBonus[] = [
      {
        id: 'mb-1',
        month: 'January 2025',
        clientsClosedCount: 12,
        bonusType: 'cash',
        bonusAmount: 1000,
        status: 'approved',
        dateEarned: '2025-01-31'
      }
    ];

    const sampleMilestoneBonuses: MilestoneBonus[] = [
      {
        id: 'msb-1',
        milestone: 40,
        bonusAmount: 5000,
        includesEquity: false,
        status: 'paid',
        dateEarned: '2024-12-15',
        datePaid: '2025-01-15'
      }
    ];

    setCommissions(sampleCommissions);
    setDeals(sampleDeals);
    setMonthlyBonuses(sampleMonthlyBonuses);
    setMilestoneBonuses(sampleMilestoneBonuses);

    // Calculate stats
    const totalCommissions = sampleCommissions.reduce((sum, c) => sum + c.amount, 0);
    const currentPeriodCommissions = sampleCommissions
      .filter(c => c.dateEarned >= '2025-01-14' && c.dateEarned <= '2025-02-13')
      .reduce((sum, c) => sum + c.amount, 0);
    
    setSalesRepStats({
      totalCommissionsEarned: totalCommissions,
      totalClientsClosedMonthly: 12,
      totalClientsClosedAllTime: 45,
      currentPeriodCommissions,
      projectedEarnings: 2500
    });
  }, [user]);

  // Helper functions
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>,
      approved: <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Approved</Badge>,
      paid: <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>,
      disputed: <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Disputed</Badge>
    };
    
    return variants[status as keyof typeof variants] || <Badge variant="outline">{status}</Badge>;
  };

  const getServiceTypeIcon = (serviceType: string) => {
    const icons = {
      bookkeeping: <Calculator className="w-4 h-4 text-blue-600" />,
      taas: <Building2 className="w-4 h-4 text-purple-600" />,
      payroll: <CreditCard className="w-4 h-4 text-green-600" />,
      ap_ar_lite: <FileText className="w-4 h-4 text-orange-600" />,
      fpa_lite: <BarChart3 className="w-4 h-4 text-red-600" />
    };
    
    return icons[serviceType as keyof typeof icons] || <Calculator className="w-4 h-4 text-gray-600" />;
  };

  // Calculate bonus eligibility
  const monthlyBonusEligibility = calculateMonthlyBonus(salesRepStats.totalClientsClosedMonthly);
  const milestoneBonusEligibility = calculateMilestoneBonus(salesRepStats.totalClientsClosedAllTime);
  const nextMilestone = getNextMilestone(salesRepStats.totalClientsClosedAllTime);
  const totalEarnings = calculateTotalEarnings(salesRepStats.totalCommissionsEarned, monthlyBonuses, milestoneBonuses);

  // Event handlers
  const handleRequestAdjustment = (commission: Commission) => {
    setSelectedCommission(commission);
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setAdjustmentDialogOpen(true);
  };

  const handleSubmitAdjustment = () => {
    if (selectedCommission && adjustmentReason.trim()) {
      // In real app, would submit to API
      console.log('Adjustment request submitted:', {
        commissionId: selectedCommission.id,
        requestedAmount: adjustmentAmount || selectedCommission.amount,
        reason: adjustmentReason
      });
      
      setAdjustmentDialogOpen(false);
      setSelectedCommission(null);
      setAdjustmentAmount('');
      setAdjustmentReason('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <UniversalNavbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/sales-dashboard')}
              className="flex items-center gap-2"
              data-testid="button-back-sales"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sales Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Commission Tracking</h1>
              <p className="text-gray-600">
                Track your earnings, bonuses, and commission history
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button size="sm" data-testid="button-view-history" onClick={() => setCommissionHistoryModalOpen(true)}>
              <Eye className="h-4 w-4 mr-2" />
              View All History
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-current-period">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Period</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${salesRepStats.currentPeriodCommissions.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Jan 14 - Feb 13</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-total-earnings">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${totalEarnings.totalEarnings.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">All time</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-pending">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ${commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {commissions.filter(c => c.status === 'pending').length} items
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl" data-testid="card-projected">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Projected Earnings</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${salesRepStats.projectedEarnings.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Next period</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission History - Primary Focus */}
        <Card className="bg-white/95 backdrop-blur border-0 shadow-xl mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Commission History
                </CardTitle>
                <CardDescription>
                  View and manage all your commission earnings
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCommissionHistoryModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Earned</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.slice(0, 5).map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">{commission.dealName}</p>
                          <p className="text-sm text-gray-500">{commission.companyName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getServiceTypeIcon(commission.serviceType)}
                          <span className="capitalize">{commission.serviceType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={commission.type === 'month_1' ? 'default' : 'secondary'}>
                          {commission.type === 'month_1' ? 'First Month' : `Month ${commission.monthNumber}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {commission.monthNumber}
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
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleRequestAdjustment(commission)}
                        >
                          Request Adjustment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {commissions.length > 5 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Showing {Math.min(5, commissions.length)} of {commissions.length} commissions
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Commission History Modal */}
        <Dialog open={commissionHistoryModalOpen} onOpenChange={setCommissionHistoryModalOpen}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Complete Commission History</DialogTitle>
              <DialogDescription>
                View all your commission earnings and manage adjustments
              </DialogDescription>
            </DialogHeader>
            
            <div className="overflow-y-auto max-h-[60vh]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Earned</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-medium">{commission.companyName}</p>
                            <p className="text-sm text-gray-500">{commission.dealName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getServiceTypeIcon(commission.serviceType)}
                            <span className="capitalize">{commission.serviceType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {commission.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{commission.monthNumber}</TableCell>
                        <TableCell className="font-medium">
                          ${commission.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{getStatusBadge(commission.status)}</TableCell>
                        <TableCell>{new Date(commission.dateEarned).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              setCommissionHistoryModalOpen(false);
                              handleRequestAdjustment(commission);
                            }}
                          >
                            Request Adjustment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            <DialogFooter>
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-gray-500">
                  Total: {commissions.length} commission entries
                </div>
                <Button onClick={() => setCommissionHistoryModalOpen(false)}>
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjustment Request Dialog */}
        <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Request Commission Adjustment</DialogTitle>
              <DialogDescription>
                Submit a request to adjust the commission amount for this deal.
              </DialogDescription>
            </DialogHeader>
            
            {selectedCommission && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold">{selectedCommission.companyName}</h4>
                  <p className="text-sm text-gray-600">{selectedCommission.dealName}</p>
                  <p className="text-lg font-bold text-green-600">
                    Current Amount: ${selectedCommission.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adjustment-amount">Requested Amount (optional)</Label>
                  <Input
                    id="adjustment-amount"
                    type="number"
                    step="0.01"
                    placeholder="Leave blank if not requesting amount change"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adjustment-reason">Reason for Adjustment *</Label>
                  <Textarea
                    id="adjustment-reason"
                    placeholder="Please explain why this adjustment is needed..."
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAdjustmentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAdjustment}
                disabled={!adjustmentReason.trim()}
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