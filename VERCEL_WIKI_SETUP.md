# Wiki.js on Vercel Setup Guide

## Overview
Deploy Wiki.js on Vercel and integrate it seamlessly with your Seed Financial portal for a complete knowledge management solution.

## Step 1: Deploy Wiki.js to Vercel

### Quick Deploy (Recommended)
1. **Visit Vercel Templates**: Go to [vercel.com/templates](https://vercel.com/templates)
2. **Search Wiki.js**: Look for "Wiki.js" or "wiki" in the templates
3. **Deploy**: Click "Deploy" and connect your GitHub account
4. **Repository**: This creates a new repository in your GitHub account

### Manual Deploy (Alternative)
1. **Fork Repository**: Fork https://github.com/requarks/wiki to your GitHub
2. **Import to Vercel**: Go to Vercel dashboard → "New Project" → Import your fork
3. **Configure**: Set up build settings (usually auto-detected)

## Step 2: Database Setup

### Option A: Vercel Postgres (Easiest)
1. **Add Database**: In your Vercel project, go to "Storage" → "Create Database" → "Postgres"
2. **Get Credentials**: Vercel automatically provides connection variables
3. **Database Name**: Create a database called `wiki`

### Option B: External PostgreSQL (Cost-Effective)
Popular options:
- **Supabase**: Free tier with 500MB, great for small teams
- **Railway**: $5/month with generous limits
- **Aiven**: Free tier available
- **ElephantSQL**: Free 20MB tier

## Step 3: Configure Environment Variables

Add these in your Vercel project dashboard under "Settings" → "Environment Variables":

```bash
# Database Configuration
DB_TYPE=postgres
DB_HOST=your-postgres-host
DB_PORT=5432
DB_USER=your-db-username
DB_PASS=your-db-password
DB_NAME=wiki
DB_SSL=true

# Optional: Custom Port (if needed)
PORT=3000

# Optional: Site URL
WIKI_URL=https://your-wiki.vercel.app
```

## Step 4: Initial Setup

1. **Deploy**: Vercel will automatically deploy your Wiki.js instance
2. **Visit Site**: Go to your Vercel-provided URL (e.g., `your-wiki.vercel.app`)
3. **Setup Wizard**: Complete the Wiki.js installation wizard:
   - Administrator email and password
   - Site configuration
   - Database verification (should auto-connect)

## Step 5: Integrate with Your Portal

### Add Environment Variable to Your Main App
In your Replit project, add to your environment variables:

```bash
VITE_WIKI_URL=https://your-wiki.vercel.app
```

### Verify Integration
1. **Visit Knowledge Base**: Go to `/knowledge-base` in your portal
2. **Status Check**: The page should now detect your Wiki.js instance
3. **Open Wiki**: Click "Open Wiki" button to access your Wiki.js

## Step 6: Customize Your Wiki

### Recommended Initial Setup
1. **Create Main Pages**: Set up your knowledge structure
2. **User Management**: Add team members (if using authentication)
3. **Branding**: Customize logo and colors to match your portal
4. **Backup**: Configure Git synchronization for content backup

### Content Structure Suggestions
- Employee Handbook
- API Documentation  
- Sales Playbooks
- Client Onboarding Procedures
- Technical Documentation
- Company Policies

## Step 7: Advanced Configuration (Optional)

### Custom Domain
1. **Vercel Domains**: Add custom domain in Vercel dashboard
2. **DNS Configuration**: Point your subdomain to Vercel
3. **SSL**: Automatically provided by Vercel

### Single Sign-On (Future Enhancement)
- Wiki.js supports OAuth, LDAP, and SAML
- Can be configured to use same authentication as your portal

## Estimated Costs

### Free Tier (Good for Small Teams)
- **Vercel**: Free (100GB bandwidth/month)
- **Supabase DB**: Free (500MB, 2 concurrent connections)
- **Total**: $0/month

### Production Tier (Growing Teams)
- **Vercel Pro**: $20/month (1TB bandwidth, custom domains)
- **Railway/Aiven DB**: $5-15/month (better performance, backups)
- **Total**: $25-35/month

## Troubleshooting

### Common Issues
1. **Database Connection Failed**: Check environment variables match your DB credentials
2. **Build Failed**: Ensure you're using the correct Node.js version (16+ recommended)
3. **Page Not Loading**: Verify your Vercel deployment completed successfully

### Getting Help
- Check Vercel deployment logs
- Wiki.js documentation: https://docs.requarks.io
- Vercel support for deployment issues

## Integration Status

✅ **Portal Integration**: Your knowledge base page now supports Vercel-hosted Wiki.js  
✅ **Environment Variables**: VITE_WIKI_URL configuration added  
✅ **Status Monitoring**: Automatic detection of Wiki.js availability  
✅ **Setup Guide**: In-portal instructions for easy deployment  

Your portal is ready to work with a Vercel-hosted Wiki.js instance!