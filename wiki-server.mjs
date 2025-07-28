#!/usr/bin/env node

/**
 * Simple Wiki.js-like server for Replit
 * Runs on port 3001 to integrate with the existing portal
 */

import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import MarkdownIt from 'markdown-it';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const md = new MarkdownIt();
const PORT = 3001;

// Create wiki data directory
const wikiDir = path.join(__dirname, 'wiki-data');
fs.ensureDirSync(wikiDir);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'wiki-public')));

// Create comprehensive knowledge base structure
const knowledgeSpaces = {
  'home.md': `# Seed Financial Knowledge Base
*Finance, but make it human* 🧠

Welcome to your comprehensive company knowledge hub. This system follows a **PostgreSQL + Git sync** model for critical content with code-like reviews and rollbacks.

## What This Is
Your single source of truth for all operational knowledge - from SOPs to playbooks, with smart search, full versioning, and editorial workflows.

## Content Types & Lifecycle
- **Draft** → **Review** → **Publish** → **Auto-stale at 90 days** → **Re-review**
- Templates: SOP, Playbook, Runbook, Policy, How-to, Checklist, ADR, Template, FAQ, Reference

## Quick Navigation
### 🎯 **Top Spaces** (10 Core Areas)
1. [Services (Your APIs)](#services) - TaaS, Bookkeeping, Fractional CFO, White-Label
2. [Client Operations](#client-ops) - Delivery machine workflows
3. [Industry Playbooks](#industry) - SaaS, Agencies, E-com, Real Estate, Creators  
4. [Chart of Accounts Library](#coa) - Standard & vertical variants
5. [AI & Automation](#automation) - n8n flows, HubSpot automations
6. [Sales & Marketing](#sales) - ICPs, messaging, objection handling
7. [Quality, Risk & Compliance](#compliance) - QA checklists, security policies
8. [People & Onboarding](#people) - Role guides, 30/60/90 plans
9. [Internal IT & Tooling](#it) - Access maps, SSO setup
10. [Glossary & KPI Library](#glossary) - Terms, formulas, screenshots

### ⚡ **Time-Savers** (Top 20 Tasks)
- [Monthly Close Checklist](monthly-close-checklist)
- [Client Onboarding SOP](client-onboarding-sop)  
- [QBO Setup Playbook](qbo-setup-playbook)
- [Tax Filing Calendar](tax-filing-calendar)
- [Sales Objection Scripts](sales-objection-scripts)

### 🔍 **Search Tips**
- Use synonyms: "QBO" = "QuickBooks", "TaaS" = "Tax as a Service"
- Tags: service/*, industry/*, stage/*, tool/*, type/*
- Full-text search with highlighted snippets enabled
`,
  'services.md': `# Services (Your "APIs")
*What we deliver, how we deliver it*

## TaaS (Tax-as-a-Service)
### What It Is
Full-service tax preparation, filing, and strategic planning for growing businesses.

### Good Fit / Not a Fit
**✅ Good Fit:** Multi-state businesses, complex entities, R&D credits, compliance-heavy industries  
**❌ Not a Fit:** Simple personal returns, one-off filings without ongoing relationship

### Core Components
- **Tax SWAT Hotline** - Emergency tax questions within 4 hours
- **State Nexus Matrix** - Multi-state compliance tracking
- **Filing Calendars** - Automated deadline management
- **Audit Response Kits** - Full documentation packages
- **R&D Credits Guide** - Qualification and optimization

### Time-Savers
- Pre-built letter templates for all common scenarios
- Multi-state workflow automation in ClickUp
- Real-time nexus monitoring dashboard

### Gotchas
- State filing requirements change quarterly - review nexus matrix monthly
- R&D documentation must be contemporaneous (can't backdate)
- Estimated payment calculations require Q-1 actual data

---

## Bookkeeping
### What It Is
Monthly financial statement preparation with cleanup, reconciliation, and KPI dashboards.

### Engagement Flow
1. **QBO Setup** - Chart of accounts standardization
2. **Monthly Close** - Reconciliations + variance analysis  
3. **Cleanup** - Historical corrections and reclassifications
4. **Dashboards** - Real-time KPI monitoring

### Standard Deliverables
- P&L with variance analysis
- Balance sheet with aging details
- Cash flow statement (indirect method)
- KPI dashboard (industry-specific)
- Monthly executive summary

### Time-Savers
- [QBO Setup Checklist](qbo-setup-checklist) 
- [Monthly Close SOP](monthly-close-sop)
- [Reconciliation Templates](reconciliation-templates)

---

## Fractional CFO
### What It Is
Strategic financial leadership: budgeting, forecasting, fundraising support, board reporting.

### Core Deliverables
- **Rolling 13-Week Cash Flow** - Weekly updates with scenario planning
- **Budget Templates** - Annual + quarterly reforecasting  
- **Board Pack Format** - Standardized executive reporting
- **Fundraising Data Room** - Due diligence preparation
- **Scenario Models** - What-if analysis for major decisions

### Good Fit / Not a Fit
**✅ Good Fit:** $2M+ revenue, fundraising stage, board reporting requirements  
**❌ Not a Fit:** <$500K revenue, simple bookkeeping needs only

---

## White-Label Back Office
### What It Is
Partnership model where Seed delivers services under partner's brand.

### Partnership SOPs
- **Who Does What** - Clear role definitions and handoff points
- **Intake → Delivery Blueprint** - Standardized workflow from lead to delivery
- **Brandable Assets** - Templates, proposals, reports with partner branding
- **Quality Standards** - SLA definitions and performance metrics

### Time-Savers
- Partner onboarding checklist (30-day implementation)
- White-label template library (instantly rebrandable)
- Performance dashboard (real-time delivery metrics)
`,
  'sales-processes.md': `# Sales Processes & Playbooks

## Lead Qualification
1. Initial contact and discovery
2. Needs assessment
3. Service fit evaluation
4. Pricing and proposal

## Quote Generation
- Use the internal quote calculator
- Include all service components
- Provide clear pricing breakdown
- Follow up within 24 hours

## Client Onboarding
1. Welcome package and introduction
2. Document collection
3. System setup and access
4. Kickoff meeting

## CRM Management
- Update deal stages promptly
- Add detailed notes for all interactions
- Set follow-up reminders
- Track conversion metrics
`,
  'tech-docs.md': `# Technical Documentation

## Employee Portal Features
- Dashboard with real-time metrics
- Quote calculator with HubSpot integration
- Commission tracking
- Client intelligence engine
- Weather integration

## API Integrations
- HubSpot CRM
- OpenAI for data enhancement
- Open-Meteo weather service
- Airtable lead enrichment

## Database Schema
- PostgreSQL with Drizzle ORM
- User management and authentication
- Quote storage and retrieval
- Audit trails and logging

## Development Guidelines
- TypeScript for type safety
- React with modern hooks
- Express.js backend
- Proper error handling
`
};

