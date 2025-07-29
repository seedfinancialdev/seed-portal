import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Wand2, 
  FileText, 
  Users, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  RefreshCw,
  Lightbulb,
  Target,
  Zap,
  BookOpen,
  Settings,
  Save,
  Download
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Types and interfaces
interface Template {
  id: string;
  name: string;
  structure: string[];
  variables: string[];
}

interface GenerationStep {
  step: 'outline' | 'draft' | 'polish';
  content: string;
  suggestions?: string[];
  nextSteps?: string[];
}

interface ContentAnalysis {
  brandFitScore: number;
  readabilityLevel: string;
  complianceChecks: string[];
  suggestions: string[];
  missingElements: string[];
}

// Form schema
const generatorSchema = z.object({
  templateType: z.string().min(1, "Template type is required"),
  title: z.string().min(1, "Title is required"),
  categoryId: z.number().min(1, "Category is required"),
  audience: z.enum(["internal", "client", "sales"]),
  tone: z.enum(["professional", "friendly", "technical"]).default("professional"),
  length: z.enum(["brief", "standard", "comprehensive"]).default("standard"),
  includeCompliance: z.boolean().default(true),
  customRequirements: z.string().optional(),
  variables: z.string().optional(), // JSON string of variables
});

type GeneratorFormData = z.infer<typeof generatorSchema>;

interface AIArticleGeneratorProps {
  categories: Array<{ id: number; name: string; }>;
  onArticleGenerated: (article: { title: string; content: string; categoryId: number; }) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AIArticleGenerator({ categories, onArticleGenerated, isOpen, onClose }: AIArticleGeneratorProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<'setup' | 'outline' | 'draft' | 'polish' | 'versions'>('setup');
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null);
  const [audienceVersions, setAudienceVersions] = useState<Record<string, string>>({});

