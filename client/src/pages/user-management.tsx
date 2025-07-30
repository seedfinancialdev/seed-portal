import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, UserCheck, Settings, RefreshCw, CheckCircle, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface WorkspaceUser {
  id: string;
  primaryEmail: string;
  name: {
    givenName: string;
    familyName: string;
    fullName: string;
  };
  isAdmin: boolean;
  suspended: boolean;
  orgUnitPath: string;
  lastLoginTime?: string;
  creationTime: string;
  thumbnailPhotoUrl?: string;
}

interface DatabaseUser {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  roleAssignedBy?: number;
  roleAssignedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<{[key: string]: string}>({});

  // Fetch Google Workspace users
  const { data: workspaceData, isLoading: loadingWorkspace, refetch: refetchWorkspace, error: workspaceError } = useQuery({
    queryKey: ['/api/admin/workspace-users'],
    queryFn: () => apiRequest('/api/admin/workspace-users'),
    retry: false, // Don't retry on errors so we can display setup instructions
  });

  // Fetch database users
  const { data: databaseData, isLoading: loadingDatabase, refetch: refetchDatabase } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users'),
  });

  // Test Google Admin connection
  const { data: connectionTest, refetch: testConnection } = useQuery({
    queryKey: ['/api/admin/test-google-admin'],
    queryFn: () => apiRequest('/api/admin/test-google-admin'),
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      apiRequest(`/api/admin/users/${userId}/role`, { 
        method: 'PATCH', 
        body: JSON.stringify({ role })
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "User role updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive"
      });
    }
  });

  // Sync workspace user mutation
  const syncUserMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      apiRequest('/api/admin/sync-workspace-user', { 
        method: 'POST', 
        body: JSON.stringify({ email, role })
      }),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `User ${data.action} successfully with ${data.user.role} role`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync user",
        variant: "destructive"
      });
    }
  });

  const handleRoleUpdate = (userId: number, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleSyncUser = (email: string, role: string) => {
    syncUserMutation.mutate({ email, role });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'sales': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'service': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const workspaceUsers: WorkspaceUser[] = workspaceData?.users || [];
  const databaseUsers: DatabaseUser[] = databaseData?.users || [];
  const configured = workspaceData?.configured !== false;

  // Create a map of database users by email for quick lookup
  const databaseUserMap = databaseUsers.reduce((acc, user) => {
    acc[user.email] = user;
    return acc;
  }, {} as {[key: string]: DatabaseUser});

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/admin')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to SEEDOS
            </Button>
            <h1 className="text-xl font-semibold text-white">User Management</h1>
            <div></div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Users className="h-8 w-8 text-white" />
          <h1 className="text-3xl font-bold text-white">User Management</h1>
        </div>

        {/* Connection Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Google Workspace Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {configured ? (
                  connectionTest?.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <span className="font-medium">
                  {configured ? 
                    (connectionTest?.connected ? 'Connected' : 'Connection Failed') : 
                    'Not Configured'
                  }
                </span>
                <span className="text-sm text-gray-600">
                  {connectionTest?.message}
                </span>
              </div>
              <Button onClick={() => testConnection()} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Google Workspace Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Google Workspace Users</span>
                <Button onClick={() => refetchWorkspace()} size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWorkspace ? (
                <div className="text-center py-8">Loading workspace users...</div>
              ) : workspaceError ? (
                <div className="text-center py-8">
                  <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <div className="text-red-600 font-medium mb-1">Setup Required</div>
                  <div className="text-sm text-gray-600 max-w-md mx-auto mb-4">
                    Google Workspace Admin API needs additional configuration
                  </div>
                  {(workspaceError as any)?.setupInstructions && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-left max-w-2xl mx-auto">
                      <div className="text-sm text-yellow-800">
                        <strong className="block mb-3">Required Setup Steps:</strong>
                        {Object.entries((workspaceError as any).setupInstructions).map(([key, value]) => {
                          if (key === 'scopes') {
                            return (
                              <div key={key} className="mb-2">
                                <strong>Required Scopes:</strong>
                                <ul className="list-disc list-inside ml-2 mt-1">
                                  {(value as string[]).map((scope, i) => (
                                    <li key={i} className="text-xs font-mono break-all">{scope}</li>
                                  ))}
                                </ul>
                              </div>
                            );
                          }
                          if (key.startsWith('step')) {
                            return <div key={key} className="mb-1">• {value as string}</div>;
                          }
                          if (key === 'clientId') {
                            return <div key={key} className="mb-1"><strong>Client ID:</strong> {value as string}</div>;
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : !configured ? (
                <div className="text-center py-8 text-gray-500">
                  Google Admin API not configured
                </div>
              ) : !connectionTest?.connected ? (
                <div className="text-center py-8">
                  <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <div className="text-red-600 font-medium mb-1">Connection Failed</div>
                  <div className="text-sm text-gray-600 max-w-md mx-auto">
                    {connectionTest?.message || 'Unable to connect to Google Workspace'}
                  </div>
                </div>
              ) : workspaceUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No workspace users found
                </div>
              ) : (
                <div className="space-y-3">
                  {workspaceUsers.map((user) => {
                    const dbUser = databaseUserMap[user.primaryEmail];
                    const userRole = selectedRole[user.primaryEmail] || 'service';
                    
                    return (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {user.thumbnailPhotoUrl ? (
                            <img 
                              src={user.thumbnailPhotoUrl} 
                              alt="Profile" 
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm">
                              {user.name.givenName?.charAt(0) || user.primaryEmail.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{user.name.fullName || user.primaryEmail}</p>
                            <p className="text-sm text-gray-600">{user.primaryEmail}</p>
                            {user.suspended && (
                              <Badge className="mt-1 bg-red-100 text-red-800">Suspended</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {dbUser ? (
                            <Badge className={getRoleBadgeColor(dbUser.role)}>
                              {dbUser.role}
                            </Badge>
                          ) : (
                            <>
                              <Select
                                value={userRole}
                                onValueChange={(value) => 
                                  setSelectedRole(prev => ({ ...prev, [user.primaryEmail]: value }))
                                }
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="sales">Sales</SelectItem>
                                  <SelectItem value="service">Service</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={() => handleSyncUser(user.primaryEmail, userRole)}
                                disabled={syncUserMutation.isPending}
                              >
                                Sync
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Database Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Portal Users</span>
                <Button onClick={() => refetchDatabase()} size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDatabase ? (
                <div className="text-center py-8">Loading portal users...</div>
              ) : databaseUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No portal users found
                </div>
              ) : (
                <div className="space-y-3">
                  {databaseUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.email
                          }
                        </p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.roleAssignedAt && (
                          <p className="text-xs text-gray-500">
                            Role assigned: {new Date(user.roleAssignedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => handleRoleUpdate(user.id, newRole)}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}