import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Edit2, Trash2, BookOpen, Users, Search, Bookmark, Wand2, Sparkles, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AIArticleGenerator } from "@/components/AIArticleGenerator";
import { RichTextEditor } from "@/components/RichTextEditor";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

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

// Form schemas
const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  excerpt: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  categoryId: z.number().min(1, "Category is required"),
  status: z.enum(["draft", "published", "archived"]),
  featured: z.boolean().default(false),
  tags: z.string().optional(),
});

type ArticleFormData = z.infer<typeof articleSchema>;

export default function KbAdmin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { googleUser: user, isLoading: authLoading } = useGoogleAuth();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KbArticle | null>(null);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);

  // Fetch categories - only when authenticated
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/kb/categories"],
    enabled: !!user,
  });

  // Fetch articles - only when authenticated
  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["/api/kb/articles", selectedCategory],
    queryFn: async () => {
      const params = selectedCategory ? `?categoryId=${selectedCategory}` : '';
      return apiRequest(`/api/kb/articles${params}`);
    },
    enabled: !!user,
  });



  // Article form
  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      content: "",
      categoryId: selectedCategory || undefined,
      status: "draft",
      featured: false,
      tags: "",
    },
  });

  // Create article mutation
  const createArticleMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      };
      return apiRequest("/api/kb/articles", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      setIsArticleDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Article created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create article",
        variant: "destructive",
      });
    },
  });

  // Update article mutation
  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ArticleFormData> }) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      };
      return apiRequest(`/api/kb/articles/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      setIsArticleDialogOpen(false);
      setEditingArticle(null);
      form.reset();
      toast({
        title: "Success",
        description: "Article updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update article",
        variant: "destructive",
      });
    },
  });

  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/kb/articles/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kb/articles"] });
      toast({
        title: "Success",
        description: "Article deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete article",
        variant: "destructive",
      });
    },
  });

  // Generate metadata mutation
  const generateMetadataMutation = useMutation({
    mutationFn: async (data: { content: string; title: string }) => {
      const response = await apiRequest('/api/kb/ai/generate-metadata', {
        method: 'POST',  
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: (data: { excerpt: string; tags: string[] }) => {
      form.setValue('excerpt', data.excerpt);
      form.setValue('tags', data.tags.join(', '));
      toast({
        title: "Metadata Generated",
        description: "Excerpt and tags have been auto-generated based on your content.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate metadata",
        variant: "destructive",
      });
    },
  });

  const handleGenerateExcerpt = () => {
    const content = form.getValues('content');
    const title = form.getValues('title');
    if (content && title) {
      generateMetadataMutation.mutate({ content, title });
    }
  };

  const handleCreateArticle = (data: ArticleFormData) => {
    // Generate base slug from title
    const baseSlug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
    
    // Ensure unique slug by adding timestamp suffix
    const timestamp = Date.now();
    const uniqueSlug = `${baseSlug}-${timestamp}`;
    
    const articleData = {
      ...data,
      slug: uniqueSlug
    };
    
    createArticleMutation.mutate(articleData);
  };

  const handleUpdateArticle = (data: ArticleFormData) => {
    if (editingArticle) {
      updateArticleMutation.mutate({ id: editingArticle.id, data });
    }
  };

  const handleEditArticle = (article: KbArticle) => {
    setEditingArticle(article);
    form.reset({
      title: article.title,
      excerpt: article.excerpt || "",
      content: article.content,
      categoryId: article.categoryId,
      status: article.status as "draft" | "published" | "archived",
      featured: article.featured,
      tags: article.tags?.join(', ') || "",
    });
    setIsArticleDialogOpen(true);
  };

  const handleDeleteArticle = (id: number) => {
    if (confirm("Are you sure you want to delete this article?")) {
      deleteArticleMutation.mutate(id);
    }
  };

  const openNewArticleDialog = () => {
    setEditingArticle(null);
    form.reset({
      title: "",
      excerpt: "",
      content: "",
      categoryId: selectedCategory || undefined,
      status: "draft",
      featured: false,
      tags: "",
    });
    setIsArticleDialogOpen(true);
  };

  const handleAIArticleGenerated = (article: { title: string; content: string; categoryId: number; }) => {
    // Pre-populate the regular form with AI-generated content
    setEditingArticle(null);
    form.reset({
      title: article.title,
      excerpt: "",
      content: article.content,
      categoryId: article.categoryId,
      status: "draft",
      featured: false,
      tags: "",
    });
    setIsArticleDialogOpen(true);
    setIsAIGeneratorOpen(false);
  };

  // Show loading state while authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

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
              onClick={() => setLocation('/admin')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Admin Dashboard
            </Button>
          </div>
          
          <div className="absolute top-0 right-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
              onClick={() => setLocation('/knowledge-base')}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              View Knowledge Base
            </Button>
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            Knowledge Base Admin
          </h1>
          <p className="text-white/80 text-lg">
            Manage articles, categories, and content for SEEDKB
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Categories Card */}
            <Card className="bg-white/15 backdrop-blur-md border-white/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-white hover:text-white hover:bg-white/20 ${
                    selectedCategory === null ? 'bg-orange-500/80 hover:bg-orange-500 text-white font-semibold' : ''
                  }`}
                  onClick={() => setSelectedCategory(null)}
                >
                  All Articles
                </Button>
                {(categories as KbCategory[]).map((category: KbCategory) => (
                  <Button
                    key={category.id}
                    variant="ghost"
                    className={`w-full justify-start text-white hover:text-white hover:bg-white/20 ${
                      selectedCategory === category.id ? 'bg-orange-500/80 hover:bg-orange-500 text-white font-semibold' : ''
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="bg-white/15 backdrop-blur-md border-white/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    {selectedCategory 
                      ? (categories as KbCategory[]).find((c: KbCategory) => c.id === selectedCategory)?.name 
                      : "All Articles"
                    }
                  </CardTitle>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setIsAIGeneratorOpen(true)}
                      className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-semibold shadow-md"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Article
                    </Button>
                    <Dialog open={isArticleDialogOpen} onOpenChange={setIsArticleDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={openNewArticleDialog}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Article
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingArticle ? "Edit Article" : "Create New Article"}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(editingArticle ? handleUpdateArticle : handleCreateArticle)} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Article title" {...field} />
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
                                  <Select
                                    value={field.value?.toString()}
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {(categories as KbCategory[]).map((category: KbCategory) => (
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
                          </div>

                          <FormField
                            control={form.control}
                            name="excerpt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center justify-between">
                                  Excerpt
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleGenerateExcerpt}
                                    disabled={generateMetadataMutation.isPending || !form.getValues('content') || !form.getValues('title')}
                                    className="text-xs"
                                  >
                                    {generateMetadataMutation.isPending ? (
                                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <Sparkles className="h-3 w-3 mr-1" />
                                    )}
                                    Auto Generate
                                  </Button>
                                </FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Brief summary of the article" {...field} />
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
                                  <RichTextEditor
                                    content={field.value}
                                    onChange={field.onChange}
                                    placeholder="Start writing your article content..."
                                    height={400}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="draft">Draft</SelectItem>
                                      <SelectItem value="published">Published</SelectItem>
                                      <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="tags"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center justify-between">
                                    Tags
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={handleGenerateExcerpt}
                                      disabled={generateMetadataMutation.isPending || !form.getValues('content') || !form.getValues('title')}
                                      className="text-xs"
                                    >
                                      {generateMetadataMutation.isPending ? (
                                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                      ) : (
                                        <Sparkles className="h-3 w-3 mr-1" />
                                      )}
                                      Auto Generate
                                    </Button>
                                  </FormLabel>
                                  <FormControl>
                                    <Input placeholder="tag1, tag2, tag3" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex items-end">
                              <FormField
                                control={form.control}
                                name="featured"
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                      <input
                                        type="checkbox"
                                        checked={field.value}
                                        onChange={field.onChange}
                                        className="rounded border border-gray-300"
                                      />
                                    </FormControl>
                                    <FormLabel className="!mt-0">Featured Article</FormLabel>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsArticleDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              className="bg-orange-500 hover:bg-orange-600"
                              disabled={createArticleMutation.isPending || updateArticleMutation.isPending}
                            >
                              {editingArticle ? "Update Article" : "Create Article"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {articlesLoading ? (
                  <div className="text-white text-center py-8">Loading articles...</div>
                ) : articles.length === 0 ? (
                  <div className="text-white/70 text-center py-8">
                    No articles found. Create your first article to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {articles.map((article: KbArticle) => (
                      <Card key={article.id} className="bg-white border-gray-200 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {article.title}
                              </h3>
                              {article.excerpt && (
                                <p className="text-gray-600 text-sm mb-3">
                                  {article.excerpt}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <Badge 
                                  variant={article.status === 'published' ? 'default' : 'secondary'}
                                  className={article.status === 'published' ? 'bg-green-500' : ''}
                                >
                                  {article.status}
                                </Badge>
                                {article.featured && (
                                  <Badge variant="outline" className="border-orange-500 text-orange-600">
                                    Featured
                                  </Badge>
                                )}
                                <span>{article.viewCount} views</span>
                                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                              </div>
                              {article.tags && article.tags.length > 0 && (
                                <div className="flex gap-2 mt-2">
                                  {article.tags.map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs border-gray-300 text-gray-600">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-600 hover:text-gray-900"
                                onClick={() => handleEditArticle(article)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteArticle(article.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Article Generator Component */}
        <AIArticleGenerator
          categories={categories as KbCategory[]}
          onArticleGenerated={handleAIArticleGenerated}
          isOpen={isAIGeneratorOpen}
          onClose={() => setIsAIGeneratorOpen(false)}
        />
      </div>
    </div>
  );
}