  // Fetch available templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/kb/ai/templates"],
    enabled: isOpen,
  });

  // Form setup
  const form = useForm<GeneratorFormData>({
    resolver: zodResolver(generatorSchema),
    defaultValues: {
      templateType: "",
      title: "",
      categoryId: 0,
      audience: "internal",
      tone: "professional",
      length: "standard",
      includeCompliance: true,
      customRequirements: "",
      variables: "",
    },
  });

  // Mutations for different generation steps
  const generateOutlineMutation = useMutation({
    mutationFn: async (data: GeneratorFormData) => {
      const variables = data.variables ? JSON.parse(data.variables) : {};
      const payload = { ...data, variables };
      return apiRequest("/api/kb/ai/generate-outline", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: (result: GenerationStep) => {
      setGeneratedContent(prev => ({ ...prev, outline: result.content }));
      setCurrentStep('outline');
      toast({
        title: "Outline Generated",
        description: "Your article outline is ready for review",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate outline",
        variant: "destructive",
      });
    },
  });

  const generateDraftMutation = useMutation({
    mutationFn: async ({ outline, ...data }: GeneratorFormData & { outline?: string }) => {
      const variables = data.variables ? JSON.parse(data.variables) : {};
      const payload = { ...data, variables, outline };
      return apiRequest("/api/kb/ai/generate-draft", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: (result: GenerationStep) => {
      setGeneratedContent(prev => ({ ...prev, draft: result.content }));
      setCurrentStep('draft');
      toast({
        title: "Draft Generated",
        description: "Your article draft is ready for review",
      });
    },
  });

  const polishMutation = useMutation({
    mutationFn: async ({ draft, ...data }: GeneratorFormData & { draft: string }) => {
      const variables = data.variables ? JSON.parse(data.variables) : {};
      const payload = { ...data, variables, draft };
      return apiRequest("/api/kb/ai/polish", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: (result: GenerationStep) => {
      setGeneratedContent(prev => ({ ...prev, polished: result.content }));
      setCurrentStep('polish');
      toast({
        title: "Article Polished",
        description: "Your article has been refined and is ready for publication",
      });
    },
  });

  const analyzeContentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("/api/kb/ai/analyze", { method: "POST", body: JSON.stringify({ content }) });
    },
    onSuccess: (result: ContentAnalysis) => {
      setContentAnalysis(result);
    },
  });

  const generateVersionsMutation = useMutation({
    mutationFn: async ({ baseContent, ...data }: GeneratorFormData & { baseContent: string }) => {
      const variables = data.variables ? JSON.parse(data.variables) : {};
      const payload = { ...data, variables, baseContent };
      return apiRequest("/api/kb/ai/generate-versions", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: (result: Record<string, string>) => {
      setAudienceVersions(result);
      setCurrentStep('versions');
      toast({
        title: "Versions Generated",
        description: "Multiple audience versions have been created",
      });
    },
  });

  // Handlers
  const handleTemplateSelect = (templateId: string) => {
    const template = (templates as Template[]).find((t: Template) => t.id === templateId);
    setSelectedTemplate(template || null);
    form.setValue('templateType', templateId);
  };

  const handleGenerateOutline = (data: GeneratorFormData) => {
    generateOutlineMutation.mutate(data);
  };

  const handleGenerateDraft = () => {
    const formData = form.getValues();
    generateDraftMutation.mutate({ 
      ...formData, 
      outline: generatedContent.outline 
    });
  };

  const handlePolishArticle = () => {
    const formData = form.getValues();
    polishMutation.mutate({ 
      ...formData, 
      draft: generatedContent.draft 
    });
  };

  const handleAnalyzeContent = (content: string) => {
    analyzeContentMutation.mutate(content);
  };

  const handleGenerateVersions = () => {
    const formData = form.getValues();
    const content = generatedContent.polished || generatedContent.draft;
    if (content) {
      generateVersionsMutation.mutate({ 
        ...formData, 
        baseContent: content 
      });
    }
  };

  const handleSaveArticle = (content: string) => {
    const formData = form.getValues();
    onArticleGenerated({
      title: formData.title,
      content,
      categoryId: formData.categoryId,
    });
    onClose();
    resetGenerator();
  };

  const resetGenerator = () => {
    setCurrentStep('setup');
    setGeneratedContent({});
    setSelectedTemplate(null);
    setContentAnalysis(null);
    setAudienceVersions({});
    form.reset();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-orange-500" />
            AI Knowledge Base Article Generator
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="setup" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Setup
            </TabsTrigger>
            <TabsTrigger value="outline" disabled={!generatedContent.outline} className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Outline
            </TabsTrigger>
            <TabsTrigger value="draft" disabled={!generatedContent.draft} className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              Draft
            </TabsTrigger>
            <TabsTrigger value="polish" disabled={!generatedContent.polished} className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              Polish
            </TabsTrigger>
            <TabsTrigger value="versions" disabled={!audienceVersions.internal} className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Versions
            </TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleGenerateOutline)} className="space-y-6">
                
                {/* Template Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Choose Template
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {templatesLoading ? (
                      <div className="text-center py-4">Loading templates...</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(templates as Template[]).map((template: Template) => (
                          <Card 
                            key={template.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedTemplate?.id === template.id ? 'ring-2 ring-orange-500' : ''
                            }`}
                            onClick={() => handleTemplateSelect(template.id)}
                          >
                            <CardContent className="p-4">
                              <h4 className="font-semibold mb-2">{template.name}</h4>
                              <div className="space-y-1">
                                <p className="text-sm text-gray-600">Structure:</p>
                                {template.structure.slice(0, 3).map((section, index) => (
                                  <Badge key={index} variant="outline" className="mr-1 mb-1 text-xs">
                                    {section}
                                  </Badge>
                                ))}
                                {template.structure.length > 3 && (
                                  <span className="text-xs text-gray-500">+{template.structure.length - 3} more</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Article Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Article Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Article Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., How to Handle Year-End Bookkeeping" {...field} />
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
                                {categories.map((category) => (
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="audience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Audience</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="internal">Internal Team</SelectItem>
                                <SelectItem value="client">Client-Facing</SelectItem>
                                <SelectItem value="sales">Sales Material</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tone</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="friendly">Friendly</SelectItem>
                                <SelectItem value="technical">Technical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="length"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Length</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="brief">Brief</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="comprehensive">Comprehensive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="customRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Requirements (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any specific requirements, examples to include, or special instructions..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Template Variables */}
                    {selectedTemplate && selectedTemplate.variables.length > 0 && (
                      <FormField
                        control={form.control}
                        name="variables"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Variables</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder={`Available variables: ${selectedTemplate.variables.join(', ')}\n\nProvide values in JSON format:\n{\n  "industry": "Technology",\n  "state": "California",\n  "entity_type": "LLC"\n}`}
                                className="min-h-[120px] font-mono text-sm"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="includeCompliance"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Include compliance disclaimers and legal notices</FormLabel>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-orange-500 hover:bg-orange-600"
                    disabled={generateOutlineMutation.isPending || !selectedTemplate}
                  >
                    {generateOutlineMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Generate Outline
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Outline Tab */}
          <TabsContent value="outline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Outline</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedContent.outline || '')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleGenerateDraft}
                      disabled={generateDraftMutation.isPending}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {generateDraftMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Generate Draft"
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{generatedContent.outline}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Draft Tab */}
          <TabsContent value="draft" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Draft</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAnalyzeContent(generatedContent.draft || '')}
                      disabled={analyzeContentMutation.isPending}
                    >
                      {analyzeContentMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Analyze
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedContent.draft || '')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePolishArticle}
                      disabled={polishMutation.isPending}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {polishMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Polish Article"
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contentAnalysis && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Content Analysis
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>Brand Fit Score:</strong> {contentAnalysis.brandFitScore}/5</p>
                          <p><strong>Reading Level:</strong> {contentAnalysis.readabilityLevel}</p>
                        </div>
                        <div>
                          <p><strong>Compliance:</strong> {contentAnalysis.complianceChecks.length} checks</p>
                          <p><strong>Suggestions:</strong> {contentAnalysis.suggestions.length} items</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">{generatedContent.draft}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Polish Tab */}
          <TabsContent value="polish" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Polished Article</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedContent.polished || '')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleGenerateVersions}
                      disabled={generateVersionsMutation.isPending}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      {generateVersionsMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Create Versions"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveArticle(generatedContent.polished || '')}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save Article
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">{generatedContent.polished}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {Object.entries(audienceVersions).map(([audience, content]) => (
                <Card key={audience}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="capitalize">{audience} Version</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(content)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveArticle(content)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-3 rounded text-xs max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{content}</pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}