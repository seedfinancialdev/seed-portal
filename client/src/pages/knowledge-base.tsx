import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ExternalLink, 
  BookOpen, 
  FileText, 
  Search,
  Loader2,
  AlertCircle,
  Play
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, User, Settings, LogOut } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function KnowledgeBase() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [wikiStatus, setWikiStatus] = useState<'loading' | 'available' | 'unavailable'>('loading');
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Check if Wiki.js is available
  useEffect(() => {
    checkWikiStatus();
  }, []);

  const checkWikiStatus = async () => {
    try {
      // Check if we have a Vercel Wiki.js URL configured
      const wikiUrl = import.meta.env.VITE_WIKI_URL || process.env.WIKI_URL;
      
      if (!wikiUrl) {
        setWikiStatus('unavailable');
        setShowSetupGuide(true);
        return;
      }

      const response = await fetch(`${wikiUrl}/healthz`, { 
        method: 'GET',
        timeout: 5000 
      } as any);
      
      if (response.ok) {
        setWikiStatus('available');
      } else {
        // Try the main URL if healthz fails
        const mainResponse = await fetch(wikiUrl, { 
          method: 'HEAD',
          timeout: 5000 
        } as any);
        
        if (mainResponse.ok || mainResponse.status === 404) {
          setWikiStatus('available');
        } else {
          setWikiStatus('unavailable');
        }
      }
    } catch (error) {
      console.error('Wiki status check failed:', error);
      setWikiStatus('unavailable');
      setShowSetupGuide(true);
    }
  };

  const startWiki = () => {
    setShowSetupGuide(true);
  };

  const openWiki = () => {
    const wikiUrl = import.meta.env.VITE_WIKI_URL || process.env.WIKI_URL;
    if (wikiUrl) {
      window.open(wikiUrl, '_blank');
    } else {
      // Fallback to local proxy if no external URL configured
      window.open('/wiki', '_blank');
    }
  };

  const quickLinks = [
    {
      title: "Employee Handbook",
      description: "Company policies, procedures, and guidelines",
      icon: BookOpen,
      category: "HR"
    },
    {
      title: "API Documentation", 
      description: "Internal API docs and integration guides",
      icon: FileText,
      category: "Tech"
    },
    {
      title: "Sales Playbook",
      description: "Sales processes, scripts, and best practices", 
      icon: BookOpen,
      category: "Sales"
    },
    {
      title: "Client Onboarding",
      description: "Step-by-step client setup procedures",
      icon: FileText,
      category: "Operations"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="relative mb-8">
          {/* Back Button */}
          <div className="absolute top-0 left-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
                setLocation('/');
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Portal
            </Button>
          </div>

          {/* User Menu */}
          <div className="absolute top-0 right-0 flex items-center gap-4">
            <Button variant="ghost" size="sm" className="relative p-2 hover:bg-white/10 text-white">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-orange-500 rounded-full"></span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 p-2 hover:bg-white/10 text-white">
                  {user?.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt="Profile" 
                      className="w-7 h-7 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <div className="px-3 py-2 border-b">
                  <p className="font-medium text-gray-900 text-sm">{user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <DropdownMenuItem 
                  onClick={() => setLocation('/profile')}
                  className="text-sm cursor-pointer"
                >
                  <User className="mr-2 h-3 w-3" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-sm">
                  <Settings className="mr-2 h-3 w-3" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
                    setLocation('/auth');
                  }} 
                  className="cursor-pointer text-red-600 text-sm"
                >
                  <LogOut className="mr-2 h-3 w-3" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <div className="flex justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2">Knowledge Base</h1>
              <p className="text-white/80">Company documentation and resources</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Wiki Status Card */}
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/20 rounded-lg">
                    <BookOpen className="h-6 w-6 text-orange-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Wiki.js Knowledge Base</h3>
                    <div className="flex items-center gap-2">
                      {wikiStatus === 'loading' && (
                        <>
                          <Loader2 className="h-4 w-4 text-white animate-spin" />
                          <span className="text-white/80">Checking status...</span>
                        </>
                      )}
                      {wikiStatus === 'available' && (
                        <>
                          <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                          <span className="text-white/80">Wiki.js is running and available</span>
                        </>
                      )}
                      {wikiStatus === 'unavailable' && (
                        <>
                          <div className="h-2 w-2 bg-red-400 rounded-full"></div>
                          <span className="text-white/80">Wiki.js is not running</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {wikiStatus === 'available' && (
                    <Button onClick={openWiki} className="bg-orange-500 hover:bg-orange-600 text-white">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Wiki
                    </Button>
                  )}
                  {wikiStatus === 'unavailable' && (
                    <Button onClick={startWiki} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                      <Play className="h-4 w-4 mr-2" />
                      Setup Guide
                    </Button>
                  )}
                  <Button 
                    onClick={checkWikiStatus} 
                    variant="outline" 
                    className="border-white/30 text-white hover:bg-white/10"
                    disabled={wikiStatus === 'loading'}
                  >
                    {wikiStatus === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Setup Guide */}
          {showSetupGuide && (
            <Card className="bg-white/10 backdrop-blur-lg border border-white/20">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-orange-300" />
                  <h3 className="text-lg font-semibold text-white">Wiki.js Setup Guide</h3>
                </div>
                <div className="space-y-4 text-white/80">
                  <div className="bg-black/20 rounded-lg p-4">
                    <p className="font-medium text-white mb-2">Deploy Wiki.js on Vercel (Recommended):</p>
                    <div className="space-y-2 text-sm">
                      <p><strong>1.</strong> Go to <a href="https://vercel.com/templates" target="_blank" className="text-orange-300 hover:text-orange-200 underline">vercel.com/templates</a></p>
                      <p><strong>2.</strong> Search for "Wiki.js" and click "Deploy"</p>
                      <p><strong>3.</strong> Connect your GitHub account and deploy</p>
                      <p><strong>4.</strong> Add a PostgreSQL database (Vercel Postgres recommended)</p>
                      <p><strong>5.</strong> Configure environment variables:</p>
                      <div className="bg-black/40 rounded p-3 font-mono text-xs ml-4">
                        <p>DB_TYPE=postgres</p>
                        <p>DB_HOST=your-db-host</p>
                        <p>DB_USER=your-db-user</p>
                        <p>DB_PASS=your-db-password</p>
                        <p>DB_NAME=wiki</p>
                      </div>
                      <p><strong>6.</strong> Once deployed, add your Wiki.js URL to environment variables:</p>
                      <div className="bg-black/40 rounded p-3 font-mono text-xs ml-4">
                        <p>VITE_WIKI_URL=https://your-wiki.vercel.app</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <p className="text-orange-200 font-medium mb-2">💡 Why Vercel?</p>
                    <p className="text-sm">Vercel hosting avoids Docker requirements, provides SSL, and integrates seamlessly with your portal. Most plans include free PostgreSQL for small teams.</p>
                  </div>
                  <Button 
                    onClick={() => setShowSetupGuide(false)} 
                    variant="outline" 
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Close Guide
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Links */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Quick Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quickLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <Card key={index} className="bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition-colors cursor-pointer">
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                          <Icon className="h-5 w-5 text-orange-300" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{link.title}</h3>
                            <Badge variant="outline" className="border-white/30 text-white/70 text-xs">
                              {link.category}
                            </Badge>
                          </div>
                          <p className="text-white/70 text-sm">{link.description}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-white/40" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Search Section */}
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Search className="h-5 w-5 text-orange-300" />
                <h3 className="text-lg font-semibold text-white">Search Knowledge Base</h3>
              </div>
              <p className="text-white/70 mb-4">
                Use the Wiki.js search to find documentation, procedures, and company information.
              </p>
              <Button 
                onClick={wikiStatus === 'available' ? openWiki : startWiki}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={wikiStatus === 'loading'}
              >
                <Search className="h-4 w-4 mr-2" />
                {wikiStatus === 'available' ? 'Search Wiki' : 'Setup Wiki First'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}