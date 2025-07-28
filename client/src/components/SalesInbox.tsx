import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Building2, ExternalLink, Filter, Inbox, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface SalesLead {
  id: string;
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    hs_avatar_filemanager_key?: string;
    hubspot_owner_assigneddate?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
  };
  leadStage: string;
  hubspotContactUrl: string;
}

interface SalesInboxProps {
  limit?: number;
}

export function SalesInbox({ limit = 8 }: SalesInboxProps) {
  const { data: leadsData, isLoading, error } = useQuery({
    queryKey: ['/api/sales-inbox/leads', limit],
    queryFn: async () => {
      const response = await fetch(`/api/sales-inbox/leads?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales inbox leads');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const leads: SalesLead[] = leadsData?.leads || [];

  const formatContactName = (lead: SalesLead) => {
    const firstName = lead.properties.firstname || '';
    const lastName = lead.properties.lastname || '';
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) return firstName;
    if (lastName) return lastName;
    return lead.properties.email;
  };

  const formatAssignedDate = (dateString?: string) => {
    if (!dateString) return 'Not assigned';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getAvatarUrl = (lead: SalesLead) => {
    // If HubSpot has an avatar URL, use it
    if (lead.properties.hs_avatar_filemanager_key) {
      return `https://app.hubspot.com/file-preview/${lead.properties.hs_avatar_filemanager_key}`;
    }
    return null;
  };

  const getLeadStageColor = (stage: string) => {
    const lowerStage = stage.toLowerCase();
    if (lowerStage.includes('new') || lowerStage.includes('lead')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (lowerStage.includes('qualified') || lowerStage.includes('opportunity')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (lowerStage.includes('contact') || lowerStage.includes('attempt')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (isLoading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Inbox className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Sales Inbox</CardTitle>
              <CardDescription>Loading active leads...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-48"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-300 rounded w-24"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Inbox className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Sales Inbox</CardTitle>
              <CardDescription className="text-red-600">Failed to load leads</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Unable to connect to HubSpot. Please check your integration settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/30 backdrop-blur-md border border-white/40 shadow-xl h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium text-white">Sales Inbox</CardTitle>
            <CardDescription className="text-sm text-white/80">Active leads requiring attention</CardDescription>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white text-xs">View All</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3" style={{ minHeight: '400px' }}>
        {leads.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No active leads</h3>
            <p className="text-white/60">All caught up! No leads requiring attention at the moment.</p>
          </div>
        ) : (
          <>
            {leads.slice(0, 8).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-4 bg-white border-l-4 border-l-orange-500 rounded-lg shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {lead.properties.company || 'Unknown Company'}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {formatContactName(lead)} • {formatAssignedDate(lead.properties.hubspot_owner_assigneddate)} • {lead.leadStage}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => window.open(lead.hubspotContactUrl, '_blank')}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                >
                  Open in HubSpot
                </Button>
              </div>
            ))}
            {/* Fill remaining space for consistent height */}
            {leads.length < 8 && (
              <div style={{ height: `${(8 - leads.length) * 80}px` }} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}