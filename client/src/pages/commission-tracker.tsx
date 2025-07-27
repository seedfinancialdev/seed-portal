import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
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
  PlusCircle
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
  dealName: string;
  serviceType: 'bookkeeping' | 'taas' | 'combined';
  type: 'month_1' | 'residual';
  amount: number;
  monthNumber: number;
  status: 'pending' | 'processing' | 'paid';
  dateEarned: string;
  datePaid?: string;
  companyName: string;
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
}

interface MilestoneBonus {
  id: string;
  milestone: number;
  bonusAmount: number;
  includesEquity: boolean;
  status: 'pending' | 'processing' | 'paid';
  dateEarned: string;
  datePaid?: string;
}

interface SalesRepStats {
  totalClientsClosedMonthly: number;
  totalClientsClosedAllTime: number;
  currentMonthDeals: number;
}

export default function CommissionTracker() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [monthlyBonuses, setMonthlyBonuses] = useState<MonthlyBonus[]>([]);
  const [milestoneBonuses, setMilestoneBonuses] = useState<MilestoneBonus[]>([]);
  const [salesRepStats, setSalesRepStats] = useState<SalesRepStats>({
    totalClientsClosedMonthly: 8,
    totalClientsClosedAllTime: 42,
    currentMonthDeals: 3
  });

  // Sample data matching the specifications
  useEffect(() => {
    const sampleCommissions: Commission[] = [
      {
        id: '1',
        dealName: 'TechFlow Solutions - Bookkeeping + TaaS',
        companyName: 'TechFlow Solutions',
        serviceType: 'combined',
        type: 'month_1',
        amount: 840, // 20% of $2500 setup + 40% of $850 monthly
        monthNumber: 1,
        status: 'paid',
        dateEarned: '2025-01-15',
        datePaid: '2025-01-30'
      },
      {
        id: '2',
        dealName: 'Wellness Hub Inc - Bookkeeping',
        companyName: 'Wellness Hub Inc',
        serviceType: 'bookkeeping',
        type: 'month_1',
        amount: 420, // 20% of $1200 setup + 40% of $450 monthly
        monthNumber: 1,
        status: 'processing',
        dateEarned: '2025-01-20'
      },
      {
        id: '3',
        dealName: 'TechFlow Solutions - Bookkeeping + TaaS',
        companyName: 'TechFlow Solutions',
        serviceType: 'combined',
        type: 'residual',
        amount: 85, // 10% of $850 monthly
        monthNumber: 2,
        status: 'pending',
        dateEarned: '2025-02-15'
      },
      {
        id: '4',
        dealName: 'Creative Agency LLC - Bookkeeping',
        companyName: 'Creative Agency LLC',
        serviceType: 'bookkeeping',
        type: 'month_1',
        amount: 320, // 20% of $800 setup + 40% of $600 monthly
        monthNumber: 1,
        status: 'pending',
        dateEarned: '2025-01-25'
      }
    ];

    const sampleDeals: Deal[] = [
      {
        id: '1',
        dealName: 'TechFlow Solutions - Bookkeeping + TaaS',
        companyName: 'TechFlow Solutions',
        amount: 2500 + 850, // Setup + Monthly
        setupFee: 2500,
        monthlyFee: 850,
        status: 'closed_won',
        closedDate: '2025-01-15',
        serviceType: 'combined'
      },
      {
        id: '2',
        dealName: 'Wellness Hub Inc - Bookkeeping',
        companyName: 'Wellness Hub Inc',
        amount: 1200 + 450,
        setupFee: 1200,
        monthlyFee: 450,
        status: 'closed_won',
        closedDate: '2025-01-20',
        serviceType: 'bookkeeping'
      },
      {
        id: '3',
        dealName: 'Creative Agency LLC - Bookkeeping',
        companyName: 'Creative Agency LLC',
        amount: 800 + 600,
        setupFee: 800,
        monthlyFee: 600,
        status: 'closed_won',
        closedDate: '2025-01-25',
        serviceType: 'bookkeeping'
      }
    ];

    // Sample monthly bonus (8 clients closed this month - eligible for Apple Watch or $1000)
    const sampleMonthlyBonuses: MonthlyBonus[] = [
      {
        id: '1',
        month: '2025-01',
        clientsClosedCount: 8,
        bonusAmount: 1000,
        bonusType: 'cash',
        status: 'processing',
        dateEarned: '2025-01-31'
      }
    ];

    // Sample milestone bonus (42 total clients - eligible for $5000 at 40 clients)
    const sampleMilestoneBonuses: MilestoneBonus[] = [
      {
        id: '1',
        milestone: 40,
        bonusAmount: 5000,
        includesEquity: false,
        status: 'paid',
        dateEarned: '2025-01-10',
        datePaid: '2025-01-25'
      }
    ];

    setCommissions(sampleCommissions);
    setDeals(sampleDeals);
    setMonthlyBonuses(sampleMonthlyBonuses);
    setMilestoneBonuses(sampleMilestoneBonuses);
  }, []);

  // Calculate earnings using the shared calculator
  const totalEarnings = calculateTotalEarnings(commissions, monthlyBonuses, milestoneBonuses);
  
  // Calculate bonus eligibility
  const monthlyBonusEligibility = calculateMonthlyBonus(salesRepStats.totalClientsClosedMonthly);
  const milestoneBonusEligibility = calculateMilestoneBonus(salesRepStats.totalClientsClosedAllTime);
  const nextMilestone = getNextMilestone(salesRepStats.totalClientsClosedAllTime);

  const getStatusBadge = (status: Commission['status'] | MonthlyBonus['status'] | MilestoneBonus['status']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200">Processing</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200">Unknown</Badge>;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Portal
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Commission Tracker</h1>
              <p className="text-white/70">Track your earnings and commission status</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white text-right">
              <p className="text-sm opacity-75">Monthly Clients</p>
              <p className="text-xl font-bold">{salesRepStats.totalClientsClosedMonthly}</p>
            </div>
            <div className="text-white text-right">
              <p className="text-sm opacity-75">Total Clients</p>
              <p className="text-xl font-bold">{salesRepStats.totalClientsClosedAllTime}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Earned</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${totalEarnings.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${totalEarnings.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Processing</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    ${totalEarnings.totalProcessing.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-600">
                    ${totalEarnings.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

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

        {/* Main Content Tabs */}
        <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
          <CardContent className="p-6">
            <Tabs defaultValue="commissions" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="commissions">Commissions</TabsTrigger>
                <TabsTrigger value="deals">Recent Deals</TabsTrigger>
                <TabsTrigger value="monthly-bonuses">Monthly Bonuses</TabsTrigger>
                <TabsTrigger value="milestone-bonuses">Milestone Bonuses</TabsTrigger>
              </TabsList>

              <TabsContent value="commissions" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Commission History</h3>
                    <Badge variant="outline">{commissions.length} entries</Badge>
                  </div>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

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

