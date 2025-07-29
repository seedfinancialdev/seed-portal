import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Search, 
  BookOpen, 
  Calculator, 
  TrendingUp,
  BrainCircuit,
  Target,
  Shield,
  Wrench,
  Heart,
  Compass,
  Folder,
  Settings,
  Eye,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";
import logoPath from "@assets/Nav Logo_1753431362883.png";
import { apiRequest } from "@/lib/queryClient";

// Types
interface KbCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KbArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  categoryId: number;
  authorId: number;
  status: string;
  featured: boolean;
  tags: string[] | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

// Icon mapping for dynamic icons
const iconMap: Record<string, any> = {
  'compass': Compass,
  'calculator': Calculator,
  'book-open': BookOpen,
  'trending-up': TrendingUp,
  'brain-circuit': BrainCircuit,
  'target': Target,
  'shield': Shield,
  'wrench': Wrench,
  'heart': Heart,
  'folder': Folder
};

export default function KnowledgeBase() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KbCategory | null>(null);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/kb/categories"],
  });

  // Fetch articles for selected category
  const { data: categoryArticles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["/api/kb/articles", selectedCategory?.id],
    queryFn: () => {
      if (!selectedCategory) return Promise.resolve([]);
      return apiRequest("GET", `/api/kb/articles?categoryId=${selectedCategory.id}&status=published`).then(res => res.json());
    },
    enabled: !!selectedCategory,
  });

  // Search articles
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["/api/kb/search", searchQuery],
    queryFn: () => {
      if (!searchQuery || searchQuery.length < 2) return Promise.resolve([]);
      return apiRequest("GET", `/api/kb/search?q=${encodeURIComponent(searchQuery)}`).then(res => res.json());
    },
    enabled: searchQuery.length >= 2,
  });

  const handleCategoryClick = (category: KbCategory) => {
    setSelectedCategory(category);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Folder;
    return IconComponent;
  };

  const handleLogout = async () => {
    await logout();
  };

  // Main categories view
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="relative mb-8">
            <div className="absolute top-0 left-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
                onClick={() => setLocation('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Portal
              </Button>
            </div>
            
            <div className="absolute top-0 right-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20">
                    <User className="h-4 w-4 mr-2" />
                    {user?.firstName || user?.email?.split('@')[0] || 'User'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setLocation('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/kb-admin')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Knowledge Base Admin</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
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

          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'League Spartan, sans-serif' }}>
              SEED<span style={{ color: '#e24c00' }}>KB</span>
            </h1>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
              <Input
                placeholder="Search knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg bg-white/15 backdrop-blur-md border-white/30 placeholder:text-white/60 text-white focus:bg-white/20 focus:border-white/50"
                onClick={() => setIsSearchDialogOpen(true)}
              />
            </div>
            
            {/* Search Results Dialog */}
            <Dialog open={isSearchDialogOpen && searchQuery.length >= 2} onOpenChange={setIsSearchDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Search Results</DialogTitle>
                </DialogHeader>
                
                {searchLoading ? (
                  <div className="text-center py-8">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No articles found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searchResults.map((article: KbArticle) => (
                      <Card key={article.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                            {article.excerpt && (
                              <p className="text-gray-600 text-sm mb-3">{article.excerpt}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {article.viewCount} views
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(article.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categoriesLoading ? (
              <div className="col-span-full text-center text-white">Loading categories...</div>
            ) : (
              categories.map((category: KbCategory) => {
                const IconComponent = getIconComponent(category.icon);
                return (
                  <Card
                    key={category.id}
                    className="h-80 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-white/15 backdrop-blur-md border-white/30 hover:bg-white/20 hover:border-orange-500/50"
                    onClick={() => handleCategoryClick(category)}
                  >
                    <div className="p-8 h-full flex flex-col items-center justify-center text-center">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-6 shadow-lg`}>
                        <IconComponent className="h-10 w-10 text-white" />
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-4">
                        {category.name}
                      </h3>
                      
                      <p className="text-white/80 text-sm leading-relaxed">
                        {category.description}
                      </p>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Coming Soon Features */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold text-white mb-8">🚀 Coming Soon: Advanced AI Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-2">AI Search Copilot</h3>
                <p className="text-white/70 text-sm">Natural language search with intelligent recommendations</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-2">Visual SOP Maps</h3>
                <p className="text-white/70 text-sm">Interactive flowcharts for complex processes</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-2">Decision Trees</h3>
                <p className="text-white/70 text-sm">AI-guided decision making for tax and financial strategies</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-2">Auto-SOP Generator</h3>
                <p className="text-white/70 text-sm">AI creates step-by-step procedures from descriptions</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-2">Smart Tagging</h3>
                <p className="text-white/70 text-sm">Automatic content categorization and cross-referencing</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-2">Finance Meme Wall</h3>
                <p className="text-white/70 text-sm">AI-curated humor for team culture and client engagement</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Category articles view
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="relative mb-8">
          <div className="absolute top-0 left-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
              onClick={handleBackToCategories}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Categories
            </Button>
          </div>
          
          <div className="absolute top-0 right-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20">
                  <User className="h-4 w-4 mr-2" />
                  {user?.firstName || user?.email?.split('@')[0] || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setLocation('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/kb-admin')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Knowledge Base Admin</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
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

        {/* Category Header */}
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selectedCategory.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
            {(() => {
              const IconComponent = getIconComponent(selectedCategory.icon);
              return <IconComponent className="h-10 w-10 text-white" />;
            })()}
          </div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'League Spartan, sans-serif' }}>
            {selectedCategory.name}
          </h1>
          <p className="text-white/80 text-lg">
            {selectedCategory.description}
          </p>
        </div>

        {/* Articles */}
        <Card className="bg-white/15 backdrop-blur-md border-white/30">
          <div className="p-8">
            {articlesLoading ? (
              <div className="text-center text-white py-8">Loading articles...</div>
            ) : categoryArticles.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-16 w-16 text-white/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Articles Yet</h3>
                <p className="text-white/70 mb-6">
                  This category doesn't have any published articles yet.
                </p>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => setLocation('/kb-admin')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categoryArticles.map((article: KbArticle) => (
                  <Card key={article.id} className="bg-white/10 border-white/20 hover:bg-white/15 transition-colors cursor-pointer">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-white/70 text-sm mb-4">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-white/60">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.viewCount} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(article.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {article.featured && (
                          <Badge variant="outline" className="border-orange-500 text-orange-200">
                            Featured
                          </Badge>
                        )}
                      </div>
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {article.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs border-white/30 text-white/70">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}