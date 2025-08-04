import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS } from "@shared/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Clock, CheckCircle, AlertTriangle, Users, FileText, Headphones, Settings } from "lucide-react";
import navLogoPath from "@assets/Nav Logo_1753431362883.png";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { useNavigationHistory } from "@/hooks/use-navigation-history";

export default function ServiceDashboard() {
  const { hasPermission, getAvailableDashboards } = usePermissions();
  const { user: currentUser, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const { navigateTo } = useNavigationHistory();
  const availableDashboards = getAvailableDashboards();

  if (!hasPermission(PERMISSIONS.VIEW_SERVICE_DASHBOARD)) {
    return (
      <PermissionGuard permissions={PERMISSIONS.VIEW_SERVICE_DASHBOARD}>
        <div />
      </PermissionGuard>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-purple-600 flex">
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
                  <p className="text-xs text-gray-600 truncate">Service Team</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {availableDashboards.length > 1 && (
                <>
                  {availableDashboards.map(dashboard => (
                    <DropdownMenuItem key={dashboard.route} onClick={() => navigateTo(dashboard.route)}>
                      {dashboard.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem className="border-t mt-2 pt-2" onClick={() => logoutMutation.mutate()}>
                    Sign out
                  </DropdownMenuItem>
                </>
              )}
              {availableDashboards.length === 1 && (
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                  Sign out
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation Menu */}
        <div className="p-4 space-y-6">
          <div>
            <p className="text-white/60 text-xs font-semibold mb-3 uppercase tracking-wider">Client Services</p>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigateTo('/service-dashboard')}
              >
                <Wrench className="mr-3 h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigateTo('/calculator')}
              >
                <FileText className="mr-3 h-4 w-4" />
                Quote Reference
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigateTo('/client-intel')}
              >
                <Users className="mr-3 h-4 w-4" />
                Client Profiles
              </Button>
            </div>
          </div>

          <div>
            <p className="text-white/60 text-xs font-semibold mb-3 uppercase tracking-wider">Support Tools</p>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
                onClick={() => navigateTo('/knowledge-base')}
              >
                <FileText className="mr-3 h-4 w-4" />
                Knowledge Base
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
              >
                <Headphones className="mr-3 h-4 w-4" />
                Support Tickets
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10"
              >
                <Settings className="mr-3 h-4 w-4" />
                Client Setup
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
              <p className="text-white/70 text-lg">Service Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                <Headphones className="mr-2 h-4 w-4" />
                Support
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
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-gray-600">-3 from yesterday</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89</div>
                <p className="text-xs text-gray-600">+2 new this week</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.4h</div>
                <p className="text-xs text-gray-600">15% faster than goal</p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Satisfaction Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94%</div>
                <p className="text-xs text-gray-600">+2% this month</p>
              </CardContent>
            </Card>
          </div>

          {/* Service Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Priority Tickets
                </CardTitle>
                <CardDescription>High priority client issues requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-sm font-medium">BookKeeping sync issue - TechCorp</p>
                      <p className="text-xs text-gray-600">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium">Tax filing delay - StartupXYZ</p>
                      <p className="text-xs text-gray-600">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <FileText className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium">Monthly report questions - GrowthCo</p>
                      <p className="text-xs text-gray-600">6 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Client Health
                </CardTitle>
                <CardDescription>Overall client account health overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Healthy Accounts</span>
                    <span className="text-sm text-gray-600">76 clients</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium">Needs Attention</span>
                    <span className="text-sm text-gray-600">10 clients</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium">At Risk</span>
                    <span className="text-sm text-gray-600">3 clients</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">New Onboarding</span>
                    <span className="text-sm text-gray-600">5 clients</span>
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