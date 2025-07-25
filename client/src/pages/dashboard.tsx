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
  Filter,
  Cloud,
  Sun,
  CloudRain,
  ChevronDown
} from "lucide-react";
import navLogoPath from "@assets/Nav Logo_1753431362883.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [weather, setWeather] = useState({ temp: 72, condition: 'sunny', location: 'Marina Del Rey, CA' });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Mock weather data - in production this would come from weather API based on user profile location
  useEffect(() => {
    // Simulate weather fetch based on user location from profile
    const fetchWeather = () => {
      const conditions = ['sunny', 'cloudy', 'rainy'];
      const temps = [68, 72, 75, 78];
      const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
      const randomTemp = temps[Math.floor(Math.random() * temps.length)];
      
      setWeather({
        temp: randomTemp,
        condition: randomCondition,
        location: 'Marina Del Rey, CA' // From user profile
      });
    };
    
    fetchWeather();
  }, []);

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return <Sun className="h-4 w-4 text-yellow-500" />;
      case 'cloudy': return <Cloud className="h-4 w-4 text-gray-500" />;
      case 'rainy': return <CloudRain className="h-4 w-4 text-blue-500" />;
      default: return <Sun className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-100">
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
      <div className="bg-gradient-to-r from-[#253e31] via-[#2d4937] to-[#3a5d47] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Welcome back, {user?.email?.split('@')[0]}
                </h1>
                <p className="text-sm text-green-100">{currentDate}</p>
              </div>
              <div className="flex items-center space-x-3 bg-white/10 rounded-lg px-3 py-2">
                {getWeatherIcon(weather.condition)}
                <div>
                  <span className="text-sm font-medium">{weather.temp}°F</span>
                  <p className="text-xs text-green-100 capitalize">{weather.condition} in {weather.location}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">$127.3K</p>
                <p className="text-xs text-green-200 uppercase tracking-wide">Pipeline</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">18</p>
                <p className="text-xs text-green-200 uppercase tracking-wide">Active Leads</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">$89.2K</p>
                <p className="text-xs text-green-200 uppercase tracking-wide">MTD Revenue</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Primary Content - Sales Inbox */}
          <div className="flex-1">
            {/* Quick Tools - Round Cards */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Quick Tools</h2>
              </div>
              <div className="grid grid-cols-4 gap-8">
                <Link href="/calculator">
                  <div className="flex flex-col items-center justify-center w-40 h-40 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full hover:shadow-lg transition-all cursor-pointer">
                    <div className="p-4 bg-[#e24c00]/10 rounded-full mb-3">
                      <Calculator className="h-8 w-8 text-[#e24c00]" />
                    </div>
                    <h3 className="text-sm font-semibold text-center">Quote Calculator</h3>
                  </div>
                </Link>

                <div className="flex flex-col items-center justify-center w-40 h-40 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full hover:shadow-lg transition-all cursor-pointer">
                  <div className="p-4 bg-green-500/10 rounded-full mb-3">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-center">Commission Tracker</h3>
                </div>

                <div className="flex flex-col items-center justify-center w-40 h-40 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full hover:shadow-lg transition-all cursor-pointer">
                  <div className="p-4 bg-purple-500/10 rounded-full mb-3">
                    <UserCheck className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-center">Client Intel</h3>
                </div>

                <div className="flex flex-col items-center justify-center w-40 h-40 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full hover:shadow-lg transition-all cursor-pointer">
                  <div className="p-4 bg-indigo-500/10 rounded-full mb-3">
                    <Video className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-center">Meeting Vault</h3>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sales Inbox</h2>
              <p className="text-gray-600">Your central command center for lead management and sales operations</p>
            </div>

            {/* Enhanced Sales Inbox */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200 mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Inbox className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Active Leads</CardTitle>
                      <CardDescription>18 leads requiring attention</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button size="sm" className="bg-[#e24c00] hover:bg-[#d63c00]">
                      Add Lead
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Lead 1 - Hot */}
                  <div className="flex items-center justify-between p-4 bg-red-50 border-l-4 border-l-red-500 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 font-bold text-lg">🔥</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">TechFlow Solutions</h3>
                        <p className="text-sm text-gray-600">Software Startup • $2M ARR • Ready to buy</p>
                        <p className="text-xs text-red-600 font-medium">Hot Lead - Requires immediate attention</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">$45K</p>
                        <p className="text-xs text-gray-500">Est. Value</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">HubSpot</Button>
                        <Button size="sm" variant="outline">Call</Button>
                        <Button size="sm" className="bg-[#e24c00] hover:bg-[#d63c00]">Book Meeting</Button>
                      </div>
                    </div>
                  </div>

                  {/* Lead 2 - Warm */}
                  <div className="flex items-center justify-between p-4 bg-orange-50 border-l-4 border-l-orange-400 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-lg">⚡</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Wellness Hub Inc</h3>
                        <p className="text-sm text-gray-600">Healthcare • $850K ARR • Warm prospect</p>
                        <p className="text-xs text-orange-600 font-medium">Follow-up due in 2 days</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">$28K</p>
                        <p className="text-xs text-gray-500">Est. Value</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">HubSpot</Button>
                        <Button size="sm" variant="outline">Text</Button>
                        <Button size="sm" variant="outline">Follow Up</Button>
                      </div>
                    </div>
                  </div>

                  {/* Lead 3 - Cold */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 border-l-4 border-l-blue-400 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-lg">🧊</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Local Bakery Co</h3>
                        <p className="text-sm text-gray-600">Food Service • $125K ARR • Price shopper</p>
                        <p className="text-xs text-blue-600 font-medium">Quote requested - Price sensitive</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">$8K</p>
                        <p className="text-xs text-gray-500">Est. Value</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">HubSpot</Button>
                        <Button size="sm" variant="outline">Email</Button>
                        <Button size="sm" variant="outline">Quote</Button>
                      </div>
                    </div>
                  </div>

                  {/* More leads indicator */}
                  <div className="text-center py-4 border-t border-gray-200">
                    <Button variant="outline" className="w-full">
                      View All 18 Leads
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compact Sidebar - Secondary Tools */}
          <div className="w-80 space-y-4">
            {/* Knowledge Base */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="h-4 w-4 text-indigo-600" />
                  Knowledge Base
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Ask anything..." className="pl-10 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-indigo-50 rounded-lg cursor-pointer hover:bg-indigo-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">S-Corp Election Process</p>
                        <p className="text-xs text-gray-500">Updated 2 days ago</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">New</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Tax Planning 2024</p>
                        <p className="text-xs text-gray-500">Complete guide</p>
                      </div>
                      <span className="text-xs text-gray-400">Guide</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Client Onboarding SOP</p>
                        <p className="text-xs text-gray-500">Step-by-step process</p>
                      </div>
                      <span className="text-xs text-gray-400">SOP</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seed Academy */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                  Seed Academy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-purple-900">XP: 2,450</p>
                      <p className="text-xs text-purple-600">Level 7 • Advanced</p>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">Level 7</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="p-2 bg-green-50 border-l-4 border-green-500 rounded">
                      <p className="text-sm font-medium text-green-900">Tax Planning 201</p>
                      <p className="text-xs text-green-600">In Progress • 75% Complete</p>
                    </div>
                    
                    <div className="p-2 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <p className="text-sm font-medium text-blue-900">Advanced QuickBooks</p>
                      <p className="text-xs text-blue-600">Next: Due Jan 30</p>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm" className="w-full">View All Courses</Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4 text-orange-600" />
                  Recent Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">New lead: TechFlow Solutions</p>
                      <p className="text-xs text-green-600">Software Startup • $45K potential</p>
                      <p className="text-xs text-gray-500">5 min ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">Commission: +$450</p>
                      <p className="text-xs text-blue-600">Wellness Hub Inc closed</p>
                      <p className="text-xs text-gray-500">2h ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-900">Document uploaded</p>
                      <p className="text-xs text-orange-600">Tax Planning Guide 2024</p>
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
