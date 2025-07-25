import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CommissionReports() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Commission Reports</h1>
          <p className="text-gray-600">Detailed commission and earnings reports</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reporting Features Coming Soon</CardTitle>
            <CardDescription>
              Comprehensive commission and performance reporting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Monthly Commission Reports</h3>
                <p className="text-sm text-gray-600">Detailed monthly earnings breakdown</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Annual Performance Summary</h3>
                <p className="text-sm text-gray-600">Year-end commission and bonus summary</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Export Reports</h3>
                <p className="text-sm text-gray-600">Download reports for tax and accounting</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}