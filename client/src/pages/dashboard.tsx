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
  Activity,
  DollarSign,
  Video,
  Bot,
  GraduationCap,
  Megaphone,
  Slack,
  Inbox,
  UserCheck,
  Menu,
  ChevronRight,
  Filter
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <img 
                src={navLogoPath} 
                alt="Seed Financial Logo" 
                className="h-8"
              />
              <div className="hidden lg:flex items-center space-x-6">
                <nav className="flex space-x-6">
                  <Button variant="ghost" className="text-gray-700 hover:text-gray-900 font-medium">
                    Dashboard
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="text-gray-700 hover:text-gray-900 font-medium">
                        Tools <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64">
                      <DropdownMenuItem>
                        <Calculator className="mr-3 h-4 w-4" />
                        Quote Calculator
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <DollarSign className="mr-3 h-4 w-4" />
                        Commission Tracker
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Inbox className="mr-3 h-4 w-4" />
                        Sales Inbox
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <UserCheck className="mr-3 h-4 w-4" />
                        Client Snapshot Generator
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="text-gray-700 hover:text-gray-900 font-medium">
                        Resources <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64">
                      <DropdownMenuItem>
                        <Video className="mr-3 h-4 w-4" />
                        Meeting Vault
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Bot className="mr-3 h-4 w-4" />
                        Knowledge Base
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <GraduationCap className="mr-3 h-4 w-4" />
                        Seed Academy
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Megaphone className="mr-3 h-4 w-4" />
                        Announcements
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </nav>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search..." 
                  className="pl-10 w-64 bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:block text-gray-700">{user?.email?.split('@')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b">
                    <p className="font-medium text-gray-900">{user?.email?.split('@')[0]}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
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

      {/* Executive Summary Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Welcome back, {user?.email?.split('@')[0]}
              </h1>
              <p className="text-sm text-gray-600">{currentDate}</p>
            </div>
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">$127.3K</p>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Pipeline</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">18</p>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Active Leads</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">$89.2K</p>
                <p className="text-xs text-gray-600 uppercase tracking-wide">MTD Revenue</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Primary Tools Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Core Business Tools */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Core Business Tools</h2>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Customize View
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Link href="/calculator">
                <Card className="hover:shadow-md transition-all cursor-pointer border border-gray-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-[#e24c00]/10 rounded-lg">
                          <Calculator className="h-5 w-5 text-[#e24c00]" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">Quote Calculator</CardTitle>
                          <p className="text-sm text-gray-500">Pricing & Proposals</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">This Month</span>
                        <span className="font-medium">127 quotes</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Conversion Rate</span>
                        <span className="font-medium text-green-600">34.2%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Card className="hover:shadow-md transition-all cursor-pointer border border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">Commission Tracker</CardTitle>
                        <p className="text-sm text-gray-500">Earnings & Pipeline</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">Real-time</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">YTD Earnings</span>
                      <span className="font-medium">$24,750</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pipeline Forecast</span>
                      <span className="font-medium text-blue-600">$127.3K</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-all cursor-pointer border border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Inbox className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">Sales Inbox</CardTitle>
                        <p className="text-sm text-gray-500">Lead Management</p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="text-xs">18 New</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hot Leads</span>
                      <span className="font-medium text-red-600">🔥 5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Follow-ups Due</span>
                      <span className="font-medium">12</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-all cursor-pointer border border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <UserCheck className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">Client Snapshot</CardTitle>
                        <p className="text-sm text-gray-500">Instant Intelligence</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Data Sources</span>
                      <span className="font-medium">HubSpot + QBO</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="font-medium text-green-600">Live</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sales Inbox Preview */}
            <Card className="mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Inbox className="h-5 w-5 text-blue-600" />
                    Recent Leads
                  </CardTitle>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 font-semibold text-sm">🔥</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">TechFlow Solutions</p>
                        <p className="text-sm text-gray-500">Software Startup • $2M ARR • Ready to buy</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">HubSpot</Button>
                      <Button size="sm" variant="outline">Call</Button>
                      <Button size="sm" className="bg-[#e24c00] hover:bg-[#d63c00]">Book Meeting</Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-semibold text-sm">⚡</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Wellness Hub Inc</p>
                        <p className="text-sm text-gray-500">Healthcare • $850K ARR • Warm prospect</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">HubSpot</Button>
                      <Button size="sm" variant="outline">Text</Button>
                      <Button size="sm" variant="outline">Follow Up</Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">🧊</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Local Bakery Co</p>
                        <p className="text-sm text-gray-500">Food Service • $125K ARR • Price shopper</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">HubSpot</Button>
                      <Button size="sm" variant="outline">Email</Button>
                      <Button size="sm" variant="outline">Quote</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Resources & Intelligence */}
          <div className="space-y-6">
            {/* Knowledge Resources */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-indigo-600" />
                  Knowledge Base
                </CardTitle>
                <CardDescription>AI-powered search & resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Ask anything..." className="pl-10" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <span className="text-sm font-medium">S-Corp Election Process</span>
                      <Badge variant="secondary" className="text-xs">Updated</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <span className="text-sm">Tax Planning Strategies 2024</span>
                      <span className="text-xs text-gray-500">Guide</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <span className="text-sm">Client Onboarding SOP</span>
                      <span className="text-xs text-gray-500">Process</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meeting Vault */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-green-600" />
                  Meeting Vault
                </CardTitle>
                <CardDescription>Auto-logged recordings & AI summaries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">TechFlow Discovery Call</span>
                    </div>
                    <span className="text-xs text-gray-500">2h ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Wellness Hub Strategy Session</span>
                    </div>
                    <span className="text-xs text-gray-500">1d ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm">Team Standup</span>
                    </div>
                    <span className="text-xs text-gray-500">2d ago</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Search All Meetings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Seed Academy */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-purple-600" />
                  Seed Academy
                </CardTitle>
                <CardDescription>Staff training & development</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Your XP: 2,450</span>
                    <Badge variant="secondary" className="text-xs">Level 7</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium">Tax Planning 201</span>
                      <span className="text-xs text-purple-600">In Progress</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <span className="text-sm">How to Quote Like a Beast</span>
                      <span className="text-xs text-gray-500">New</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <span className="text-sm">Bookkeeping Deep Dive</span>
                      <span className="text-xs text-green-600">Completed</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Announcements */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-orange-600" />
                  Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="border-l-4 border-l-green-500 pl-3">
                    <p className="text-sm font-medium">New Proposal Engine Shipped! 🚀</p>
                    <p className="text-xs text-gray-500 mt-1">Enhanced automation features now live</p>
                    <Button variant="link" className="p-0 h-auto text-xs text-blue-600">View Demo</Button>
                  </div>
                  <div className="border-l-4 border-l-blue-500 pl-3">
                    <p className="text-sm font-medium">Updated S-Corp Pay Structure SOP</p>
                    <p className="text-xs text-gray-500 mt-1">New compliance requirements effective immediately</p>
                  </div>
                  <div className="border-l-4 border-l-orange-500 pl-3">
                    <p className="text-sm font-medium">Q4 Team Challenge Starts Monday</p>
                    <p className="text-xs text-gray-500 mt-1">$500 Amazon gift card for top performer</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Slack Integration Preview */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Slack className="h-5 w-5 text-purple-600" />
                  Recent Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm">New lead assigned: TechFlow Solutions</p>
                      <p className="text-xs text-gray-500">5 min ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm">Commission updated: +$450</p>
                      <p className="text-xs text-gray-500">2h ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm">Client XYZ uploaded bank feed</p>
                      <p className="text-xs text-gray-500">4h ago</p>
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