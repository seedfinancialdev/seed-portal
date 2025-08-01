import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS } from "@shared/permissions";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { 
  BarChart3,
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
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  FileText,
  Briefcase,
  Settings,
  RefreshCw,
  Search,
  Bell,
  Monitor,
  Server,
  HardDrive,
  Home,
  Building2,
  Calculator,
  Banknote,
  BookOpen,
  Phone,
  FolderOpen,
  CloudCog,
  Headphones,
  User,
  LogOut,
  ArrowLeft,
  Mail,
  MessageSquare,
  BarChart,
  Receipt,
  Coins,
  CreditCard as CreditCardIcon,
  Laptop,
  Smartphone,
  Wifi,
  Archive,
  ExternalLink,
  Layers
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import navLogoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  hubspot: 'healthy' | 'warning' | 'error';
  clickup: 'healthy' | 'warning' | 'error';
  airtable: 'healthy' | 'warning' | 'error';
  openai: 'healthy' | 'warning' | 'error';
}

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalLeads: number;
  conversionRate: number;
  averageDealSize: number;
  pendingApprovals: number;
}

interface KbAdminStats {
  totalArticles: number;
  totalCategories: number;
  monthlyViews: number;
  topSearches: string[];
}

interface CommissionApproval {
  id: string;
  userName: string;
  dealName: string;
  amount: number;
  requestDate: string;
  type: 'override' | 'adjustment' | 'bonus';
  status: 'pending' | 'approved' | 'rejected';
}

interface ClickUpTask {
  id: string;
  name: string;
  status: string;
  assignee: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueDate: string;
  project: string;
}

interface ClientHealthScore {
  clientName: string;
  email: string;
  healthScore: number;
  lastContact: string;
  riskLevel: 'low' | 'medium' | 'high';
  issues: string[];
  revenue: number;
}

