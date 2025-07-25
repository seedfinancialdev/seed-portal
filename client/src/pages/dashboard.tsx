import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Calculator, LogOut, User } from "lucide-react";
import navLogoPath from "@assets/Nav Logo_1753431362883.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src={navLogoPath} 
                alt="Seed Financial Logo" 
                className="h-8 mr-3"
              />
              <h1 className="text-xl font-semibold text-gray-900">Employee Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{user?.email || 'User'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-sm">
                    {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-sm cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome to Seed Financial Portal</h2>
          <p className="text-lg text-gray-200">Access your tools and resources below</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quote Calculator Card */}
          <Link href="/calculator">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-[#e24c00]" />
                  Quote Calculator
                </CardTitle>
                <CardDescription>
                  Generate quotes for bookkeeping and tax services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Create, manage, and push quotes to HubSpot with our advanced pricing calculator.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Placeholder cards for future features */}
          <Card className="opacity-50 cursor-not-allowed">
            <CardHeader>
              <CardTitle className="text-gray-400">Coming Soon</CardTitle>
              <CardDescription>New features in development</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Additional portal features will be available here.
              </p>
            </CardContent>
          </Card>

          <Card className="opacity-50 cursor-not-allowed">
            <CardHeader>
              <CardTitle className="text-gray-400">Coming Soon</CardTitle>
              <CardDescription>New features in development</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Additional portal features will be available here.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}