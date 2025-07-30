import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS } from "@shared/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, Users, DollarSign, Phone, Mail, Calendar, Target } from "lucide-react";
import navLogoPath from "@assets/Nav Logo_1753431362883.png";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";

export default function SalesDashboard() {
  const { hasPermission, getAvailableDashboards } = usePermissions();
  const { dbUser: currentUser, signOut } = useGoogleAuth();
  const [, navigate] = useLocation();
  const availableDashboards = getAvailableDashboards();

  if (!hasPermission(PERMISSIONS.VIEW_SALES_DASHBOARD)) {
    return (
      <PermissionGuard permissions={PERMISSIONS.VIEW_SALES_DASHBOARD}>
        <div />
      </PermissionGuard>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white/10 backdrop-blur-md border-r border-white/20 shadow-xl fixed h-full overflow-y-auto">
        {/* SEEDOS Header */}
        <div className="p-6 border-b border-white/20 h-[88px] flex items-center justify-center">
          <div className="flex items-center gap-3">
            <img src={navLogoPath} alt="Seed Financial" className="h-12" />
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-white/20 bg-white">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentUser?.profilePhoto || ''} />
                  <AvatarFallback className="bg-orange-500 text-white">
                    {currentUser?.firstName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-600 truncate">Sales Team</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {availableDashboards.length > 1 && (
                <>
                  {availableDashboards.map(dashboard => (
                    <DropdownMenuItem key={dashboard.route} onClick={() => navigate(dashboard.route)}>
                      {dashboard.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem className="border-t mt-2 pt-2" onClick={signOut}>
                    Sign out
                  </DropdownMenuItem>
                </>
              )}
              {availableDashboards.length === 1 && (
                <DropdownMenuItem onClick={signOut}>
                  Sign out
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation Menu */}
        <div className="p-4 space-y-6">
          <div>
            <p className="text-white/60 text-xs font-semibold mb-3 uppercase tracking-wider">Sales Pipeline</p>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigate('/sales-dashboard')}
              >
                <Activity className="mr-3 h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigate('/calculator')}
              >
                <DollarSign className="mr-3 h-4 w-4" />
                Quote Calculator
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigate('/commission-tracker')}
              >
                <TrendingUp className="mr-3 h-4 w-4" />
                Commission Tracker
              </Button>
            </div>
          </div>

          <div>
            <p className="text-white/60 text-xs font-semibold mb-3 uppercase tracking-wider">Client Management</p>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigate('/client-intel')}
              >
                <Users className="mr-3 h-4 w-4" />
                Client Intelligence
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigate('/knowledge-base')}
              >
                <Calendar className="mr-3 h-4 w-4" />
                Knowledge Base
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-64">
        {/* Top Header */}
        <div className="bg-white/10 backdrop-blur-md border-b border-white/20 px-6 py-6 h-[88px]">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                SEED<span className="text-orange-500">OS</span>
              </h1>
              <p className="text-white/70 text-lg">Sales Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                <Target className="mr-2 h-4 w-4" />
                Goals
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Quota</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45K</div>
                <p className="text-xs text-gray-600">75% to goal</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Prospects</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-gray-600">+3 this week</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">32%</div>
                <p className="text-xs text-gray-600">+5% from last month</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MTD Commission</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$3,250</div>
                <p className="text-xs text-gray-600">On track for $4.2K</p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-600" />
                  Recent Activities
                </CardTitle>
                <CardDescription>Your latest sales activities and follow-ups</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Called TechStart Inc.</p>
                      <p className="text-xs text-gray-600">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Mail className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Sent proposal to Acme Corp</p>
                      <p className="text-xs text-gray-600">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">Meeting scheduled with GrowthCo</p>
                      <p className="text-xs text-gray-600">Yesterday</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Pipeline Overview
                </CardTitle>
                <CardDescription>Your sales pipeline breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium">Qualification</span>
                    <span className="text-sm text-gray-600">8 prospects</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Proposal</span>
                    <span className="text-sm text-gray-600">5 prospects</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Negotiation</span>
                    <span className="text-sm text-gray-600">3 prospects</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Closing</span>
                    <span className="text-sm text-gray-600">2 prospects</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}