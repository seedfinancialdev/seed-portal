import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, TrendingUp, Award, Calendar, Target } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface DashboardData {
  salesRep: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  currentMonth: {
    earnings: number;
    clientsClosed: number;
    commissions: Array<{
      id: number;
      commissionType: string;
      commissionAmount: string;
      paymentMonth: string;
      isPaid: boolean;
    }>;
  };
  bonuses: {
    monthly: {
      eligibleBonus: string | null;
      bonusAmount: number;
      rewardOptions: string[];
    };
    milestone: {
      nextMilestone: string | null;
      clientsToNextMilestone: number;
      upcomingBonusAmount: number;
    };
  };
  totalStats: {
    totalClients: number;
    totalEarnings: number;
    paidEarnings: number;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">No data available</h2>
            <p className="text-gray-600 mt-2">Unable to load dashboard data.</p>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const currentMonth = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Commission Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {dashboardData.salesRep.firstName} {dashboardData.salesRep.lastName}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link href="/deals">
                <Button variant="outline">Manage Deals</Button>
              </Link>
              <Link href="/reports">
                <Button>View Reports</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Current Month Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month's Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#e24c00]">
                {formatCurrency(dashboardData.currentMonth.earnings)}
              </div>
              <p className="text-xs text-muted-foreground">{currentMonth}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients Closed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.currentMonth.clientsClosed}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Lifetime Clients</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.totalStats.totalClients}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalStats.totalEarnings)}</div>
              <p className="text-xs text-muted-foreground">
                Paid: {formatCurrency(dashboardData.totalStats.paidEarnings)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bonus Section */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Monthly Bonus */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Monthly Bonus Status
              </CardTitle>
              <CardDescription>Bonus eligibility for {currentMonth}</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.bonuses.monthly.eligibleBonus ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Qualified for:</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {dashboardData.bonuses.monthly.eligibleBonus.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bonus Amount:</span>
                    <span className="font-bold text-[#e24c00]">
                      {formatCurrency(dashboardData.bonuses.monthly.bonusAmount)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Reward Options:</span>
                    <div className="flex flex-wrap gap-2">
                      {dashboardData.bonuses.monthly.rewardOptions.map((option) => (
                        <Badge key={option} variant="outline">
                          {option.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    Close {5 - dashboardData.currentMonth.clientsClosed} more clients to qualify for monthly bonus
                  </p>
                  <div className="mt-2 text-sm text-muted-foreground">
                    5 clients = $500 | 10 clients = $1,000 | 15+ clients = $1,500
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Milestone Bonus */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Milestone Progress
              </CardTitle>
              <CardDescription>Progress toward next milestone bonus</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.bonuses.milestone.nextMilestone ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Next Milestone:</span>
                    <Badge variant="outline">
                      {dashboardData.bonuses.milestone.nextMilestone.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Clients Needed:</span>
                    <span className="font-bold">
                      {dashboardData.bonuses.milestone.clientsToNextMilestone} more
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bonus Value:</span>
                    <span className="font-bold text-[#e24c00]">
                      {formatCurrency(dashboardData.bonuses.milestone.upcomingBonusAmount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#e24c00] h-2 rounded-full" 
                      style={{ 
                        width: `${(dashboardData.totalStats.totalClients / (dashboardData.totalStats.totalClients + dashboardData.bonuses.milestone.clientsToNextMilestone)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-green-600 font-semibold">🎉 All milestones achieved!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    You've reached the highest milestone. Amazing work!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Commissions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Commissions</CardTitle>
            <CardDescription>Your latest commission earnings</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.currentMonth.commissions.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.currentMonth.commissions.slice(0, 5).map((commission) => (
                  <div key={commission.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium capitalize">
                        {commission.commissionType.replace('_', ' ')} Commission
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(commission.paymentMonth).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#e24c00]">
                        {formatCurrency(parseFloat(commission.commissionAmount))}
                      </div>
                      <Badge variant={commission.isPaid ? "default" : "secondary"}>
                        {commission.isPaid ? "Paid" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="text-center">
                  <Link href="/reports">
                    <Button variant="outline">View All Commissions</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No commissions this month yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Close your first deal to start earning commissions!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}