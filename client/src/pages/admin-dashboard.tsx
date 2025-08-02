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
  Zap,
  Shield,
  Award,
  ChevronRight
} from "lucide-react";

interface DashboardMetrics {
  totalQuotes: number;
  totalRevenue: number;
  activeUsers: number;
  pendingApprovals: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'Jon'}
            </p>
          </div>

          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Quotes</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics?.totalQuotes?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${metrics?.totalRevenue?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Active Users</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics?.activeUsers || '0'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Pending Approvals</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics?.pendingApprovals || '0'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Admin Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Admin</h3>
              
              <Link href="/user-management">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">User Management</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Manage user roles, permissions, and workspace users</p>
                </div>
              </Link>
            </div>

            {/* System Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">System</h3>
              
              <Link href="/cdn-monitoring">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <Monitor className="h-5 w-5 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">CDN Monitoring</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Real-time system health and performance monitoring</p>
                </div>
              </Link>
            </div>

            {/* Finance Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Finance</h3>
              
              <Link href="/stripe-dashboard">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Stripe Dashboard</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Revenue analytics and payment processing insights</p>
                </div>
              </Link>

              <Link href="/commission-tracker">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <Award className="h-5 w-5 text-orange-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Commission Tracker</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Track sales performance and commission calculations</p>
                </div>
              </Link>
            </div>

            {/* Sales Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Sales</h3>
              
              <Link href="/sales-dashboard">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Sales Dashboard</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Pipeline metrics, lead management, and analytics</p>
                </div>
              </Link>
            </div>

            {/* AI Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">AI</h3>
              
              <Link href="/client-intel">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                      <Brain className="h-5 w-5 text-pink-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Client Intelligence</h4>
                  </div>
                  <p className="text-gray-600 text-sm">AI-powered client insights and prospect scoring</p>
                </div>
              </Link>
            </div>

            {/* Content Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Content</h3>
              
              <Link href="/knowledge-base">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Knowledge Base</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Manage articles, documentation, and team knowledge</p>
                </div>
              </Link>
            </div>

            {/* Primary Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Primary</h3>
              
              <Link href="/calculator">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <Calculator className="h-5 w-5 text-orange-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Quote Calculator</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Generate quotes for all 5 services with Box integration and HubSpot sync</p>
                </div>
              </Link>
            </div>

            {/* Profile Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
              
              <Link href="/profile">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                      <Settings className="h-5 w-5 text-gray-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Profile Management</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Update personal information and preferences</p>
                </div>
              </Link>
            </div>

            {/* Service Dashboard */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Service</h3>
              
              <Link href="/service-dashboard">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Service Dashboard</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Client management, tickets, and satisfaction tracking</p>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}