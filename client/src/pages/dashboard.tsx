import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Calculator, 
  LogOut, 
  User, 
  BookOpen, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  MessageSquare, 
  Bell, 
  Search,
  TrendingUp,
  Calendar,
  CreditCard,
  Globe,
  Shield,
  Zap,
  Database,
  Clock,
  Target,
  PieChart,
  Activity
} from "lucide-react";
import navLogoPath from "@assets/Nav Logo_1753431362883.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-8xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <img 
                src={navLogoPath} 
                alt="Seed Financial Logo" 
                className="h-8"
              />
              <div className="hidden md:flex items-center space-x-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search tools, clients, documents..." 
                    className="pl-10 w-80 bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <Bell className="h-4 w-4 mr-2" />
                <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">3</Badge>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#e24c00] to-[#ff6b35] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:block">{user?.email?.split('@')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-3 py-2 border-b">
                    <p className="font-medium">{user?.email?.split('@')[0]}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Preferences
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#253e31] via-[#2d4937] to-[#3a5d47] text-white">
        <div className="max-w-8xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Good morning, {user?.email?.split('@')[0]} 👋
              </h1>
              <p className="text-lg text-gray-200">{currentDate}</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-300">Active Clients</p>
                <p className="text-2xl font-bold">247</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-300">This Month's Revenue</p>
                <p className="text-2xl font-bold">$89.2K</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-8xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Link href="/calculator">
              <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-[#e24c00] bg-gradient-to-br from-white to-orange-50">
                <CardContent className="p-4 text-center">
                  <Calculator className="h-8 w-8 text-[#e24c00] mx-auto mb-2" />
                  <p className="font-medium text-sm">Quote Calculator</p>
                </CardContent>
              </Card>
            </Link>
            
            <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="font-medium text-sm">Client Portal</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-green-500 bg-gradient-to-br from-white to-green-50">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-sm">Analytics</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50">
              <CardContent className="p-4 text-center">
                <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="font-medium text-sm">Schedule</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-indigo-500 bg-gradient-to-br from-white to-indigo-50">
              <CardContent className="p-4 text-center">
                <FileText className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <p className="font-medium text-sm">Documents</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-pink-500 bg-gradient-to-br from-white to-pink-50">
              <CardContent className="p-4 text-center">
                <MessageSquare className="h-8 w-8 text-pink-600 mx-auto mb-2" />
                <p className="font-medium text-sm">Team Chat</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Tools Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Primary Tools */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Primary Tools</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/calculator">
                  <Card className="hover:shadow-lg transition-all cursor-pointer group">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-2 bg-[#e24c00]/10 rounded-lg group-hover:bg-[#e24c00]/20 transition-colors">
                          <Calculator className="h-6 w-6 text-[#e24c00]" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Quote Calculator</h3>
                          <Badge variant="secondary" className="mt-1">Active</Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">
                        Advanced pricing engine with HubSpot integration for bookkeeping and tax services.
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Activity className="h-3 w-3 mr-1" />
                        127 quotes this month
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                
                <Card className="hover:shadow-lg transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Revenue Analytics</h3>
                        <Badge variant="outline">Premium</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      Real-time financial dashboards with predictive modeling and client profitability analysis.
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +23% vs last month
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                        <Database className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Client Intelligence</h3>
                        <Badge variant="secondary">AI-Powered</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      Advanced CRM with automated insights, risk assessment, and growth opportunities.
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Users className="h-3 w-3 mr-1" />
                      247 active clients
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                        <Zap className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Process Automation</h3>
                        <Badge variant="secondary">Beta</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      Workflow automation for reconciliation, reporting, and client communications.
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      84% time saved
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Right Column - Resources & Team */}
          <div className="space-y-6">
            {/* Knowledge Base */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  Knowledge Base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 -mx-3 px-3 rounded">
                  <span className="text-sm font-medium">Tax Code Updates 2024</span>
                  <Badge variant="secondary" className="text-xs">New</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 -mx-3 px-3 rounded">
                  <span className="text-sm">Client Onboarding Guide</span>
                  <span className="text-xs text-gray-500">Updated</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 -mx-3 px-3 rounded">
                  <span className="text-sm">Pricing Strategy Manual</span>
                  <span className="text-xs text-gray-500">Essential</span>
                </div>
                <div className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 -mx-3 px-3 rounded">
                  <span className="text-sm">Compliance Checklist</span>
                  <span className="text-xs text-gray-500">Reference</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  Browse All Resources
                </Button>
              </CardContent>
            </Card>

            {/* Team Directory */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Team Directory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    A
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Alex Chen</p>
                    <p className="text-xs text-gray-500">Senior Accountant</p>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    S
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Sarah Martinez</p>
                    <p className="text-xs text-gray-500">Tax Specialist</p>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    M
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Mike Johnson</p>
                    <p className="text-xs text-gray-500">Client Success</p>
                  </div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  View Full Directory
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-[#e24c00] rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Quote #2847 approved</p>
                      <p className="text-xs text-gray-500">TechStart Inc. - $2,450/mo</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Client onboarded</p>
                      <p className="text-xs text-gray-500">Wellness Co. - Premium package</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Report generated</p>
                      <p className="text-xs text-gray-500">Q3 Financial Summary</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}