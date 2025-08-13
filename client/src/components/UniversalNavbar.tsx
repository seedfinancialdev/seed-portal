import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { ArrowLeft, Bell, User, Settings, LogOut, Shield, UserMinus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BackButton } from "@/components/BackButton";
import { useBackNavigation } from "@/hooks/use-navigation-history";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

interface UniversalNavbarProps {
  showBackButton?: boolean;
  fallbackPath?: string;
}

export function UniversalNavbar({ 
  showBackButton = true,
  fallbackPath = "/"
}: UniversalNavbarProps) {
  const { user: dbUser, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const { canGoBack } = useBackNavigation();
  const queryClient = useQueryClient();
  const { toast } = useToast();



  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Stop impersonation mutation
  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/stop-impersonation', {});
    },
    onSuccess: async () => {
      // Clear cache and refetch user data
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Impersonation Stopped",
        description: "You have returned to your admin account.",
      });
      
      // Redirect to admin dashboard
      setLocation('/admin');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop impersonation",
        variant: "destructive",
      });
    },
  });

  // Memoize calculations to prevent infinite loops in child components
  const shouldShowBackButton = useMemo(() => {
    return showBackButton && (canGoBack || location !== '/');
  }, [showBackButton, canGoBack, location]);

  const userDisplayData = useMemo(() => {
    if (!dbUser) return null;
    
    return {
      email: dbUser.email,
      firstName: dbUser.firstName,
      profilePhoto: dbUser.profilePhoto,
      isImpersonating: dbUser.isImpersonating,
      role: dbUser.role,
      displayName: dbUser.email?.split('@')[0],
      initials: dbUser.firstName?.charAt(0)?.toUpperCase() || dbUser.email?.charAt(0).toUpperCase(),
      isAdmin: dbUser.email === 'jon@seedfinancial.io' || dbUser.email === 'anthony@seedfinancial.io' || dbUser.role === 'admin'
    };
  }, [dbUser?.email, dbUser?.firstName, dbUser?.profilePhoto, dbUser?.isImpersonating, dbUser?.role]);

  return (
    <header className="bg-transparent z-50 py-4 relative">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-center h-20">
          <img src={logoPath} alt="Seed Financial" className="h-16" />
        </div>
        
        {/* Smart Back Button - Positioned Absolutely */}
        {shouldShowBackButton && (
          <div className="absolute top-4 left-6">
            <BackButton
              variant="ghost"
              size="sm"
              className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
              fallbackPath={fallbackPath}
            />
          </div>
        )}
        
        {/* User Menu - Positioned Absolutely */}
        <div className="absolute top-4 right-6 flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="relative p-2 hover:bg-white/10 text-white">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-orange-500 rounded-full"></span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 p-2 hover:bg-white/10 text-white">
                {userDisplayData?.profilePhoto ? (
                  <img 
                    src={userDisplayData.profilePhoto} 
                    alt="Profile" 
                    className="w-7 h-7 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {userDisplayData?.initials}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2 border-b">
                <p className="font-medium text-gray-900 text-sm">{userDisplayData?.displayName}</p>
                <p className="text-xs text-gray-500">{userDisplayData?.email}</p>
                {userDisplayData?.isImpersonating && (
                  <div className="mt-1 flex items-center gap-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <p className="text-xs text-orange-600 font-medium">Admin View</p>
                  </div>
                )}
              </div>
              {userDisplayData?.isImpersonating && (
                <DropdownMenuItem 
                  onClick={() => stopImpersonationMutation.mutate()} 
                  className="text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  disabled={stopImpersonationMutation.isPending}
                >
                  <UserMinus className="mr-2 h-3 w-3" />
                  {stopImpersonationMutation.isPending ? 'Stopping...' : 'Stop Impersonation'}
                </DropdownMenuItem>
              )}
              {userDisplayData?.isImpersonating && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => setLocation('/profile')} className="text-sm">
                <User className="mr-2 h-3 w-3" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/kb-admin')} className="text-sm">
                <Settings className="mr-2 h-3 w-3" />
                Knowledge Base Admin
              </DropdownMenuItem>
              {userDisplayData?.isAdmin && (
                <DropdownMenuItem onClick={() => setLocation('/admin')} className="text-sm">
                  <Shield className="mr-2 h-3 w-3" />
                  SEEDOS Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 text-sm">
                <LogOut className="mr-2 h-3 w-3" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}