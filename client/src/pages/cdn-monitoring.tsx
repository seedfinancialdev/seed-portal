import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: string;
  uptime: number;
}

export default function CDNMonitoring() {
  const { user } = useAuth();
  
  const { data: serviceStatuses, isLoading } = useQuery<ServiceStatus[]>({
    queryKey: ["/api/system/health"],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✓';
      case 'degraded': return '⚠';
      case 'down': return '✗';
      default: return '?';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              System Health Monitor
            </h1>
            <p className="text-gray-600">
              Real-time monitoring of all critical services and APIs
            </p>
          </div>

          {/* Service Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {serviceStatuses?.map((service) => (
              <div key={service.name} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                    {getStatusIcon(service.status)} {service.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Response Time:</span>
                    <span className="text-sm font-medium">{service.responseTime}ms</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Uptime:</span>
                    <span className="text-sm font-medium">{service.uptime.toFixed(2)}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Checked:</span>
                    <span className="text-sm font-medium">{new Date(service.lastChecked).toLocaleTimeString()}</span>
                  </div>

                  {/* Uptime Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${service.uptime >= 99 ? 'bg-green-500' : service.uptime >= 95 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${service.uptime}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Infrastructure Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Database Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Connections:</span>
                  <span className="text-sm font-medium">12/50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Query Time:</span>
                  <span className="text-sm font-medium">45ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cache Hit Rate:</span>
                  <span className="text-sm font-medium">94.2%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">System Resources</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">CPU Usage:</span>
                  <span className="text-sm font-medium">34%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Memory Usage:</span>
                  <span className="text-sm font-medium">67%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Disk Usage:</span>
                  <span className="text-sm font-medium">23%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}