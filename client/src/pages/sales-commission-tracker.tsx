import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { UniversalNavbar } from "@/components/UniversalNavbar";
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  Target,
  Award,
  Trophy,
  BarChart3,
  Gift
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

// Mock data for the individual sales rep
const mockCommissions = [
  {
    id: "1",
    dealName: "Louisiana Senior Advisors - Bookkeeping",
    companyName: "Louisiana Senior Advisors", 
    serviceType: "Bookkeeping",
    amount: 220,
    status: "pending",
    dateEarned: "2025-07-18",
    type: "Month 1"
  },
  {
    id: "2", 
    dealName: "Power 3 Financial - Bookkeeping + TaaS",
    companyName: "Power 3 Financial",
    serviceType: "Bookkeeping + TaaS", 
    amount: 298.40,
    status: "pending",
    dateEarned: "2025-08-04",
    type: "Month 1"
  }
];

const mockPipeline = [
  {
    id: "1",
    dealName: "Tech Solutions Inc - Bookkeeping",
    companyName: "Tech Solutions Inc",
    serviceType: "Bookkeeping",
    stage: "Qualified",
    dealValue: 2400,
    projectedCommission: 180,
    probability: 75
  },
  {
    id: "2", 
    dealName: "Green Energy Co - TaaS",
    companyName: "Green Energy Co",
    serviceType: "TaaS",
    stage: "Proposal Sent",
    dealValue: 1800,
    projectedCommission: 140,
    probability: 50
  }
];

export default function SalesCommissionTracker() {
  const { user } = useAuth();

  // Calculate metrics from mock data
  const currentPeriodTotal = mockCommissions.reduce((sum, c) => sum + c.amount, 0);
  const projectedCommissions = mockPipeline.reduce((sum, deal) => sum + deal.projectedCommission, 0);
  const weightedPipeline = mockPipeline.reduce((sum, deal) => sum + (deal.projectedCommission * deal.probability / 100), 0);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'disputed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <UniversalNavbar />
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/sales-dashboard">
              <Button variant="outline" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
                My Commission Tracker
              </h1>
              <p className="text-gray-600" data-testid="text-page-description">
                Track your personal commission earnings and pipeline projections
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Current Period */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                Current Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600" data-testid="text-current-period">
                ${currentPeriodTotal.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {mockCommissions.length} commission{mockCommissions.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          {/* Projected Commissions */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                Projected Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600" data-testid="text-projected-commissions">
                ${projectedCommissions.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {mockPipeline.length} deal{mockPipeline.length !== 1 ? 's' : ''} in pipeline
              </p>
            </CardContent>
          </Card>

          {/* Weighted Pipeline */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Target className="h-4 w-4 mr-2 text-purple-600" />
                Weighted Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600" data-testid="text-weighted-pipeline">
                ${weightedPipeline.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Probability-adjusted projections
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bonus Tracking Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Monthly Bonus */}
          <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-orange-800 flex items-center">
                <Gift className="h-5 w-5 mr-2" />
                Monthly Bonus Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Clients This Month: 2</span>
                    <span className="font-semibold">5 clients = $500 (AirPods)</span>
                  </div>
                  <Progress value={40} className="h-3" data-testid="progress-monthly-bonus" />
                </div>
                <div className="text-center">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    3 more clients needed
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestone Bonus */}
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-purple-800 flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Milestone Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Total Clients: 8</span>
                    <span className="font-semibold">25 clients = $1,000 bonus</span>
                  </div>
                  <Progress value={32} className="h-3" data-testid="progress-milestone-bonus" />
                </div>
                <div className="text-center">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    17 more clients needed
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="commissions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white shadow-sm">
            <TabsTrigger value="commissions" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Commission History
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Pipeline Projections
            </TabsTrigger>
          </TabsList>

          {/* Commission History Tab */}
          <TabsContent value="commissions">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  Commission History
                </CardTitle>
                <CardDescription>
                  Your earned commissions and their current status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Earned</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockCommissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell className="font-medium">
                            {commission.dealName}
                          </TableCell>
                          <TableCell>{commission.companyName}</TableCell>
                          <TableCell>
                            <span className="capitalize">{commission.serviceType}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {commission.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${commission.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(commission.status)} className="capitalize">
                              {commission.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(commission.dateEarned).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipeline Projections Tab */}
          <TabsContent value="pipeline">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Pipeline Projections
                </CardTitle>
                <CardDescription>
                  Projected commissions from your current sales pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Deal Value</TableHead>
                        <TableHead>Projected Commission</TableHead>
                        <TableHead>Probability</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockPipeline.map((deal) => (
                        <TableRow key={deal.id}>
                          <TableCell className="font-medium">
                            {deal.dealName}
                          </TableCell>
                          <TableCell>{deal.companyName}</TableCell>
                          <TableCell>
                            <span className="capitalize">{deal.serviceType}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {deal.stage}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${deal.dealValue.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            ${deal.projectedCommission.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={deal.probability} className="w-16 h-2" />
                              <span className="text-sm text-gray-500">{deal.probability}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}