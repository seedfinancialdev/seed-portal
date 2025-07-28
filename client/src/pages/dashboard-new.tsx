import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
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
  BookOpen,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Target,
  Activity
} from "lucide-react";
import navLogoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SalesInbox } from "@/components/SalesInbox";
import { useState, useEffect } from "react";
import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, Zap } from "lucide-react";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useCounterAnimation } from "@/hooks/useCounterAnimation";

interface WeatherData {
  temperature: number | null;
  condition: string;
  location: string;
  isLoading: boolean;
}

// Weather icon component
const getWeatherIcon = (condition: string) => {
  const iconProps = { className: "h-4 w-4 text-white/70" };
  
  switch (condition.toLowerCase()) {
    case 'clear':
    case 'sunny':
      return <Sun {...iconProps} />;
    case 'partly cloudy':
      return <Cloud {...iconProps} />;
    case 'cloudy':
      return <Cloud {...iconProps} />;
    case 'rainy':
      return <CloudRain {...iconProps} />;
    case 'showers':
      return <CloudDrizzle {...iconProps} />;
    case 'snowy':
      return <CloudSnow {...iconProps} />;
    case 'stormy':
      return <Zap {...iconProps} />;
    default:
      return <Cloud {...iconProps} />;
  }
};

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useDashboardMetrics();
  
  // Counter animations for metrics cards - fast timing for responsive feel
  const pipelineCounter = useCounterAnimation({ 
    target: metrics?.pipelineValue || 0, 
    duration: 800, 
    delay: 100,
    enabled: !metricsLoading && !metricsError 
  });
  
  const mtdRevenueCounter = useCounterAnimation({ 
    target: metrics?.mtdRevenue || 0, 
    duration: 800, 
    delay: 200,
    enabled: !metricsLoading && !metricsError 
  });
  
  const activeDealsCounter = useCounterAnimation({ 
    target: metrics?.activeDeals || 0, 
    duration: 600, 
    delay: 300,
    enabled: !metricsLoading && !metricsError 
  });
  const [weather, setWeather] = useState<WeatherData>({
    temperature: null,
    condition: '',
    location: '',
    isLoading: true
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Fetch live weather data based on user's location
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Reduce console spam - only log once per session
        if (weather.isLoading) {
          console.log('Fetching weather data for user coordinates:', user?.latitude, user?.longitude);
        }
        
        // Only fetch weather if user has coordinates set
        if (!user?.latitude || !user?.longitude) {
          setWeather({
            temperature: null,
            condition: '',
            location: 'Set address in profile for weather',
            isLoading: false
          });
          return;
        }
        
        const lat = parseFloat(user.latitude.toString());
        const lon = parseFloat(user.longitude.toString());
        const locationName = user.city && user.state ? `${user.city}, ${user.state}` : 'Your Location';
        
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`
        );
        
        if (!response.ok) {
          throw new Error('Weather fetch failed');
        }
        
        const data = await response.json();
        const currentWeather = data.current_weather;
        
        // Map weather codes to readable conditions
        const getCondition = (code: number) => {
          if (code === 0) return 'clear';
          if (code <= 3) return 'partly cloudy';
          if (code <= 48) return 'cloudy';
          if (code <= 67) return 'rainy';
          if (code <= 77) return 'snowy';
          if (code <= 82) return 'showers';
          return 'stormy';
        };
        
        setWeather({
          temperature: Math.round(currentWeather.temperature),
          condition: getCondition(currentWeather.weathercode),
          location: locationName,
          isLoading: false
        });
      } catch (error) {
        // Only log actual network errors, not expected timeouts
        if (error instanceof Error && !error.message.includes('abort')) {
          console.error('Weather API error:', error.message);
        }
        setWeather({
          temperature: null,
          condition: 'clear',
          location: user?.city && user?.state ? `${user.city}, ${user.state}` : 'Weather unavailable',
          isLoading: false
        });
      }
    };

    // Only fetch weather if user data exists
    if (user) {
      fetchWeather();
      // Refresh weather every 30 minutes
      const interval = setInterval(fetchWeather, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.latitude, user?.longitude, user?.city, user?.state, user?.id]); // Add user.id to prevent duplicate calls

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      {/* Transparent Header */}
      <header className="bg-transparent z-50 py-4 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-center h-20">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <img src={navLogoPath} alt="Seed Financial" className="h-16" />
              </div>
            </Link>
          </div>
          
          {/* User Menu - Positioned Absolutely */}
          <div className="absolute top-4 right-6 flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="relative p-2 hover:bg-white/10 text-white">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-orange-500 rounded-full"></span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 p-2 hover:bg-white/10 text-white">
                  {user?.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt="Profile" 
                      className="w-7 h-7 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <div className="px-3 py-2 border-b">
                  <p className="font-medium text-gray-900 text-sm">{user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center text-sm w-full">
                    <User className="mr-2 h-3 w-3" />
                    My Profile
                  </Link>
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
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-light text-white mb-2">
            {getGreeting()}, {user?.email?.split('@')[0] ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'User'}!
          </h1>
          <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
            {weather.isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-pulse">Loading weather...</div>
              </div>
            ) : (
              <>
                {getWeatherIcon(weather.condition)}
                <span>{weather.temperature}°F and {weather.condition} in {weather.location}</span>
              </>
            )}
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl card-bounce-in-1">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-light text-white mb-1">
                {metricsLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : metricsError ? (
                  'Error'
                ) : (
                  `$${pipelineCounter.count.toLocaleString()}`
                )}
              </p>
              <p className="text-xs text-white/80 uppercase tracking-wide">Pipeline Value</p>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl card-bounce-in-2">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-2xl font-light text-white mb-1">
                {metricsLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : metricsError ? (
                  'Error'
                ) : (
                  `$${mtdRevenueCounter.count.toLocaleString()}`
                )}
              </p>
              <p className="text-xs text-white/80 uppercase tracking-wide">MTD Revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl card-bounce-in-3">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-light text-white mb-1">
                {metricsLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : metricsError ? (
                  'Error'
                ) : (
                  activeDealsCounter.count.toString()
                )}
              </p>
              <p className="text-xs text-white/80 uppercase tracking-wide">Active Deals</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-xl font-light text-white mb-6 text-center">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-8 justify-items-center">
            <Link href="/calculator">
              <div className="group w-40 h-40 rounded-full hover:scale-110 transition-all duration-300 cursor-pointer action-card-bounce action-card" style={{"--delay": 4} as React.CSSProperties}>
                <div className="action-card-content">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full mb-4 group-hover:from-orange-400 group-hover:to-orange-500 transition-all duration-300">
                    <Calculator className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-center text-white leading-tight px-1">Quote Calculator</h3>
                </div>
              </div>
            </Link>

            <Link href="/commission-tracker">
              <div className="group w-40 h-40 rounded-full hover:scale-110 transition-all duration-300 cursor-pointer action-card-bounce action-card" style={{"--delay": 5} as React.CSSProperties}>
                <div className="action-card-content">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 group-hover:from-green-400 group-hover:to-green-500 transition-all duration-300">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-center text-white leading-tight px-1">Commission Tracker</h3>
                </div>
              </div>
            </Link>

            <Link href="/client-intel">
              <div className="group w-40 h-40 rounded-full hover:scale-110 transition-all duration-300 cursor-pointer action-card-bounce action-card" style={{"--delay": 6} as React.CSSProperties}>
                <div className="action-card-content">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4 group-hover:from-blue-400 group-hover:to-blue-500 transition-all duration-300">
                    <UserCheck className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-center text-white leading-tight px-1">Client<br/>Intel</h3>
                </div>
              </div>
            </Link>

            <div className="group w-40 h-40 rounded-full hover:scale-110 transition-all duration-300 cursor-pointer action-card-bounce action-card" style={{"--delay": 7} as React.CSSProperties}>
              <div className="action-card-content">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mb-4 group-hover:from-purple-400 group-hover:to-purple-500 transition-all duration-300">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-center text-white leading-tight px-1">Meeting<br/>Vault</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Dashboard */}
        <div className="grid grid-cols-3 gap-8 mb-16">
          {/* Dynamic Sales Inbox */}
          <div className="col-span-2">
            <SalesInbox limit={8} />
          </div>

          {/* Sidebar Tools */}
          <div className="space-y-6">
            {/* Knowledge Base */}
            <Card className="bg-white border border-gray-200 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Bot className="h-4 w-4 text-orange-500" />
                  Knowledge Base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => setLocation('/knowledge-base')}
                  className="w-full text-sm h-9 bg-orange-500 hover:bg-orange-600 text-white border-0 font-semibold"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Open Wiki.js
                </Button>
                <div className="space-y-2">
                  <div className="text-sm text-gray-700 font-medium hover:text-gray-900 cursor-pointer py-2 px-3 hover:bg-gray-50 rounded">Employee Handbook</div>
                  <div className="text-sm text-gray-700 font-medium hover:text-gray-900 cursor-pointer py-2 px-3 hover:bg-gray-50 rounded">API Documentation</div>
                  <div className="text-sm text-gray-700 font-medium hover:text-gray-900 cursor-pointer py-2 px-3 hover:bg-gray-50 rounded">Sales Playbook</div>
                </div>
              </CardContent>
            </Card>

            {/* Seed Academy */}
            <Card className="bg-white border border-gray-200 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <GraduationCap className="h-4 w-4 text-orange-500" />
                  Seed Academy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-900">XP: 2,450</span>
                  <Badge className="bg-orange-500 text-white text-sm font-bold">Level 7</Badge>
                </div>
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded font-medium">Tax Planning 201 - In Progress (75%)</div>
                <Button className="w-full text-sm h-9 bg-orange-500 hover:bg-orange-600 text-white border-0 font-semibold">View Courses</Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white border border-gray-200 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Bell className="h-4 w-4 text-orange-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">New lead added</p>
                    <p className="text-sm text-gray-600">TechFlow Solutions • 5 min ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Commission earned</p>
                    <p className="text-sm text-gray-600">+$450 • 2h ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Document uploaded</p>
                    <p className="text-sm text-gray-600">Tax Guide 2024 • 4h ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Full-Width Footer Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 mt-8 shadow-xl">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                Today's Performance
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-medium">Quotes Generated</span>
                  <span className="text-gray-900 font-bold">7</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-medium">Calls Made</span>
                  <span className="text-gray-900 font-bold">12</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-medium">Meetings Booked</span>
                  <span className="text-gray-900 font-bold">3</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" />
                Goals Progress
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700 font-medium">Monthly Target</span>
                    <span className="text-gray-900 font-bold">68%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-orange-500 h-2.5 rounded-full" style={{width: '68%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700 font-medium">Quarterly Goal</span>
                    <span className="text-gray-900 font-bold">45%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-orange-400 h-2.5 rounded-full" style={{width: '45%'}}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                Recent Wins
              </h3>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="text-gray-900 font-bold">$15K Deal Closed</p>
                  <p className="text-gray-600 font-medium">MarketPro Inc • Yesterday</p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-900 font-bold">Referral Received</p>
                  <p className="text-gray-600 font-medium">From TechFlow • 2 days ago</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-orange-500" />
                Quick Links
              </h3>
              <div className="space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start text-sm text-gray-700 font-medium hover:text-gray-900 hover:bg-gray-100 p-3">
                  Weekly Reports
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-sm text-gray-700 font-medium hover:text-gray-900 hover:bg-gray-100 p-3">
                  Team Calendar
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-sm text-gray-700 font-medium hover:text-gray-900 hover:bg-gray-100 p-3">
                  Training Materials
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}