// Initialize sample pages
Object.entries(samplePages).forEach(([filename, content]) => {
  const filepath = path.join(wikiDir, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, content);
  }
});

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Seed Financial Knowledge Base</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #253e31, #75c29a); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; }
            .page-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; margin-top: 20px; }
            .page-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; text-decoration: none; color: #333; transition: all 0.2s; }
            .page-card:hover { background: #e9ecef; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            .page-title { font-weight: 600; margin-bottom: 8px; }
            .page-desc { font-size: 14px; color: #6c757d; }
            .search-box { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🧠 Seed Financial Knowledge Base</h1>
                <p>Your centralized hub for company knowledge and documentation</p>
            </div>
            <div class="content">
                <input type="text" class="search-box" placeholder="Search knowledge base..." id="searchBox">
                <div class="page-list" id="pageList">
                    ${Object.keys(samplePages).map(page => {
                      const title = page.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      const firstLine = samplePages[page].split('\\n').find(line => line.trim() && !line.startsWith('#')) || '';
                      return `
                        <a href="/page/${page.replace('.md', '')}" class="page-card">
                            <div class="page-title">${title}</div>
                            <div class="page-desc">${firstLine.substring(0, 100)}...</div>
                        </a>
                      `;
                    }).join('')}
                </div>
            </div>
        </div>
        
        <script>
            document.getElementById('searchBox').addEventListener('input', function(e) {
                const search = e.target.value.toLowerCase();
                const cards = document.querySelectorAll('.page-card');
                cards.forEach(card => {
                    const text = card.textContent.toLowerCase();
                    card.style.display = text.includes(search) ? 'block' : 'none';
                });
            });
        </script>
    </body>
    </html>
  `);
});

app.get('/page/:name', (req, res) => {
  const pageName = req.params.name;
  const filepath = path.join(wikiDir, `${pageName}.md`);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).send('Page not found');
  }
  
  const content = fs.readFileSync(filepath, 'utf8');
  const html = md.render(content);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>${pageName} - Knowledge Base</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #253e31, #75c29a); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .nav { padding: 10px 20px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; }
            .nav a { color: #007bff; text-decoration: none; }
            .content { padding: 30px; line-height: 1.6; }
            .content h1, .content h2, .content h3 { color: #253e31; }
            .content h1 { border-bottom: 2px solid #75c29a; padding-bottom: 10px; }
            .content code { background: #f8f9fa; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
            .content pre { background: #f8f9fa; padding: 15px; border-radius: 6px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📄 ${pageName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1>
            </div>
            <div class="nav">
                <a href="/">← Back to Knowledge Base</a>
            </div>
            <div class="content">
                ${html}
            </div>
        </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Knowledge Base server running on http://localhost:${PORT}`);
  console.log(`📚 Access through portal at /knowledge-base`);
  console.log(`🔗 Direct access at http://localhost:${PORT}`);
});