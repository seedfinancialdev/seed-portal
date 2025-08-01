import { Button } from "@/components/ui/button";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { useLocation } from "wouter";
import { ArrowLeft, Bell, User, Settings, LogOut, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BackButton } from "@/components/BackButton";
import { useBackNavigation } from "@/hooks/use-navigation-history";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

interface UniversalNavbarProps {
  showBackButton?: boolean;
  fallbackPath?: string;
}

export function UniversalNavbar({ 
  showBackButton = true,
  fallbackPath = "/"
}: UniversalNavbarProps) {
  const { dbUser, signOut } = useGoogleAuth();
  const [location, setLocation] = useLocation();
  const { canGoBack } = useBackNavigation();

  const handleLogout = async () => {
    await signOut();
  };

  // Only show back button if there's history or if explicitly requested
  const shouldShowBackButton = showBackButton && (canGoBack || location !== '/');

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
                {dbUser?.profilePhoto ? (
                  <img 
                    src={dbUser.profilePhoto} 
                    alt="Profile" 
                    className="w-7 h-7 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {dbUser?.firstName?.charAt(0)?.toUpperCase() || dbUser?.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <div className="px-3 py-2 border-b">
                <p className="font-medium text-gray-900 text-sm">{dbUser?.email?.split('@')[0]}</p>
                <p className="text-xs text-gray-500">{dbUser?.email}</p>
              </div>
              <DropdownMenuItem onClick={() => setLocation('/profile')} className="text-sm">
                <User className="mr-2 h-3 w-3" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/kb-admin')} className="text-sm">
                <Settings className="mr-2 h-3 w-3" />
                Knowledge Base Admin
              </DropdownMenuItem>
              {(dbUser?.email === 'jon@seedfinancial.io' || dbUser?.email === 'anthony@seedfinancial.io' || dbUser?.role === 'admin') && (
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