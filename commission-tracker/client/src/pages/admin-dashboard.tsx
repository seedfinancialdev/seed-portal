import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Team management and commission oversight</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Features Coming Soon</CardTitle>
            <CardDescription>
              Advanced admin features for team management and commission oversight
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Team Performance Overview</h3>
                <p className="text-sm text-gray-600">View all sales reps performance metrics</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Commission Approval Queue</h3>
                <p className="text-sm text-gray-600">Review and approve commission adjustments</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Bonus Management</h3>
                <p className="text-sm text-gray-600">Track and manage team bonuses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}