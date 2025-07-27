# Commission Tracking System

A comprehensive sales commission tracking system for Seed Financial, built with React, TypeScript, Express.js, and PostgreSQL.

## Features

### Core Functionality
- **Sales Rep Management**: Track sales representatives and their performance
- **Deal Integration**: Import and monitor deals from HubSpot CRM
- **Commission Calculation**: Automated calculations based on Seed Financial's commission structure
- **Bonus Tracking**: Monthly and milestone bonus calculations and rewards
- **Admin Dashboard**: Management interface for approvals and overrides
- **Rep Dashboard**: Individual performance tracking and earnings summary

### Commission Structure
- **40% of monthly deal value** in Month 1
- **20% of initial setup fee** in Month 1
- **10% residual commission** for Months 2–12 for collected recurring revenue

### Bonus System
**Monthly Bonuses (Choose One per Month):**
- 5 Clients Closed: $500 cash or AirPods
- 10 Clients Closed: $1,000 cash or Apple Watch
- 15+ Clients Closed: $1,500 cash or MacBook Air

**Milestone Bonuses:**
- 25 Clients Closed: $1,000
- 40 Clients Closed: $5,000
- 60 Clients Closed: $7,500
- 100 Clients Closed: $10,000 + Equity Offer

## Technical Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: @seedfinancial.io email verification with HubSpot integration
- **UI**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation

## Getting Started

1. **Environment Setup**: Ensure you have DATABASE_URL, HUBSPOT_ACCESS_TOKEN, and SLACK_BOT_TOKEN configured
2. **Install Dependencies**: `npm install`
3. **Database Setup**: `npm run db:push`
4. **Start Development**: `npm run dev`

## Project Structure

```
commission-tracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Main application pages
│   │   └── hooks/         # Custom React hooks
├── server/                # Express.js backend
│   ├── routes.ts          # API endpoints
│   ├── hubspot.ts         # HubSpot CRM integration
│   └── auth.ts            # Authentication logic
├── shared/                # Shared types and utilities
│   ├── schema.ts          # Database schema and types
│   └── commission-calculator.ts  # Commission calculation logic
└── package.json
```

## Key Differences from Quote Calculator

This system focuses on:
- **Performance Tracking** instead of quote generation
- **Commission Calculations** instead of pricing calculations  
- **Deal Monitoring** instead of quote creation
- **Bonus Management** instead of approval workflows
- **Revenue Recognition** instead of service pricing

## Development Notes

- Commission is paid as earned (when company receives payment)
- No clawback tracking (not needed for Seed Financial)
- Single commission structure (no service-specific rates)
- Separate dashboards for reps and admins
- HubSpot integration for deal monitoring and commission triggers