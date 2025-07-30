import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
  HardDrive
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function AdminDashboard() {
  const { dbUser: user } = useGoogleAuth();
  const [selectedTab, setSelectedTab] = useState('overview');

  // Check if user is admin
  const isAdmin = user?.email === 'jon@seedfinancial.io' || user?.email === 'anthony@seedfinancial.io' || user?.role === 'admin';

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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
        <UniversalNavbar showBackButton={true} backButtonText="Back to Portal" backButtonPath="/" />
        <main className="max-w-4xl mx-auto px-6 py-12">
          <Card className="bg-white/90 backdrop-blur-md border border-white/30 shadow-xl">
            <CardContent className="p-12 text-center">
              <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
              <p className="text-gray-600">You need admin privileges to access this dashboard.</p>
              <p className="text-sm text-gray-500 mt-2">Contact an administrator if you believe this is an error.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <UniversalNavbar showBackButton={true} backButtonText="Back to Portal" backButtonPath="/" />
      
      {/* Admin Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
              <p className="text-white/70">System management and analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-orange-500 text-white">
                Admin Access
              </Badge>
              <Button variant="outline" className="text-white border-white/30 hover:bg-white/10">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white/10 backdrop-blur-md">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="approvals" className="text-white data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Approvals
            </TabsTrigger>
            <TabsTrigger value="system" className="text-white data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              System Health
            </TabsTrigger>
            <TabsTrigger value="clickup" className="text-white data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              ClickUp Tasks
            </TabsTrigger>
            <TabsTrigger value="clients" className="text-white data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Client Health
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-6">
              <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-light text-white mb-1">{adminMetrics.activeUsers}</p>
                  <p className="text-xs text-white/80 uppercase tracking-wide">Active Users</p>
                  <p className="text-xs text-white/60 mt-1">of {adminMetrics.totalUsers} total</p>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-light text-white mb-1">${adminMetrics.monthlyRevenue.toLocaleString()}</p>
                  <p className="text-xs text-white/80 uppercase tracking-wide">Monthly Revenue</p>
                  <p className="text-xs text-white/60 mt-1">${adminMetrics.totalRevenue.toLocaleString()} total</p>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-light text-white mb-1">{adminMetrics.conversionRate}%</p>
                  <p className="text-xs text-white/80 uppercase tracking-wide">Conversion Rate</p>
                  <p className="text-xs text-white/60 mt-1">{adminMetrics.totalLeads} total leads</p>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-3">
                    <Bell className="h-6 w-6 text-orange-600" />
                  </div>
                  <p className="text-2xl font-light text-white mb-1">{adminMetrics.pendingApprovals}</p>
                  <p className="text-xs text-white/80 uppercase tracking-wide">Pending Approvals</p>
                  <p className="text-xs text-white/60 mt-1">Require attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-6">
              <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Database className="h-5 w-5" />
                    Knowledge Base
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-white">
                      <span className="text-sm">Articles</span>
                      <span className="font-medium">{kbStats.totalArticles}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span className="text-sm">Categories</span>
                      <span className="font-medium">{kbStats.totalCategories}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span className="text-sm">Monthly Views</span>
                      <span className="font-medium">{kbStats.monthlyViews}</span>
                    </div>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      Manage KB
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Shield className="h-5 w-5" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">Database</span>
                      {getStatusIcon(systemHealth.database)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">HubSpot</span>
                      {getStatusIcon(systemHealth.hubspot)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">ClickUp</span>
                      {getStatusIcon(systemHealth.clickup)}
                    </div>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Activity className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-white">
                      <span className="text-sm">Avg Deal Size</span>
                      <span className="font-medium">${adminMetrics.averageDealSize}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span className="text-sm">Active Clients</span>
                      <span className="font-medium">{clientHealth.length}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span className="text-sm">High Risk</span>
                      <span className="font-medium text-red-400">
                        {clientHealth.filter(c => c.riskLevel === 'high').length}
                      </span>
                    </div>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      View Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">Revenue Analytics</CardTitle>
                <CardDescription className="text-white/70">
                  Monthly revenue trends and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center text-white/70">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4" />
                    <p>Revenue charts would be integrated here with chart library</p>
                    <p className="text-sm">Showing monthly trends, deal pipeline, and forecasting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="space-y-6">
            <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">Commission Approvals</CardTitle>
                <CardDescription className="text-white/70">
                  Manage commission overrides, adjustments, and bonus approvals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-white">User</TableHead>
                      <TableHead className="text-white">Deal/Type</TableHead>
                      <TableHead className="text-white">Amount</TableHead>
                      <TableHead className="text-white">Date</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissionApprovals.map((approval) => (
                      <TableRow key={approval.id} className="border-white/20">
                        <TableCell className="text-white">{approval.userName}</TableCell>
                        <TableCell className="text-white">
                          <div>
                            <p className="font-medium">{approval.dealName}</p>
                            <Badge variant="secondary" className="text-xs">
                              {approval.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">${approval.amount}</TableCell>
                        <TableCell className="text-white">{approval.requestDate}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={approval.status === 'pending' ? 'destructive' : 'default'}
                            className={approval.status === 'approved' ? 'bg-green-500' : ''}
                          >
                            {approval.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {approval.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-green-500 hover:bg-green-600">
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive">
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Server className="h-5 w-5" />
                    System Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(systemHealth).map(([service, status]) => (
                      <div key={service} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(status)}
                          <span className="text-white capitalize">{service}</span>
                        </div>
                        <Badge variant={status === 'healthy' ? 'default' : 'destructive'} className={status === 'healthy' ? 'bg-green-500' : ''}>
                          {status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Monitor className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-white mb-2">
                        <span>API Response Time</span>
                        <span>120ms</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-white mb-2">
                        <span>Database Performance</span>
                        <span>95%</span>
                      </div>
                      <Progress value={95} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-white mb-2">
                        <span>System Uptime</span>
                        <span>99.9%</span>
                      </div>
                      <Progress value={99} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ClickUp Tasks Tab */}
          <TabsContent value="clickup" className="space-y-6">
            <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">Active Service Tasks</CardTitle>
                <CardDescription className="text-white/70">
                  Monitor client work progress and task assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-white">Task</TableHead>
                      <TableHead className="text-white">Assignee</TableHead>
                      <TableHead className="text-white">Priority</TableHead>
                      <TableHead className="text-white">Due Date</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white">Project</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clickupTasks.map((task) => (
                      <TableRow key={task.id} className="border-white/20">
                        <TableCell className="text-white font-medium">{task.name}</TableCell>
                        <TableCell className="text-white">{task.assignee}</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">{task.dueDate}</TableCell>
                        <TableCell className="text-white capitalize">{task.status}</TableCell>
                        <TableCell className="text-white">{task.project}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Client Health Tab */}
          <TabsContent value="clients" className="space-y-6">
            <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">AI-Powered Client Health Monitoring</CardTitle>
                <CardDescription className="text-white/70">
                  Automated risk assessment and client relationship health scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-white">Client</TableHead>
                      <TableHead className="text-white">Health Score</TableHead>
                      <TableHead className="text-white">Last Contact</TableHead>
                      <TableHead className="text-white">Risk Level</TableHead>
                      <TableHead className="text-white">Revenue</TableHead>
                      <TableHead className="text-white">Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientHealth.map((client, index) => (
                      <TableRow key={index} className="border-white/20">
                        <TableCell className="text-white">
                          <div>
                            <p className="font-medium">{client.clientName}</p>
                            <p className="text-sm text-white/70">{client.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{client.healthScore}</span>
                            <Progress value={client.healthScore} className="w-20 h-2" />
                          </div>
                        </TableCell>
                        <TableCell className="text-white">{client.lastContact}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${getRiskColor(client.riskLevel)}`}>
                            {client.riskLevel.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-white">${client.revenue.toLocaleString()}</TableCell>
                        <TableCell>
                          {client.issues.length > 0 ? (
                            <div className="space-y-1">
                              {client.issues.map((issue, i) => (
                                <Badge key={i} variant="destructive" className="text-xs block">
                                  {issue}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge className="bg-green-500 text-white text-xs">No issues</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}