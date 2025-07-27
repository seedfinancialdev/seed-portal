import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Target,
  Users,
  PlusCircle,
  Edit2,
  Trash2,
  Eye
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

interface CommissionEntry {
  id: string;
  clientName: string;
  serviceType: 'Bookkeeping' | 'TaaS' | 'Combined';
  setupFee: number;
  monthlyFee: number;
  commissionType: 'Month 1' | 'Ongoing';
  amount: number;
  status: 'Pending' | 'Paid' | 'Processing';
  dateEarned: string;
  datePaid?: string;
}

export default function CommissionTracker() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    clientName: '',
    serviceType: 'Bookkeeping' as const,
    setupFee: 0,
    monthlyFee: 0,
  });

  // Sample data for demonstration
  useEffect(() => {
    const sampleEntries: CommissionEntry[] = [
      {
        id: '1',
        clientName: 'TechFlow Solutions',
        serviceType: 'Combined',
        setupFee: 2500,
        monthlyFee: 850,
        commissionType: 'Month 1',
        amount: 840, // 20% of setup + 40% of monthly
        status: 'Paid',
        dateEarned: '2025-01-15',
        datePaid: '2025-01-30'
      },
      {
        id: '2',
        clientName: 'Wellness Hub Inc',
        serviceType: 'Bookkeeping',
        setupFee: 1200,
        monthlyFee: 450,
        commissionType: 'Month 1',
        amount: 420, // 20% of setup + 40% of monthly
        status: 'Processing',
        dateEarned: '2025-01-20',
      },
      {
        id: '3',
        clientName: 'TechFlow Solutions',
        serviceType: 'Combined',
        setupFee: 0,
        monthlyFee: 850,
        commissionType: 'Ongoing',
        amount: 85, // 10% of monthly
        status: 'Pending',
        dateEarned: '2025-02-15',
      }
    ];
    setEntries(sampleEntries);
  }, []);

  // Calculate totals
  const totalPending = entries.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = entries.filter(e => e.status === 'Paid').reduce((sum, e) => sum + e.amount, 0);
  const totalProcessing = entries.filter(e => e.status === 'Processing').reduce((sum, e) => sum + e.amount, 0);
  const totalEarned = totalPaid + totalProcessing + totalPending;

  const handleAddEntry = () => {
    if (!newEntry.clientName || !newEntry.monthlyFee) return;

    const month1Commission = (newEntry.setupFee * 0.20) + (newEntry.monthlyFee * 0.40);
    
    const entry: CommissionEntry = {
      id: Date.now().toString(),
      clientName: newEntry.clientName,
      serviceType: newEntry.serviceType,
      setupFee: newEntry.setupFee,
      monthlyFee: newEntry.monthlyFee,
      commissionType: 'Month 1',
      amount: month1Commission,
      status: 'Pending',
      dateEarned: new Date().toISOString().split('T')[0],
    };

    setEntries([...entries, entry]);
    setNewEntry({
      clientName: '',
      serviceType: 'Bookkeeping',
      setupFee: 0,
      monthlyFee: 0,
    });
    setIsAddingEntry(false);
  };

  const getStatusBadge = (status: CommissionEntry['status']) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case 'Processing':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Processing</Badge>;
      case 'Pending':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Portal
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Commission Tracker</h1>
              <p className="text-white/70">Track your earnings and commission status</p>
            </div>
          </div>
          <Button 
            onClick={() => setIsAddingEntry(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Commission
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Earned</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Processing</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    ${totalProcessing.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-600">
                    ${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Target className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Commission Entries
            </CardTitle>
            <CardDescription>
              Manage and track all your commission earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="processing">Processing</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <CommissionTable entries={entries} getStatusBadge={getStatusBadge} />
              </TabsContent>

              <TabsContent value="pending" className="mt-6">
                <CommissionTable 
                  entries={entries.filter(e => e.status === 'Pending')} 
                  getStatusBadge={getStatusBadge} 
                />
              </TabsContent>

              <TabsContent value="processing" className="mt-6">
                <CommissionTable 
                  entries={entries.filter(e => e.status === 'Processing')} 
                  getStatusBadge={getStatusBadge} 
                />
              </TabsContent>

              <TabsContent value="paid" className="mt-6">
                <CommissionTable 
                  entries={entries.filter(e => e.status === 'Paid')} 
                  getStatusBadge={getStatusBadge} 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Add Entry Modal (simplified inline form) */}
        {isAddingEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Add Commission Entry</CardTitle>
                <CardDescription>Enter details for a new commission</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={newEntry.clientName}
                    onChange={(e) => setNewEntry({ ...newEntry, clientName: e.target.value })}
                    placeholder="Enter client name"
                  />
                </div>
                <div>
                  <Label htmlFor="setupFee">Setup Fee</Label>
                  <Input
                    id="setupFee"
                    type="number"
                    value={newEntry.setupFee}
                    onChange={(e) => setNewEntry({ ...newEntry, setupFee: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="monthlyFee">Monthly Fee</Label>
                  <Input
                    id="monthlyFee"
                    type="number"
                    value={newEntry.monthlyFee}
                    onChange={(e) => setNewEntry({ ...newEntry, monthlyFee: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddEntry} className="flex-1">
                    Add Entry
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddingEntry(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// Commission Table Component
function CommissionTable({ 
  entries, 
  getStatusBadge 
}: { 
  entries: CommissionEntry[], 
  getStatusBadge: (status: CommissionEntry['status']) => JSX.Element 
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>Client</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date Earned</TableHead>
            <TableHead>Date Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                No commission entries found
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.clientName}</TableCell>
                <TableCell>{entry.serviceType}</TableCell>
                <TableCell>{entry.commissionType}</TableCell>
                <TableCell className="font-semibold">
                  ${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>{getStatusBadge(entry.status)}</TableCell>
                <TableCell>{new Date(entry.dateEarned).toLocaleDateString()}</TableCell>
                <TableCell>
                  {entry.datePaid ? new Date(entry.datePaid).toLocaleDateString() : '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}