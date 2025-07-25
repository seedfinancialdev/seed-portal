# Commission Tracker Deployment Guide

## 🚀 Quick Deploy to New Replit Project

### Step 1: Create New Replit Project
1. Go to [replit.com](https://replit.com)
2. Click **"Create Repl"**
3. Choose **"Import from GitHub"** or **"Blank Repl"**
4. Select **Node.js** template
5. Name it: `seed-commission-tracker`

### Step 2: Copy Project Files
Copy the entire `commission-tracker` directory contents to your new Replit project root:

```
commission-tracker/
├── client/                 # React frontend
├── server/                 # Express backend  
├── shared/                 # Shared types & logic
├── package.json           # Dependencies
├── vite.config.ts         # Build configuration
├── drizzle.config.ts      # Database configuration
├── tailwind.config.ts     # Styling configuration
└── .replit                # Replit configuration
```

### Step 3: Environment Variables Setup
In your new Replit project, add these **Secrets** (Environment Variables):

**Required:**
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `HUBSPOT_ACCESS_TOKEN` - HubSpot private app token
- `SESSION_SECRET` - Random string for session security

**Optional:**
- `SLACK_BOT_TOKEN` - For approval notifications (if using Slack)
- `NODE_ENV` - Set to `production` for deployment

### Step 4: Install Dependencies & Setup Database
In the Replit Shell, run:
```bash
npm install
npm run db:push
```

### Step 5: Start Development Server
```bash
npm run dev
```

Your commission tracker will be running at your Replit URL!

## 🔧 Configuration Details

### HubSpot Integration
The system requires a HubSpot Private App with these scopes:
- `crm.objects.deals.read`
- `crm.objects.deals.write`  
- `crm.objects.contacts.read`
- `crm.objects.companies.read`
- `crm.objects.owners.read`

### Authentication
- Uses same @seedfinancial.io email verification
- Default password: `SeedAdmin1!`
- Automatically creates users from HubSpot owner data

### Database Schema
Automatically creates these tables:
- `sales_reps` - Sales representative information
- `deals` - Deal data synced from HubSpot
- `commissions` - Commission calculations and payments
- `monthly_bonuses` - Monthly bonus tracking
- `milestone_bonuses` - Milestone achievement bonuses
- `commission_adjustments` - Admin adjustments and approvals

## 🎯 Commission Structure Implemented

### Commission Rates
- **Month 1**: 40% of monthly value + 20% of setup fee
- **Months 2-12**: 10% residual on collected revenue

### Monthly Bonuses
- **5 clients**: $500 cash or AirPods
- **10 clients**: $1,000 cash or Apple Watch
- **15+ clients**: $1,500 cash or MacBook Air

### Milestone Bonuses
- **25 clients**: $1,000
- **40 clients**: $5,000  
- **60 clients**: $7,500
- **100 clients**: $10,000 + Equity Offer

## 📊 Features Included

### Dashboard Features
✅ Real-time commission calculations
✅ Monthly earnings summary
✅ Bonus eligibility tracking
✅ Progress toward milestones
✅ Recent commission history

### Admin Features (Framework Ready)
🔄 Team performance overview
🔄 Commission approval queue
🔄 Bonus management system
🔄 Detailed reporting

### HubSpot Integration
✅ Automatic deal sync
✅ Commission generation on deal close
✅ Contact and company data import
✅ Deal stage monitoring

## 🛠️ Development Notes

### Revenue Recognition
Commission is paid as earned - when your company receives payment from the client.

### Database Considerations
- Uses Neon PostgreSQL (same as quote calculator)
- Occasional transient connection issues noted
- All monetary values stored as decimals for precision

### Security Features  
- Session-based authentication
- Protected API routes
- User data isolation
- Approval workflows for adjustments

## 🚀 Production Deployment

### Build for Production
```bash
npm run build
npm run start
```

### Replit Deployment
- Click **"Deploy"** button in Replit
- Choose appropriate plan
- Configure custom domain if needed
- Monitor performance and scaling

## 📞 Support

This system uses the same proven architecture as your quote calculator:
- Same authentication system
- Same HubSpot integration patterns  
- Same UI/UX design principles
- Same deployment methodology

Your quote calculator remains completely separate and unaffected.