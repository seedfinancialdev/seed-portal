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

// Create sample pages if they don't exist
const samplePages = {
  'home.md': `# Welcome to Seed Financial Knowledge Base

This is your company knowledge base where you can store:

- Employee handbooks and policies
- API documentation and technical guides  
- Sales playbooks and processes
- Training materials and onboarding guides
- Company procedures and best practices

## Getting Started

1. **Create Pages**: Use the simple interface to create new documentation
2. **Edit Content**: All content is stored in Markdown format
3. **Search**: Find information quickly across all pages
4. **Organize**: Structure your knowledge with categories

## Quick Links

- [Employee Handbook](employee-handbook)
- [Sales Processes](sales-processes)
- [Technical Documentation](tech-docs)
- [Training Materials](training)
`,
  'employee-handbook.md': `# Employee Handbook

## Company Overview
Seed Financial provides comprehensive accounting and tax services to growing businesses.

## Core Values
- Client-first approach
- Continuous learning
- Collaborative teamwork
- Data-driven decisions

## Policies
- Remote work guidelines
- Communication standards
- Time off and benefits
- Professional development

## Tools & Systems
- HubSpot CRM
- Internal Employee Portal
- Slack for team communication
- QuickBooks for client services
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