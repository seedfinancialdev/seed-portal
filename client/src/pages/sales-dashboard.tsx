import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGoogleAuth } from "@/hooks/use-google-auth";
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
  Activity,
  Compass,
  BrainCircuit,
  Wrench,
  Shield,
  Heart,
  Folder
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import navLogoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LazySalesInbox } from "@/components/LazyDashboard";
import { useState, useEffect } from "react";
import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, Zap } from "lucide-react";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useCounterAnimation } from "@/hooks/useCounterAnimation";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from "@/lib/queryClient";

interface WeatherData {
  temperature: number | null;
  condition: string;
  location: string;
  isLoading: boolean;
}

interface KbCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Icon mapping for categories
const iconMap: Record<string, any> = {
  'compass': Compass,
  'calculator': Calculator,
  'book-open': BookOpen,
  'trending-up': TrendingUp,
  'brain-circuit': BrainCircuit,
  'target': Target,
  'shield': Shield,
  'wrench': Wrench,
  'heart': Heart,
  'folder': Folder,
  'settings': Settings
};

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
  const { dbUser: user } = useGoogleAuth();
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

  // Fetch knowledge base categories for the SEEDKB card
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<KbCategory[]>({
    queryKey: ["/api/kb/categories"],
  });

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Folder;
    return IconComponent;
  };

  const [weather, setWeather] = useState<WeatherData>({
    temperature: null,
    condition: '',
    location: '',
    isLoading: true
  });



  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Fetch live weather data based on user's location - defer until after initial load
  useEffect(() => {
    // Defer weather fetch by 500ms to prioritize core UI loading
    const timeoutId = setTimeout(() => {
      const fetchWeather = async () => {
        try {
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
        return () => {
          clearTimeout(timeoutId);
          clearInterval(interval);
        };
      }
    }, 500); // 500ms delay for initial load performance

    return () => clearTimeout(timeoutId);
  }, [user?.latitude, user?.longitude, user?.city, user?.state, user?.id]); // Add user.id to prevent duplicate calls

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <UniversalNavbar />

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
          <div className={`grid gap-8 justify-items-center ${(user?.email === 'jon@seedfinancial.io' || user?.email === 'anthony@seedfinancial.io' || user?.role === 'admin') ? 'grid-cols-5' : 'grid-cols-4'}`}>
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

            {/* Sales Trainer - Only visible to admins */}
            {(user?.email === 'jon@seedfinancial.io' || user?.email === 'anthony@seedfinancial.io' || user?.role === 'admin') && (
              <div className="group w-40 h-40 rounded-full hover:scale-110 transition-all duration-300 cursor-pointer action-card-bounce action-card" style={{"--delay": 8} as React.CSSProperties}>
                <div className="action-card-content">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-4 group-hover:from-red-400 group-hover:to-red-500 transition-all duration-300">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-center text-white leading-tight px-1">Sales<br/>Trainer</h3>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sales Dashboard */}
        <div className="grid grid-cols-3 gap-8 mb-16">
          {/* Dynamic Sales Inbox */}
          <div className="col-span-2">
            <LazySalesInbox limit={8} />
          </div>

          {/* SEEDKB - Full Column with Category Grid */}
          <div className="h-full relative z-10">
            <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-xl border-2 rounded-2xl shadow-2xl h-full overflow-visible">
              <CardHeader className="pb-4 bg-gradient-to-r from-slate-700/50 to-slate-800/50 border-b border-slate-600/30">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-white">SEED<span style={{ color: '#e24c00' }}>KB</span></span>
                </CardTitle>
                <CardDescription className="text-slate-300 text-base">
                  Your comprehensive knowledge hub
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 overflow-visible">
                <div className="space-y-6">
                  <Button 
                    onClick={() => setLocation('/knowledge-base')}
                    className="w-full text-lg h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <BookOpen className="h-5 w-5 mr-3" />
                    Open Knowledge Base
                  </Button>
                  
                  {/* Mini Category Grid - 3x3 layout */}
                  <div className="relative z-20">
                    <h4 className="font-bold text-white mb-4 text-base">Knowledge Categories</h4>
                    {categoriesLoading ? (
                      <div className="text-slate-400 text-center py-8">Loading categories...</div>
                    ) : (
                      <TooltipProvider>
                        <div className="grid grid-cols-3 gap-4 relative z-30">
                          {categories.map((category: KbCategory) => {
                            const IconComponent = getIconComponent(category.icon);
                            
                            return (
                              <Tooltip key={category.id}>
                                <TooltipTrigger asChild>
                                  <Card
                                    className="group h-20 w-20 cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-xl bg-gradient-to-br from-slate-700/80 to-slate-800/80 border-slate-600/40 hover:from-slate-600/80 hover:to-slate-700/80 hover:border-orange-400/70 backdrop-blur-md border rounded-2xl overflow-hidden relative mx-auto"
                                    onClick={() => setLocation('/knowledge-base')}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    <div className="relative h-full flex items-center justify-center">
                                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-125 transition-all duration-300 border border-white/30 group-hover:border-white/50`}>
                                        <IconComponent className="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-300" />
                                      </div>
                                    </div>
                                  </Card>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="bottom" 
                                  className="bg-slate-800 border-slate-600 text-white font-medium z-50 max-w-none whitespace-nowrap"
                                  sideOffset={8}
                                  avoidCollisions={true}
                                >
                                  {category.name}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </TooltipProvider>
                    )}
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