// Navigation items for SEEDOS - Updated with CDN Monitoring
const navigationItems = [
  {
    category: 'Core',
    items: [
      { name: 'Dashboard', icon: Home, path: '/admin', active: true },
      { name: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
      { name: 'Revenue', icon: TrendingUp, path: '/admin/revenue' }
    ]
  },
  {
    category: 'Business Operations',
    items: [
      { name: 'Sales Pipeline', icon: Target, path: '/admin/sales' },
      { name: 'Client Management', icon: Users, path: '/admin/clients' },
      { name: 'Commission Tracking', icon: DollarSign, path: '/admin/commissions' },
      { name: 'Quote Calculator', icon: Calculator, path: '/calculator' }
    ]
  },
  {
    category: 'Financial Integration',
    items: [
      { name: 'Stripe Dashboard', icon: CreditCardIcon, path: '/admin/stripe' },
      { name: 'Mercury Banking', icon: Banknote, path: '/admin/mercury' },
      { name: 'QuickBooks Sync', icon: Receipt, path: '/admin/quickbooks' },
      { name: 'Tax Planning', icon: FileText, path: '/admin/tax' }
    ]
  },
  {
    category: 'Productivity & Content',
    items: [
      { name: 'SeedKB Management', icon: BookOpen, path: '/kb-admin' },
      { name: 'Box File Storage', icon: Archive, path: '/admin/box' },
      { name: 'Google Drive', icon: FolderOpen, path: '/admin/drive' },
      { name: 'Email Analytics', icon: Mail, path: '/admin/email' }
    ]
  },
  {
    category: 'Communication & Tools',
    items: [
      { name: 'Zoom Meetings', icon: Video, path: '/admin/zoom' },
      { name: 'Slack Integration', icon: MessageSquare, path: '/admin/slack' },
      { name: 'HubSpot CRM', icon: Building2, path: '/admin/hubspot' },
      { name: 'ClickUp Projects', icon: Briefcase, path: '/admin/clickup' }
    ]
  },
  {
    category: 'System & Security',
    items: [
      { name: 'System Health', icon: Monitor, path: '/admin/system' },
      { name: 'User Management', icon: UserCheck, path: '/user-management' },
      { name: 'CDN Monitoring', icon: Server, path: '/cdn-monitoring' },
      { name: 'API Integrations', icon: CloudCog, path: '/admin/apis' },
      { name: 'Security Center', icon: Shield, path: '/admin/security' }
    ]
  }
];

export default function AdminDashboard() {
  const { dbUser: user, signOut } = useGoogleAuth();
  const { hasPermission, getAvailableDashboards } = usePermissions();
  const [, navigate] = useLocation();
  const [selectedSection, setSelectedSection] = useState('dashboard');
  const availableDashboards = getAvailableDashboards();

  // Check if user has admin permission
  const isAdmin = hasPermission(PERMISSIONS.VIEW_ADMIN_DASHBOARD);

  // Mock data - in production these would come from real APIs
  const [systemHealth] = useState<SystemHealth>({
    database: 'healthy',
    hubspot: 'healthy', 
    clickup: 'warning',
    airtable: 'healthy',
    openai: 'healthy'
  });

  const [adminMetrics] = useState<AdminMetrics>({
    totalUsers: 12,
    activeUsers: 8,
    totalRevenue: 425000,
    monthlyRevenue: 89200,
    totalLeads: 156,
    conversionRate: 23.5,
    averageDealSize: 4200,
    pendingApprovals: 3
  });

  const [kbStats] = useState<KbAdminStats>({
    totalArticles: 89,
    totalCategories: 9,
    monthlyViews: 342,
    topSearches: ['tax planning', 's-corp election', 'quickbooks setup', 'client onboarding']
  });

  const [commissionApprovals] = useState<CommissionApproval[]>([
    {
      id: '1',
      userName: 'Amanda Rodriguez',
      dealName: 'TechFlow Solutions - Bookkeeping',
      amount: 450,
      requestDate: '2025-01-29',
      type: 'override',
      status: 'pending'
    },
    {
      id: '2', 
      userName: 'Jon Walls',
      dealName: 'Wellness Hub Inc - TaaS',
      amount: 275,
      requestDate: '2025-01-28',
      type: 'adjustment',
      status: 'pending'
    },
    {
      id: '3',
      userName: 'Amanda Rodriguez',
      dealName: 'Monthly Bonus - January',
      amount: 1200,
      requestDate: '2025-01-27',
      type: 'bonus',
      status: 'approved'
    }
  ]);

  const [clickupTasks] = useState<ClickUpTask[]>([
    {
      id: '1',
      name: 'Client Onboarding - TechFlow Solutions',
      status: 'in-progress',
      assignee: 'Amanda Rodriguez',
      priority: 'high',
      dueDate: '2025-01-31',
      project: 'Client Onboarding'
    },
    {
      id: '2',
      name: 'Tax Filing - Q4 2024 - Wellness Hub',
      status: 'review',
      assignee: 'Jon Walls',
      priority: 'urgent',
      dueDate: '2025-02-15',
      project: 'Tax Services'
    },
    {
      id: '3',
      name: 'QuickBooks Setup - Marina Cafe',
      status: 'open',
      assignee: 'Amanda Rodriguez',
      priority: 'normal',
      dueDate: '2025-02-05',
      project: 'Bookkeeping Services'
    }
  ]);

  const [clientHealth] = useState<ClientHealthScore[]>([
    {
      clientName: 'TechFlow Solutions',
      email: 'ceo@techflow.com',
      healthScore: 95,
      lastContact: '2025-01-28',
      riskLevel: 'low',
      issues: [],
      revenue: 12000
    },
    {
      clientName: 'Wellness Hub Inc',
      email: 'admin@wellnesshub.com',
      healthScore: 78,
      lastContact: '2025-01-20',
      riskLevel: 'medium',
      issues: ['Late payment', 'Missed last call'],
      revenue: 8400
    },
    {
      clientName: 'Marina Cafe',
      email: 'owner@marinacafe.com',
      healthScore: 45,
      lastContact: '2024-12-15',
      riskLevel: 'high',
      issues: ['No contact in 45 days', 'Overdue invoices', 'Unresponsive'],
      revenue: 3600
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Debug logging for admin check
  console.log('Admin Dashboard Debug:', {
    currentUser: user?.email,
    currentUserRole: user?.role,
    isAdmin
  });

  // Use PermissionGuard for proper admin access control
  return (
    <PermissionGuard 
      permissions={PERMISSIONS.VIEW_ADMIN_DASHBOARD}
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex items-center justify-center">
          <Card className="bg-white/90 backdrop-blur-md border border-white/30 shadow-xl max-w-md">
            <CardContent className="p-12 text-center">
              <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
              <p className="text-gray-600 mb-4">You need admin privileges to access SEEDOS.</p>
              <Button onClick={() => setLocation('/')} className="bg-orange-500 hover:bg-orange-600">
                Back to Portal
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex">
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
                {user?.profilePhoto ? (
                  <img 
                    src={user.profilePhoto} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setLocation('/profile')}>
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation('/sales-dashboard')}>
                <BarChart className="mr-2 h-4 w-4" />
                Sales Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/service-dashboard')}>
                <Headphones className="mr-2 h-4 w-4" />
                Service Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation Menu */}
        <div className="p-4 space-y-6">
          {navigationItems.map((category) => (
            <div key={category.category}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">
                {category.category}
              </h3>
              <div className="space-y-1">
                {category.items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => item.path.startsWith('/admin') ? setSelectedSection(item.name.toLowerCase()) : setLocation(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      (item.active || selectedSection === item.name.toLowerCase()) 
                        ? 'bg-orange-500/20 text-orange-300 border-r-2 border-orange-500' 
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                    {!item.path.startsWith('/admin') && (
                      <ExternalLink className="h-3 w-3 ml-auto text-white/50" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
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
              <p className="text-white/70 text-lg">Executive Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All
              </Button>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
              <div className="relative">
                <Bell className="h-5 w-5 text-white/70" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">

          {/* Executive Summary Cards */}
          <div className="grid grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">$425K</p>
                    <p className="text-gray-600 text-sm">+12% from last month</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Active Clients</p>
                    <p className="text-3xl font-bold text-gray-900">89</p>
                    <p className="text-gray-600 text-sm">+5 new this month</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Pipeline Value</p>
                    <p className="text-3xl font-bold text-gray-900">$127K</p>
                    <p className="text-gray-600 text-sm">18 active deals</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Target className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">System Health</p>
                    <p className="text-3xl font-bold text-gray-900">98%</p>
                    <p className="text-gray-600 text-sm">All systems operational</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Shield className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Content */}
          <div className="grid grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <Card className="col-span-2 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900">
                  <span>Revenue Analytics</span>
                  <Badge variant="secondary" className="bg-orange-500 text-white">Current Week</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4" />
                    <p className="font-medium">Revenue Chart Integration</p>
                    <p className="text-sm">Connect to Stripe/Mercury for live data</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Monitor className="h-5 w-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(systemHealth).map(([service, status]) => (
                    <div key={service} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status)}
                        <span className="font-medium capitalize text-gray-900">{service}</span>
                      </div>
                      <Badge variant={status === 'healthy' ? 'default' : 'destructive'} className={status === 'healthy' ? 'bg-green-500' : ''}>
                        {status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integration Status Grid */}
          <div className="grid grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate('/stripe-dashboard')}>
              <CardContent className="p-6 text-center">
                <CreditCardIcon className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2 text-gray-900">Stripe</h3>
                <p className="text-sm text-gray-600 mb-3">Payment processing</p>
                <Badge className="bg-green-500 text-white">Connected</Badge>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <Banknote className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2 text-gray-900">Mercury</h3>
                <p className="text-sm text-gray-600 mb-3">Business banking</p>
                <Badge variant="secondary">Setup Required</Badge>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <Receipt className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2 text-gray-900">QuickBooks</h3>
                <p className="text-sm text-gray-600 mb-3">Accounting sync</p>
                <Badge variant="secondary">Setup Required</Badge>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <Video className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2 text-gray-900">Zoom</h3>
                <p className="text-sm text-gray-600 mb-3">Meeting analytics</p>
                <Badge variant="secondary">Setup Required</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Alerts */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-gray-100 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">New client onboarded</p>
                      <p className="text-sm text-gray-600">TechFlow Solutions - $12,000 ARR</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-100 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Commission approved</p>
                      <p className="text-sm text-gray-600">Amanda Rodriguez - $450</p>
                      <p className="text-xs text-gray-500">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-100 rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">System backup completed</p>
                      <p className="text-sm text-gray-600">All data synchronized</p>
                      <p className="text-xs text-gray-500">6 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Bell className="h-5 w-5" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">ClickUp Integration Warning</p>
                      <p className="text-sm text-yellow-700">API rate limit approaching</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Scheduled Maintenance</p>
                      <p className="text-sm text-blue-700">Database backup in 2 hours</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Security Scan Complete</p>
                      <p className="text-sm text-green-700">No vulnerabilities detected</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
    </PermissionGuard>
  );
}