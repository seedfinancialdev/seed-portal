import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  User, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building, 
  BarChart3,
  Settings,
  Monitor,
  Database,
  Calculator,
  Brain,
  FileText,
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  Wind,
  Zap,
  Shield,
  Award,
  ChevronRight,
  Sparkles,
  Activity,
  ArrowUpRight,
  Timer,
  Target
} from "lucide-react";

interface DashboardMetrics {
  totalQuotes: number;
  totalRevenue: number;
  activeUsers: number;
  pendingApprovals: number;
}

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    enabled: !!user,
  });

  const { data: weather } = useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    enabled: !!user,
  });

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getWeatherIcon = (condition: string) => {
    const cond = condition?.toLowerCase() || '';
    if (cond.includes('rain')) return CloudRain;
    if (cond.includes('snow')) return Snowflake;
    if (cond.includes('wind')) return Wind;
    if (cond.includes('cloud')) return Cloud;
    return Sun;
  };

  const WeatherIcon = weather ? getWeatherIcon(weather.condition) : Sun;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-12 bg-white/20 backdrop-blur-sm rounded-lg w-1/3 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                    <div className="h-4 bg-white/20 rounded w-1/2 mb-3"></div>
                    <div className="h-8 bg-white/20 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Executive Header with Weather */}
          <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">
                {getGreeting()}, {user?.firstName || user?.email?.split('@')[0] || 'Executive'}
              </h1>
              <p className="text-white/80 text-lg lg:text-xl font-medium">
                Your Seed Financial Command Center
              </p>
              <p className="text-white/60 text-sm mt-1">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            {/* Weather Widget */}
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                <div className="flex items-center space-x-4">
                  <WeatherIcon className="h-10 w-10 text-white" />
                  <div>
                    <div className="text-white font-bold text-2xl">
                      {weather?.temperature || '--'}°F
                    </div>
                    <div className="text-white/80 text-sm font-medium">
                      {weather?.condition || 'Loading...'}
                    </div>
                    <div className="text-white/60 text-xs">
                      {currentTime.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Total Quotes</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {metrics?.totalQuotes?.toLocaleString() || '0'}
                  </p>
                  <div className="flex items-center mt-2">
                    <ArrowUpRight className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm font-medium">+12% this month</span>
                  </div>
                </div>
                <div className="h-14 w-14 bg-[#F97316]/20 rounded-xl flex items-center justify-center">
                  <FileText className="h-7 w-7 text-[#F97316]" />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Total Revenue</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    ${metrics?.totalRevenue?.toLocaleString() || '0'}
                  </p>
                  <div className="flex items-center mt-2">
                    <ArrowUpRight className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm font-medium">+18% this quarter</span>
                  </div>
                </div>
                <div className="h-14 w-14 bg-green-400/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-7 w-7 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Active Users</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {metrics?.activeUsers || '0'}
                  </p>
                  <div className="flex items-center mt-2">
                    <Activity className="h-4 w-4 text-blue-400 mr-1" />
                    <span className="text-blue-400 text-sm font-medium">Online now</span>
                  </div>
                </div>
                <div className="h-14 w-14 bg-blue-400/20 rounded-xl flex items-center justify-center">
                  <Users className="h-7 w-7 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Pending</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {metrics?.pendingApprovals || '0'}
                  </p>
                  <div className="flex items-center mt-2">
                    <Timer className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-yellow-400 text-sm font-medium">Need attention</span>
                  </div>
                </div>
                <div className="h-14 w-14 bg-yellow-400/20 rounded-xl flex items-center justify-center">
                  <Zap className="h-7 w-7 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            <Link href="/calculator">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-14 w-14 bg-[#F97316]/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Calculator className="h-7 w-7 text-[#F97316]" />
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Quote Calculator</h3>
                <p className="text-white/70 text-sm leading-relaxed">Generate comprehensive quotes for all 5 services with automated Box integration and HubSpot sync</p>
                <div className="mt-4 flex items-center">
                  <Target className="h-4 w-4 text-[#F97316] mr-2" />
                  <span className="text-[#F97316] text-sm font-medium">Primary Tool</span>
                </div>
              </div>
            </Link>

            <Link href="/sales-dashboard">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-14 w-14 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-7 w-7 text-blue-400" />
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Sales Dashboard</h3>
                <p className="text-white/70 text-sm leading-relaxed">Pipeline metrics, lead management, and comprehensive performance analytics</p>
              </div>
            </Link>

            <Link href="/client-intel">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-14 w-14 bg-pink-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Brain className="h-7 w-7 text-pink-400" />
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Client Intelligence</h3>
                <p className="text-white/70 text-sm leading-relaxed">AI-powered client insights, prospect scoring, and predictive analytics</p>
                <div className="mt-4 flex items-center">
                  <Sparkles className="h-4 w-4 text-pink-400 mr-2" />
                  <span className="text-pink-400 text-sm font-medium">AI-Powered</span>
                </div>
              </div>
            </Link>

            <Link href="/commission-tracker">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-14 w-14 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Award className="h-7 w-7 text-purple-400" />
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Commission Tracker</h3>
                <p className="text-white/70 text-sm leading-relaxed">Sales performance tracking, commission calculations, and payment processing</p>
              </div>
            </Link>

            <Link href="/knowledge-base">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-14 w-14 bg-indigo-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-7 w-7 text-indigo-400" />
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Knowledge Base</h3>
                <p className="text-white/70 text-sm leading-relaxed">SeedKB - Company resources, SOPs, documentation, and team knowledge</p>
              </div>
            </Link>

            <Link href="/service-dashboard">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-14 w-14 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Shield className="h-7 w-7 text-green-400" />
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Service Dashboard</h3>
                <p className="text-white/70 text-sm leading-relaxed">Client management, support tickets, and satisfaction tracking</p>
              </div>
            </Link>
          </div>

          {/* Administrative Tools Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 shadow-lg">
            <div className="flex items-center mb-6">
              <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white font-bold text-2xl">Administrative Tools</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/user-management">
                <div className="flex items-center p-4 border border-white/20 rounded-xl hover:bg-white/10 transition-all duration-300 cursor-pointer group">
                  <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-white font-medium">User Management</span>
                </div>
              </Link>

              <Link href="/cdn-monitoring">
                <div className="flex items-center p-4 border border-white/20 rounded-xl hover:bg-white/10 transition-all duration-300 cursor-pointer group">
                  <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                    <Monitor className="h-5 w-5 text-green-400" />
                  </div>
                  <span className="text-white font-medium">System Health</span>
                </div>
              </Link>

              <Link href="/stripe-dashboard">
                <div className="flex items-center p-4 border border-white/20 rounded-xl hover:bg-white/10 transition-all duration-300 cursor-pointer group">
                  <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-white font-medium">Financial Analytics</span>
                </div>
              </Link>

              <Link href="/profile">
                <div className="flex items-center p-4 border border-white/20 rounded-xl hover:bg-white/10 transition-all duration-300 cursor-pointer group">
                  <div className="h-10 w-10 bg-gray-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                    <Settings className="h-5 w-5 text-gray-400" />
                  </div>
                  <span className="text-white font-medium">Profile Settings</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}