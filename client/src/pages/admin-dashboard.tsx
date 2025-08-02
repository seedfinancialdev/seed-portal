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
  Target,
  Award,
  ChevronRight
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
  
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    enabled: !!user,
  });

  const { data: weather } = useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    enabled: !!user,
  });

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
      <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-white/20 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                  <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-white/20 rounded w-3/4"></div>
                </div>
              ))}
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
          {/* Header with Weather Integration */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {getGreeting()}, {user?.firstName || user?.email?.split('@')[0]}
              </h1>
              <p className="text-white/80 text-lg">
                Your Seed Financial command center
              </p>
            </div>
            
            {/* Weather Widget */}
            <div className="mt-4 md:mt-0">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-3">
                  <WeatherIcon className="h-8 w-8 text-white" />
                  <div>
                    <div className="text-white font-semibold text-xl">
                      {weather?.temperature || '--'}°F
                    </div>
                    <div className="text-white/70 text-sm">
                      {weather?.condition || 'Loading weather...'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">Total Quotes</p>
                  <p className="text-3xl font-bold text-white">
                    {metrics?.totalQuotes?.toLocaleString() || '0'}
                  </p>
                  <p className="text-white/60 text-xs mt-1">+12% this month</p>
                </div>
                <div className="h-12 w-12 bg-[#F97316]/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-[#F97316]" />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-white">
                    ${metrics?.totalRevenue?.toLocaleString() || '0'}
                  </p>
                  <p className="text-white/60 text-xs mt-1">+18% this quarter</p>
                </div>
                <div className="h-12 w-12 bg-green-400/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">Active Users</p>
                  <p className="text-3xl font-bold text-white">
                    {metrics?.activeUsers || '0'}
                  </p>
                  <p className="text-white/60 text-xs mt-1">Online now</p>
                </div>
                <div className="h-12 w-12 bg-blue-400/20 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">Pending</p>
                  <p className="text-3xl font-bold text-white">
                    {metrics?.pendingApprovals || '0'}
                  </p>
                  <p className="text-white/60 text-xs mt-1">Need attention</p>
                </div>
                <div className="h-12 w-12 bg-yellow-400/20 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link href="/sales-dashboard">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-blue-400" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Sales Dashboard</h3>
                <p className="text-white/70 text-sm">Pipeline metrics, lead management, and performance analytics</p>
              </div>
            </Link>

            <Link href="/service-dashboard">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-green-400" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Service Dashboard</h3>
                <p className="text-white/70 text-sm">Client management, tickets, and satisfaction tracking</p>
              </div>
            </Link>

            <Link href="/commission-tracker">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Award className="h-6 w-6 text-purple-400" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Commission Tracker</h3>
                <p className="text-white/70 text-sm">Sales commissions, payments, and performance bonuses</p>
              </div>
            </Link>

            <Link href="/calculator">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-[#F97316]/20 rounded-lg flex items-center justify-center">
                    <Calculator className="h-6 w-6 text-[#F97316]" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Quote Calculator</h3>
                <p className="text-white/70 text-sm">Create comprehensive quotes for all services</p>
              </div>
            </Link>

            <Link href="/client-intel">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-pink-500/20 rounded-lg flex items-center justify-center">
                    <Brain className="h-6 w-6 text-pink-400" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Client Intelligence</h3>
                <p className="text-white/70 text-sm">AI-powered insights and client analytics</p>
              </div>
            </Link>

            <Link href="/knowledge-base">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-indigo-400" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Knowledge Base</h3>
                <p className="text-white/70 text-sm">Company resources, SOPs, and documentation</p>
              </div>
            </Link>
          </div>

          {/* Administrative Tools */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h3 className="text-white font-semibold text-xl mb-4">Administrative Tools</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/user-management">
                <div className="flex items-center p-3 border border-white/20 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="h-8 w-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                    <User className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-white font-medium">User Management</span>
                </div>
              </Link>

              <Link href="/cdn-monitoring">
                <div className="flex items-center p-3 border border-white/20 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="h-8 w-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                    <Monitor className="h-4 w-4 text-green-400" />
                  </div>
                  <span className="text-white font-medium">System Health</span>
                </div>
              </Link>

              <Link href="/stripe-dashboard">
                <div className="flex items-center p-3 border border-white/20 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="h-8 w-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
                    <DollarSign className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-white font-medium">Stripe Analytics</span>
                </div>
              </Link>

              <Link href="/profile">
                <div className="flex items-center p-3 border border-white/20 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="h-8 w-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
                    <Settings className="h-4 w-4 text-yellow-400" />
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