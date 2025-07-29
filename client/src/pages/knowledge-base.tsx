import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  BookOpen, 
  FileText, 
  Search,
  Plus,
  Star,
  Eye,
  Bookmark,
  Users,
  TrendingUp,
  Settings as SettingsIcon,
  Code,
  UserCheck,
  ShieldCheck,
  Filter,
  Clock,
  Edit,
  Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, User, Settings, LogOut } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { KbCategory, KbArticle } from "@shared/schema";

// Form schemas
const articleFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  excerpt: z.string().min(1, "Excerpt is required"),
  content: z.string().min(1, "Content is required"),
  categoryId: z.string().min(1, "Category is required"),
  status: z.enum(["draft", "published"]),
  featured: z.boolean().default(false),
  tags: z.string().optional()
});

const categoryIconMap = {
  'users': Users,
  'trending-up': TrendingUp,
  'settings': SettingsIcon,
  'code': Code,
  'user-check': UserCheck,
  'shield-check': ShieldCheck
} as const;

export default function KnowledgeBase() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/kb/categories'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch articles
  const { data: articles = [], isLoading: articlesLoading, refetch: refetchArticles } = useQuery({
    queryKey: ['/api/kb/articles', selectedCategory],
    queryFn: () => apiRequest(`/api/kb/articles${selectedCategory ? `?categoryId=${selectedCategory}` : ''}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Search articles
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['/api/kb/search', searchQuery],
    queryFn: () => apiRequest(`/api/kb/search?q=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Create article form
  const form = useForm<z.infer<typeof articleFormSchema>>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      content: "",
      categoryId: "",
      status: "draft",
      featured: false,
      tags: ""
    }
  });

  // Create article mutation
  const createArticleMutation = useMutation({
    mutationFn: (data: z.infer<typeof articleFormSchema>) => {
      const payload = {
        ...data,
        categoryId: parseInt(data.categoryId),
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      };
      return apiRequest('/api/kb/articles', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      toast({ title: "Article created successfully" });
      setShowCreateDialog(false);
      form.reset();
      refetchArticles();
      queryClient.invalidateQueries({ queryKey: ['/api/kb/categories'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create article", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleLogout = async () => {
    try {
      await logout();
      queryClient.clear();
      setLocation("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleCreateArticle = (data: z.infer<typeof articleFormSchema>) => {
    createArticleMutation.mutate(data);
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = categoryIconMap[iconName as keyof typeof categoryIconMap] || BookOpen;
    return IconComponent;
  };

  const displayedArticles = searchQuery.length >= 2 ? searchResults : articles;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      {/* Navigation Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"  
            onClick={() => {
              queryClient.invalidateQueries();
              setLocation("/");
            }}
            className="text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </Button>
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium">
              {user?.firstName?.[0] || user?.email?.[0] || 'U'}
            </div>
            <span className="font-medium">{user?.firstName || user?.email}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setLocation("/profile")}>
                <Settings className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Search and Actions */}
          <div className="mb-8">
            <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    placeholder="Search knowledge base..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/60"
                  />
                </div>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      New Article
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Article</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleCreateArticle)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter article title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((category: KbCategory) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="excerpt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Excerpt</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Brief summary of the article" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Article content (Markdown supported)" 
                                  className="min-h-[200px]"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter tags separated by commas" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-center justify-between">
                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button 
                            type="submit" 
                            disabled={createArticleMutation.isPending}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {createArticleMutation.isPending ? "Creating..." : "Create Article"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          </div>

          {/* Categories Filter */}
          {!searchQuery && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className={`${selectedCategory === null ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                >
                  All Categories
                </Button>
                {categories.map((category: KbCategory) => {
                  const IconComponent = getCategoryIcon(category.icon);
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      className={`${selectedCategory === category.id ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      {category.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Articles Display */}
          <div className="space-y-4">
            {articlesLoading || searchLoading ? (
              <div className="text-center text-white/70 py-12">
                Loading articles...
              </div>
            ) : displayedArticles.length === 0 ? (
              <div className="text-center text-white/70 py-12">
                {searchQuery ? "No articles found matching your search." : "No articles available."}
              </div>
            ) : (
              displayedArticles.map((article: KbArticle) => {
                const category = categories.find((cat: KbCategory) => cat.id === article.categoryId);
                const IconComponent = category ? getCategoryIcon(category.icon) : BookOpen;
                
                return (
                  <Card key={article.id} className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          {article.featured && (
                            <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {category && (
                            <Badge variant="outline" className="text-white/70 border-white/30">
                              <IconComponent className="h-3 w-3 mr-1" />
                              {category.name}
                            </Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`${article.status === 'published' ? 'text-green-300 border-green-500/30' : 'text-yellow-300 border-yellow-500/30'}`}
                          >
                            {article.status}
                          </Badge>
                        </div>
                        
                        <h3 className="text-xl font-semibold text-white mb-2 cursor-pointer hover:text-orange-300 transition-colors">
                          {article.title}
                        </h3>
                        
                        <p className="text-white/70 text-sm mb-4">
                          {article.excerpt}
                        </p>

                        {article.tags && article.tags.length > 0 && (
                          <div className="flex items-center gap-2 mb-4">
                            {article.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-white/60 border-white/20">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-6 text-white/60 text-sm">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{article.viewCount || 0} views</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(article.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>Author</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                          <Bookmark className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}