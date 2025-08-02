import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface SalesMetrics {
  totalPipeline: number;
  closedDeals: number;
  mtdRevenue: number;
  ytdRevenue: number;
  conversionRate: number;
  avgDealSize: number;
}

interface SalesLead {
  id: string;
  name: string;
  email: string;
  stage: string;
  value: number;
  lastActivity: string;
}

export default function SalesDashboard() {
  const { user } = useAuth();
  
  const { data: metrics, isLoading: metricsLoading } = useQuery<SalesMetrics>({
    queryKey: ["/api/dashboard/sales-metrics"],
    enabled: !!user,
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<SalesLead[]>({
    queryKey: ["/api/sales-inbox/leads"],
    enabled: !!user,
  });

  if (metricsLoading || leadsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sales Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, {user?.firstName || user?.email}. Here's your sales overview.
            </p>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pipeline</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${metrics?.totalPipeline?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Closed Deals</p>
                  <p className="text-2xl font-bold text-green-600">
                    {metrics?.closedDeals || 0}
                  </p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">MTD Revenue</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${metrics?.mtdRevenue?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">YTD Revenue</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    ${metrics?.ytdRevenue?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {metrics?.conversionRate?.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Deal Size</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${metrics?.avgDealSize?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Leads */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/calculator">
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">Create New Quote</span>
                  </div>
                </Link>

                <Link href="/client-intel">
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">Client Intelligence</span>
                  </div>
                </Link>

                <Link href="/commission-tracker">
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">View Commissions</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Leads */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Leads</h3>
                <Link href="/sales-inbox" className="text-blue-600 hover:text-blue-800 text-sm">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {Array.isArray(leads) ? leads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{lead.name}</p>
                      <p className="text-sm text-gray-600">{lead.email}</p>
                      <p className="text-xs text-gray-500">{lead.stage}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">${lead.value?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{new Date(lead.lastActivity).toLocaleDateString()}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-gray-500 text-center py-4">No leads available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
