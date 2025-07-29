import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, Search, Bell, User, LogOut, Settings } from "lucide-react";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

interface UniversalNavbarProps {
  showBackButton?: boolean;
  backButtonText?: string;
  backButtonPath?: string;
  variant?: 'light' | 'dark';
}

export function UniversalNavbar({ 
  showBackButton = false, 
  backButtonText = "Back to Portal", 
  backButtonPath = "/",
  variant = 'light'
}: UniversalNavbarProps) {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  const isDark = variant === 'dark';

  // Style classes based on variant
  const navbarClasses = isDark 
    ? "bg-transparent"
    : "bg-white border-b border-gray-200 sticky top-0 z-50";
    
  const containerClasses = isDark
    ? "relative mb-8"
    : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16";

  const buttonBaseClasses = isDark
    ? "text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
    : "text-gray-700 hover:text-gray-900";

  const searchClasses = isDark
    ? "pl-10 w-64 bg-white/15 backdrop-blur-md border-white/30 placeholder:text-white/60 text-white focus:bg-white/20 focus:border-white/50"
    : "pl-10 w-64 bg-gray-50 border-gray-200 focus:bg-white";

  const searchIconClasses = isDark
    ? "h-4 w-4 text-white/60"
    : "h-4 w-4 text-gray-400";

  if (isDark) {
    return (
      <div className={containerClasses}>
        {showBackButton && (
          <div className="absolute top-0 left-0">
            <Button
              variant="ghost"
              size="sm"
              className={buttonBaseClasses}
              onClick={() => setLocation(backButtonPath)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {backButtonText}
            </Button>
          </div>
        )}
        
        <div className="absolute top-0 right-0 flex items-center space-x-4">
          <Button variant="ghost" size="sm" className={`relative ${buttonBaseClasses}`}>
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`flex items-center gap-2 ${buttonBaseClasses}`}>
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:block">{user?.email?.split('@')[0]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2 border-b">
                <p className="font-medium text-gray-900">{user?.email?.split('@')[0]}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
              <DropdownMenuItem onClick={() => setLocation('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/kb-admin')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Knowledge Base Admin</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex justify-center">
          <img 
            src={logoPath} 
            alt="Seed Financial Logo" 
            className="h-16"
          />
        </div>
      </div>
    );
  }

  // Light variant (for dashboard and other white background pages)
  return (
    <header className={navbarClasses}>
      <div className={containerClasses}>
        <div className="flex items-center space-x-8">
          <img 
            src={logoPath} 
            alt="Seed Financial Logo" 
            className="h-8"
          />
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              className={buttonBaseClasses}
              onClick={() => setLocation(backButtonPath)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {backButtonText}
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative hidden md:block">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${searchIconClasses}`} />
            <Input 
              placeholder="Search..." 
              className={searchClasses}
            />
          </div>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:block text-gray-700">{user?.email?.split('@')[0]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2 border-b">
                <p className="font-medium text-gray-900">{user?.email?.split('@')[0]}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
              <DropdownMenuItem onClick={() => setLocation('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/kb-admin')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Knowledge Base Admin</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}