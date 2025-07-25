import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Calculator, 
  LogOut, 
  User, 
  Settings, 
  Bell, 
  Search,
  DollarSign,
  Video,
  Bot,
  GraduationCap,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Target,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Clean Minimal Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer">
                <img src={navLogoPath} alt="Seed Financial" className="h-7" />
                <div className="text-lg font-medium text-gray-900 tracking-tight">Employee Portal</div>
              </div>
            </Link>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="relative p-2 hover:bg-gray-100">
                <Bell className="h-4 w-4 text-gray-600" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-red-500 rounded-full"></span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 p-2 hover:bg-gray-100">
                    <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <div className="px-3 py-2 border-b">
                    <p className="font-medium text-gray-900 text-sm">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <DropdownMenuItem className="text-sm">
                    <User className="mr-2 h-3 w-3" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-sm">
                    <Settings className="mr-2 h-3 w-3" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 text-sm">
                    <LogOut className="mr-2 h-3 w-3" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-light text-gray-900 mb-2">
            Welcome back, {user?.email?.split('@')[0]}
          </h1>
          <p className="text-gray-600 text-sm">Your financial operations command center</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-light text-gray-900 mb-1">$127.3K</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pipeline Value</p>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-light text-gray-900 mb-1">18</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active Leads</p>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-2xl font-light text-gray-900 mb-1">$89.2K</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">MTD Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-xl font-light text-gray-900 mb-6 text-center">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-8 justify-items-center">
            <Link href="/calculator">
              <div className="flex flex-col items-center justify-center w-32 h-32 bg-white/60 backdrop-blur-sm border-0 rounded-full hover:shadow-lg hover:scale-105 transition-all cursor-pointer">
                <div className="p-3 bg-gray-100 rounded-full mb-2">
                  <Calculator className="h-5 w-5 text-gray-700" />
                </div>
                <h3 className="text-xs font-medium text-center text-gray-900">Quote Calculator</h3>
                <p className="text-xs text-gray-500 text-center mt-1">Generate pricing</p>
              </div>
            </Link>

            <div className="flex flex-col items-center justify-center w-32 h-32 bg-white/60 backdrop-blur-sm border-0 rounded-full hover:shadow-lg hover:scale-105 transition-all cursor-pointer">
              <div className="p-3 bg-gray-100 rounded-full mb-2">
                <DollarSign className="h-5 w-5 text-gray-700" />
              </div>
              <h3 className="text-xs font-medium text-center text-gray-900">Commission Tracker</h3>
              <p className="text-xs text-gray-500 text-center mt-1">Track earnings</p>
            </div>

            <div className="flex flex-col items-center justify-center w-32 h-32 bg-white/60 backdrop-blur-sm border-0 rounded-full hover:shadow-lg hover:scale-105 transition-all cursor-pointer">
              <div className="p-3 bg-gray-100 rounded-full mb-2">
                <UserCheck className="h-5 w-5 text-gray-700" />
              </div>
              <h3 className="text-xs font-medium text-center text-gray-900">Client Intel</h3>
              <p className="text-xs text-gray-500 text-center mt-1">AI snapshots</p>
            </div>

            <div className="flex flex-col items-center justify-center w-32 h-32 bg-white/60 backdrop-blur-sm border-0 rounded-full hover:shadow-lg hover:scale-105 transition-all cursor-pointer">
              <div className="p-3 bg-gray-100 rounded-full mb-2">
                <Video className="h-5 w-5 text-gray-700" />
              </div>
              <h3 className="text-xs font-medium text-center text-gray-900">Meeting Vault</h3>
              <p className="text-xs text-gray-500 text-center mt-1">View recordings</p>
            </div>
          </div>
        </div>

        {/* Sales Dashboard */}
        <div className="grid grid-cols-3 gap-8">
          {/* Main Sales Inbox */}
          <div className="col-span-2">
            <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-medium text-gray-900">Sales Inbox</CardTitle>
                    <CardDescription className="text-sm text-gray-600">Active leads requiring attention</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">View All</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lead 1 */}
                <div className="flex items-center justify-between p-4 bg-red-50/50 border-l-4 border-l-red-400 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-bold text-sm">🔥</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">TechFlow Solutions</h3>
                      <p className="text-xs text-gray-600">Software Startup • $2M ARR • Ready to buy</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="text-xs">Call</Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs">Book Meeting</Button>
                  </div>
                </div>

                {/* Lead 2 */}
                <div className="flex items-center justify-between p-4 bg-orange-50/50 border-l-4 border-l-orange-400 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-sm">⚡</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">Wellness Hub Inc</h3>
                      <p className="text-xs text-gray-600">Healthcare • $850K ARR • Warm prospect</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="text-xs">Email</Button>
                    <Button size="sm" variant="outline" className="text-xs">Follow Up</Button>
                  </div>
                </div>

                {/* Lead 3 */}
                <div className="flex items-center justify-between p-4 bg-blue-50/50 border-l-4 border-l-blue-400 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">🧊</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">Local Bakery Co</h3>
                      <p className="text-xs text-gray-600">Food Service • $125K ARR • Price shopper</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="text-xs">Quote</Button>
                    <Button size="sm" variant="outline" className="text-xs">Email</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Tools */}
          <div className="space-y-6">
            {/* Knowledge Base */}
            <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Bot className="h-4 w-4 text-gray-600" />
                  Knowledge Base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input placeholder="Ask anything..." className="pl-9 text-xs h-8 bg-white/50" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer py-1 px-2 hover:bg-gray-50 rounded">S-Corp Election Process</div>
                  <div className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer py-1 px-2 hover:bg-gray-50 rounded">Tax Planning 2024</div>
                  <div className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer py-1 px-2 hover:bg-gray-50 rounded">Client Onboarding SOP</div>
                </div>
              </CardContent>
            </Card>

            {/* Seed Academy */}
            <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <GraduationCap className="h-4 w-4 text-gray-600" />
                  Seed Academy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-900">XP: 2,450</span>
                  <Badge variant="secondary" className="text-xs">Level 7</Badge>
                </div>
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">Tax Planning 201 - In Progress (75%)</div>
                <Button variant="outline" size="sm" className="w-full text-xs h-7">View Courses</Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Bell className="h-4 w-4 text-gray-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">New lead added</p>
                    <p className="text-xs text-gray-500">TechFlow Solutions • 5 min ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">Commission earned</p>
                    <p className="text-xs text-gray-500">+$450 • 2h ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">Document uploaded</p>
                    <p className="text-xs text-gray-500">Tax Guide 2024 • 4h ago</p>
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