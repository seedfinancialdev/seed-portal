import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Search, 
  BookOpen, 
  Calculator, 
  PiggyBank, 
  Bot, 
  Phone, 
  Shield, 
  Wrench, 
  Heart,
  Sparkles,
  TrendingUp,
  Users,
  FileText,
  Target,
  BrainCircuit,
  Zap,
  Scale,
  Palette
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, User, Settings, LogOut } from "lucide-react";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

// Category data for the 9 cards
const categories = [
  {
    id: 1,
    title: "Getting Started Hub",
    description: "Quick-start guides for clients, partners, and internal teams",
    icon: Sparkles,
    color: "from-blue-500 to-cyan-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  {
    id: 2,
    title: "Tax-as-a-Service (TaaS)",
    description: "Playbooks, FAQs, and tax strategy explainers",
    icon: Calculator,
    color: "from-green-500 to-emerald-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  {
    id: 3,
    title: "Bookkeeping Academy",
    description: "Best practices, QBO hacks, and monthly close checklists",
    icon: PiggyBank,
    color: "from-purple-500 to-indigo-500",
    textColor: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  },
  {
    id: 4,
    title: "Fractional CFO Vault",
    description: "Cash-flow templates, scenario planning guides, fundraising resources",
    icon: TrendingUp,
    color: "from-orange-500 to-red-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200"
  },
  {
    id: 5,
    title: "Automation & AI Center",
    description: "n8n recipes, ClickUp templates, HubSpot workflows, AI prompt libraries",
    icon: Bot,
    color: "from-violet-500 to-purple-500",
    textColor: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200"
  },
  {
    id: 6,
    title: "Sales Playbook",
    description: "ICP criteria, outreach cadences, HubSpot playbooks, Seed Stories",
    icon: Target,
    color: "from-rose-500 to-pink-500",
    textColor: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200"
  },
  {
    id: 7,
    title: "Compliance + Legal",
    description: "Entity structuring, sales tax rules, R&D credit eligibility",
    icon: Shield,
    color: "from-slate-500 to-gray-500",
    textColor: "text-slate-600",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200"
  },
  {
    id: 8,
    title: "Toolbox",
    description: "Scenario simulators, tax calendar, case study builder & more",
    icon: Wrench,
    color: "from-amber-500 to-yellow-500",
    textColor: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200"
  },
  {
    id: 9,
    title: "Culture & Voice",
    description: "Brand tone, style guides, meme library for financial humor",
    icon: Heart,
    color: "from-pink-500 to-rose-500",
    textColor: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200"
  }
];

// AI Features coming soon
const aiFeatures = [
  { name: "AI Search Copilot", description: "Natural language search with direct answers", icon: BrainCircuit },
  { name: "Visual SOP Maps", description: "Interactive flowcharts and diagrams", icon: FileText },
  { name: "Decision Trees", description: "Choose Your Own Adventure style tools", icon: Zap },
  { name: "Auto-SOP Generator", description: "Convert recordings into structured SOPs", icon: Bot },
  { name: "Smart Tagging", description: "AI auto-tags content with relevant topics", icon: Sparkles },
  { name: "Finance Meme Wall", description: "Curated financial humor library", icon: Palette }
];

export default function KnowledgeBase() {
  const { user, logoutMutation } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] animate-in fade-in duration-700">
      {/* Header - Simple transparent design matching other portal pages */}
      <div className="bg-transparent">
        <div className="flex items-center justify-between px-6 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Portal
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            <img src={logoPath} alt="Seed Financial" className="h-8 w-auto" />
            <div className="text-white">
              <h1 className="text-lg font-semibold">SEED FINANCIAL</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 relative">
              <Bell className="h-4 w-4" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full animate-pulse"></div>
            </Button>
            
            <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center text-xs font-semibold text-white">
              {user?.email?.[0]?.toUpperCase() || 'J'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6 tracking-tight">
            Seed KB
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Welcome to Seed Financial's comprehensive knowledge base. Access everything from quick-start guides 
            and tax strategies to AI-powered tools and automation recipes. Your one-stop hub for financial expertise.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mt-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search knowledge base... (AI-powered search coming soon)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg bg-white/15 backdrop-blur-md border-white/30 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-white/50"
              />
            </div>
          </div>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Card 
                key={category.id}
                className={`group p-8 bg-white/15 backdrop-blur-md border-white/30 hover:bg-white/25 hover:border-white/50 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:scale-105 ${category.borderColor} aspect-square flex flex-col justify-center items-center text-center`}
              >
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${category.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-200 transition-colors">
                  {category.title}
                </h3>
                
                <p className="text-white/70 text-sm leading-relaxed group-hover:text-white/90 transition-colors">
                  {category.description}
                </p>

                <Badge className="mt-4 bg-orange-500/20 text-orange-200 border-orange-500/30 group-hover:bg-orange-500/30">
                  Coming Soon
                </Badge>
              </Card>
            );
          })}
        </div>

        {/* AI Features Preview */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">🚀 Advanced AI Features</h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              Powered by cutting-edge AI technology, these features will revolutionize how you interact with knowledge and automate workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card 
                  key={index}
                  className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">{feature.name}</h4>
                      <p className="text-white/70 text-sm">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12">
          <p className="text-white/60 text-sm">
            💡 This knowledge base is actively being built. Check back soon for new content and AI-powered features!
          </p>
        </div>
      </div>
    </div>
  );
}