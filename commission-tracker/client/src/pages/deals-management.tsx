import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DealsManagement() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Deals Management</h1>
          <p className="text-gray-600">Monitor and manage your sales deals</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Deal Management Coming Soon</CardTitle>
            <CardDescription>
              Track your deals and commission status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Active Deals Pipeline</h3>
                <p className="text-sm text-gray-600">Monitor deals in progress</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Closed Deals</h3>
                <p className="text-sm text-gray-600">View completed deals and commissions</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">HubSpot Sync</h3>
                <p className="text-sm text-gray-600">Sync deals from HubSpot CRM</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}