import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, Users, Target, LogOut, TestTube } from "lucide-react";
import { useState } from "react";

interface DashboardStats {
  totalEarnings: number;
  thisMonthEarnings: number;
  totalClients: number;
  thisMonthClients: number;
  unpaidCommissions: number;
  nextMilestone: {
    threshold: number;
    current: number;
    bonusAmount: number;
  };
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Create test deal mutation
  const createTestDealMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/deals/test", {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to create test deal");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
    },
  });

  const handleCreateTestDeal = async () => {
    setIsCreatingTest(true);
    try {
      await createTestDealMutation.mutateAsync();
    } catch (error) {
      console.error("Error creating test deal:", error);
    } finally {
      setIsCreatingTest(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const milestoneProgress = stats ? (stats.nextMilestone.current / stats.nextMilestone.threshold) * 100 : 0;

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e24c00] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-[#e24c00] rounded-md flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Commission Tracker</h1>
                <p className="text-sm text-gray-500">Welcome back, {user?.firstName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleCreateTestDeal}
                disabled={isCreatingTest}
                variant="outline"
                size="sm"
                className="border-[#e24c00] text-[#e24c00] hover:bg-[#e24c00] hover:text-white"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isCreatingTest ? "Creating..." : "Create Test Deal"}
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.totalEarnings || 0)}
              </div>
              <p className="text-xs text-muted-foreground">All-time commission earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#e24c00]">
                {formatCurrency(stats?.thisMonthEarnings || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Current month earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalClients || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.thisMonthClients || 0} closed this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats?.unpaidCommissions || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Unpaid commissions</p>
            </CardContent>
          </Card>
        </div>

        {/* Milestone Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Next Milestone Progress</CardTitle>
            <CardDescription>
              Track your progress toward the next commission milestone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {stats?.nextMilestone.current || 0} / {stats?.nextMilestone.threshold || 25} clients
                </span>
                <Badge variant="outline" className="text-[#e24c00] border-[#e24c00]">
                  {formatCurrency(stats?.nextMilestone.bonusAmount || 0)} bonus
                </Badge>
              </div>
              <Progress value={Math.min(milestoneProgress, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats?.nextMilestone.threshold ? 
                  `${Math.max(0, stats.nextMilestone.threshold - (stats.nextMilestone.current || 0))} more clients to unlock your next milestone bonus`
                  : "Keep closing deals to earn milestone bonuses!"
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Commission Structure */}
        <Card>
          <CardHeader>
            <CardTitle>Commission Structure</CardTitle>
            <CardDescription>
              Your commission rates and bonus opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Commission Rates</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Month 1</span>
                    <Badge>40%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Setup Fee</span>
                    <Badge>20%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Months 2-12</span>
                    <Badge>10%</Badge>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Monthly Bonuses</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>5 clients</span>
                    <Badge variant="outline">$500</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>10 clients</span>
                    <Badge variant="outline">$1,000</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>15+ clients</span>
                    <Badge variant="outline">$1,500</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}