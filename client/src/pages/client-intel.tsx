import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Search, 
  Building, 
  DollarSign, 
  TrendingUp, 
  Users, 
  FileText, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  Sparkles,
  ArrowLeft,
  Bell,
  User,
  Settings,
  LogOut,
  Target,
  Zap,
  Activity,
  Upload,
  Eye,
  Download
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import navLogoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

interface ClientSnapshot {
  id: string;
  email: string;
  companyName: string;
  industry: string;
  revenue: string;
  employees: number;
  lifecycleStage?: string;
  hubspotContact: any;
  qboData: any;
  quotes: any[];
  painPoints: string[];
  services: string[];
  lastActivity: string;
  riskScore: number;
  upsellOpportunities: string[];
  documents: any[];
}

export default function ClientIntel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientSnapshot | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Enhance prospect data mutation
  const enhanceDataMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const response = await apiRequest("POST", `/api/client-intel/enhance/${contactId}`, {});
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Enhancement failed with status ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Enhancement successful:', data);
      toast({
        title: "Data Enhanced",
        description: data.message || "Contact and company data has been automatically populated in HubSpot.",
      });
      // Invalidate search results to show updated data
      queryClient.invalidateQueries({ queryKey: ["/api/client-intel/search"] });
    },
    onError: (error: any) => {
      console.error('Enhancement error:', error);
      toast({
        title: "Enhancement Failed",
        description: error.message || "Unable to enhance data at this time. Please try again later.",
        variant: "destructive",
      });
    }
  });

  const enhanceProspectData = (contactId: string) => {
    enhanceDataMutation.mutate(contactId);
  };

  const enhanceSelectedRecord = async () => {
    if (!selectedClient?.id) return;
    
    try {
      const result = await enhanceDataMutation.mutateAsync(selectedClient.id);
      console.log('Enhancement result:', result);
      
      // Update selected client with Airtable data if available
      if (result?.airtableData) {
        setSelectedClient({
          ...selectedClient,
          airtableData: result.airtableData
        });
      }
      
      // Refresh search results
      if (searchTerm.length > 2) {
        searchQuery.refetch();
      }
    } catch (error) {
      // The mutation's onError handler will show the toast
      console.log('Enhancement handled by mutation error handler');
    }
  };

  // Search for clients/prospects
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/client-intel/search", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      const response = await apiRequest("GET", `/api/client-intel/search?q=${encodeURIComponent(searchTerm)}`);
      return response.json();
    },
    enabled: searchTerm.length > 2,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache results
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Generate AI insights for selected client
  const generateInsightsMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await apiRequest("POST", "/api/client-intel/generate-insights", { clientId });
      return response.json();
    },
    onSuccess: (data) => {
      if (selectedClient) {
        setSelectedClient({ ...selectedClient, ...data });
      }
      toast({
        title: "Insights Generated",
        description: "AI analysis complete with new recommendations."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to generate insights. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleClientSelect = async (client: any) => {
    setSelectedClient(client);
  };

  const handleGenerateInsights = () => {
    if (selectedClient) {
      setIsGeneratingInsights(true);
      generateInsightsMutation.mutate(selectedClient.id);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-600 bg-red-100";
    if (score >= 60) return "text-orange-600 bg-orange-100";
    if (score >= 40) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 'bookkeeping': return <FileText className="h-4 w-4" />;
      case 'tax': return <Calendar className="h-4 w-4" />;
      case 'payroll': return <Users className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      {/* Header */}
      <header className="bg-transparent py-4 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Back Button */}
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Portal
              </Button>
            </Link>
            
            {/* Centered Logo */}
            <div className="flex-1 flex justify-center">
              <img 
                src={navLogoPath} 
                alt="Seed Financial" 
                className="h-16 w-auto"
              />
            </div>
            
            {/* Profile Menu */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="relative p-2 hover:bg-white/10 text-white">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-orange-500 rounded-full"></span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 p-2 hover:bg-white/10 text-white">
                    <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <div className="px-3 py-2 border-b">
                    <p className="font-medium text-gray-900 text-sm">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <DropdownMenuItem className="text-sm">
                    <User className="mr-2 h-3 w-3" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-sm">
                    <Settings className="mr-2 h-3 w-3" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600 text-sm">
                    <LogOut className="mr-2 h-3 w-3" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-light text-white">Client Intel</h1>
          </div>
          <p className="text-white/80 text-lg">AI-powered client insights for strategic engagement</p>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <Card className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search by company name, email, or industry..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent text-lg py-3"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Enhancement Card - Priority */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/30 backdrop-blur-md border border-orange-300/40 shadow-xl mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">AI Data Enhancement</CardTitle>
                    <p className="text-orange-100 text-sm">Auto-populate missing fields</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedClient ? (
                  <div className="space-y-3">
                    <p className="text-orange-100 text-sm">
                      {selectedClient.lifecycleStage?.toLowerCase() === 'customer' ? 'Client' : 'Prospect'} selected: {selectedClient.companyName}
                    </p>
                    <Button 
                      onClick={() => enhanceSelectedRecord()}
                      disabled={enhanceDataMutation.isPending || !selectedClient}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0"
                    >
                      {enhanceDataMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Enhancing...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Enhance Record
                        </div>
                      )}
                    </Button>
                  </div>
                ) : searchTerm.length > 2 ? (
                  <p className="text-orange-200 text-sm">Select a contact to enhance</p>
                ) : (
                  <p className="text-orange-200 text-sm">Search and select a contact to enable enhancement</p>
                )}
              </CardContent>
            </Card>

            {/* Search Results */}
            <Card className="bg-white/30 backdrop-blur-md border border-white/40 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white">Search Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="text-white/70 mt-2">Searching...</p>
                  </div>
                ) : searchResults?.length > 0 ? (
                  searchResults.map((client: any) => (
                    <div
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{client.companyName}</h3>
                          <p className="text-xs text-gray-600">{client.email}</p>
                          <p className="text-xs text-gray-500">
                            {client.industry && client.industry !== 'Unknown' && client.industry !== 'unknown' 
                              ? `${client.industry} • ` 
                              : ''
                            }{client.revenue || 'Revenue not specified'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge 
                            variant={client.lifecycleStage?.toLowerCase() === 'customer' ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            {client.lifecycleStage?.toLowerCase() === 'customer' ? 'Client' : 'Prospect'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {client.services?.length || 0} services
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : searchTerm.length > 2 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-white/50 mx-auto mb-2" />
                    <p className="text-white/70">No clients found</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-8 w-8 text-white/50 mx-auto mb-2" />
                    <p className="text-white/70">Enter 3+ characters to search</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Client Details */}
          <div className="lg:col-span-2">
            {selectedClient ? (
              <div className="space-y-6">
                {/* Client Overview */}
                <Card className="bg-white/30 backdrop-blur-md border border-white/40 shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <Building className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-xl">{selectedClient.companyName}</CardTitle>
                          <p className="text-white/80">{selectedClient.email}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge 
                              variant={selectedClient.lifecycleStage?.toLowerCase() === 'customer' ? "default" : "secondary"} 
                              className="px-2 py-1"
                            >
                              {selectedClient.lifecycleStage?.toLowerCase() === 'customer' ? 'Client' : 'Prospect'}
                            </Badge>
                            <Badge variant="outline" className="px-2 py-1 text-white border-white/30">
                              {selectedClient.services?.length || 0} Services
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleGenerateInsights}
                        disabled={generateInsightsMutation.isPending}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                      >
                        {generateInsightsMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Insights
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-gray-900">{selectedClient.revenue}</p>
                        <p className="text-xs text-gray-600">Revenue</p>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-gray-900">{selectedClient.employees || 'N/A'}</p>
                        <p className="text-xs text-gray-600">Employees</p>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <Target className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-gray-900">
                          {selectedClient.industry && selectedClient.industry !== 'Unknown' && selectedClient.industry !== 'unknown' 
                            ? selectedClient.industry 
                            : 'Not specified'
                          }
                        </p>
                        <p className="text-xs text-gray-600">Industry</p>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <AlertCircle className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-gray-900">{selectedClient.riskScore || 0}%</p>
                        <p className="text-xs text-gray-600">Risk Score</p>
                      </div>
                    </div>

                    {/* Current Services */}
                    <div className="mb-4">
                      <h4 className="text-white font-medium mb-2">Current Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedClient.services?.map((service: string, index: number) => (
                          <Badge key={index} className="bg-green-100 text-green-800 flex items-center gap-1">
                            {getServiceIcon(service)}
                            {service}
                          </Badge>
                        )) || <p className="text-white/70 text-sm">No services recorded</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Insights Tabs */}
                <Card className="bg-white/30 backdrop-blur-md border border-white/40 shadow-xl">
                  <CardContent className="p-6">
                    <Tabs defaultValue="insights" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 bg-white/20">
                        <TabsTrigger value="insights" className="text-white data-[state=active]:bg-white data-[state=active]:text-gray-900">AI Insights</TabsTrigger>
                        <TabsTrigger value="activity" className="text-white data-[state=active]:bg-white data-[state=active]:text-gray-900">Activity</TabsTrigger>
                        <TabsTrigger value="quotes" className="text-white data-[state=active]:bg-white data-[state=active]:text-gray-900">Quotes</TabsTrigger>
                        <TabsTrigger value="documents" className="text-white data-[state=active]:bg-white data-[state=active]:text-gray-900">Documents</TabsTrigger>
                      </TabsList>

                      <TabsContent value="insights" className="mt-6 space-y-4">
                        {/* Pain Points */}
                        <div className="bg-white/50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            Pain Points
                          </h4>
                          <div className="space-y-2">
                            {selectedClient.painPoints?.map((point: string, index: number) => (
                              <div key={index} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2"></div>
                                <p className="text-sm text-gray-700">{point}</p>
                              </div>
                            )) || <p className="text-gray-500 text-sm">No pain points identified</p>}
                          </div>
                        </div>

                        {/* Upsell Opportunities */}
                        <div className="bg-white/50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Upsell Opportunities
                          </h4>
                          <div className="space-y-2">
                            {selectedClient.upsellOpportunities?.map((opp: string, index: number) => (
                              <div key={index} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                                <p className="text-sm text-gray-700">{opp}</p>
                              </div>
                            )) || <p className="text-gray-500 text-sm">No opportunities identified</p>}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="activity" className="mt-6">
                        <div className="bg-white/50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
                          <p className="text-gray-500 text-sm">Activity timeline coming soon...</p>
                        </div>
                      </TabsContent>

                      <TabsContent value="quotes" className="mt-6">
                        <div className="bg-white/50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Quote History</h4>
                          <p className="text-gray-500 text-sm">Quote history will be displayed here...</p>
                        </div>
                      </TabsContent>

                      <TabsContent value="documents" className="mt-6">
                        <div className="bg-white/50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Documents & Files</h4>
                          <p className="text-gray-500 text-sm">Document management coming soon...</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-white/30 backdrop-blur-md border border-white/40 shadow-xl">
                <CardContent className="p-12 text-center">
                  <Sparkles className="h-16 w-16 text-white/50 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Select a Client</h3>
                  <p className="text-white/70">Search and select a client to view their AI-generated insights</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}