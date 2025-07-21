# Replit.md

## Overview

This is a full-stack web application built with React, TypeScript, Express.js, and PostgreSQL. The application appears to be a quote generation system that calculates pricing based on various business parameters like revenue bands, transaction volumes, and industry complexity. It uses modern web development practices with a component-based frontend and RESTful API backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

✓ **Complete Authentication System Implemented** (July 21, 2025)
  - Secure login system with automatic user registration for @seedfinancial.io emails
  - Password-based authentication with default password SeedAdmin1! 
  - Session management with Express sessions and Passport.js
  - Protected routes requiring authentication for all quote operations
  - User ownership model ensuring data isolation between users
  - Auto-creation of users when valid @seedfinancial.io emails attempt login
  - Clean authentication UI with Seed Financial branding
  - User menu with logout functionality in application header
  - Simplified auth page removing registration option as requested
  - HubSpot user verification: Only emails existing in HubSpot contacts/owners can access
  - Pre-approved email list for immediate access to key users
  - Updated placeholder text to "name@seedfinancial.io" for clarity

✓ **HubSpot Integration Successfully Implemented** (July 21, 2025)
  - Added complete HubSpot CRM integration with contact verification
  - Email verification with real-time visual indicators (green check/red X)  
  - Company Name field with auto-population from HubSpot contact data
  - Push to HubSpot functionality creates deals in "Appointment Scheduled" stage
  - Deal naming convention: "{Company Name} - Bookkeeping"
  - Quote details embedded in deal description with pricing breakdown
  - Auto-save quote functionality before pushing to HubSpot
  - Error handling for non-existing contacts with user-friendly messages
  - Successfully tested with live HubSpot API integration

✓ **Archive Dialog Issue Fixed** (July 21, 2025)
  - Replaced browser confirm() dialog with custom AlertDialog component
  - Added "Don't show this dialog again" checkbox with localStorage persistence
  - Archive functionality works regardless of user preferences
  - Added reset button to re-enable confirmations when needed
  - Prevents browser-specific dialog blocking issues

✓ **Approval Code Tracking Added** (July 21, 2025)
  - Added 'approvalRequired' database column to track quotes that used approved overrides
  - Visual indicators in quotes table: "Approved" (orange badge), "Override" (gray badge), "Standard" (gray text)
  - Enables auditing and tracking of override patterns for business analysis

✓ **Complete Approval Code System Implemented** (July 21, 2025)
  - Built 4-digit approval code generation and validation system
  - Request Approval button triggers Slack notification with unique code
  - Approval code popup dialog for secure code entry
  - Cleanup months field locked until valid approval code entered
  - Codes expire after 1 hour and are single-use for security

✓ **Archive Functionality Implemented** (July 20, 2025)
  - Added archive button to saved quotes with confirmation dialog
  - Archives preserve all data for auditing (never deleted from database)
  - Updated database schema with 'archived' boolean field
  - All queries exclude archived quotes by default for clean interface
  - New API endpoint: PATCH /api/quotes/:id/archive

✓ **Production Deployment Completed** (July 20, 2025)
  - Successfully deployed to Replit at seed-bk-calc.replit.app
  - Application is live and accessible via public URL
  - Connected to GitHub repository at seedfinancialdev/seed-price-calc
  - Ready for internal business use and client quote generation

✓ **Dynamic Pricing Implementation** (July 20, 2025)
  - Changed "Marketing Agencies" to "Professional Services" in industry dropdown
  - Moved Transactions field above Revenue Band field for better UX
  - Replaced flat base fees with dynamic revenue multipliers (0.5x to 7.0x)
  - Fixed decimal precision issues - all monetary values now display 2 decimal places
  - Maintained similar pricing levels with smoother transitions between revenue bands

✓ **Application Startup Issues Fixed** (July 20, 2025)
  - Resolved frontend error with undefined updateQuoteMutation
  - Fixed database connection issues with Neon PostgreSQL
  - Application now running successfully on port 5000
  - All quote creation, updates, and pricing calculations working properly

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API with JSON responses
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Validation**: Zod schemas shared between frontend and backend

### Data Storage Solutions
- **Primary Database**: PostgreSQL (configured and connected)
- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: Drizzle Kit for database schema management
- **Schema Location**: Shared TypeScript schemas in `/shared/schema.ts`
- **Storage Implementation**: DatabaseStorage class replacing MemStorage

## Key Components

### Database Schema
- **Quotes Table**: Stores quote information including contact email, revenue band, transaction volume, industry type, cleanup complexity, calculated fees, and archive status
- **Users Table**: Basic user management with username and password (legacy/placeholder)

### API Endpoints
- `POST /api/quotes` - Create a new quote with pricing calculations
- `GET /api/quotes?email=<email>` - Retrieve quotes by contact email
- `GET /api/quotes/:id` - Retrieve a specific quote by ID
- `PATCH /api/quotes/:id/archive` - Archive a quote (preserves data for auditing)

### Frontend Components
- **Home Page**: Quote generation form with real-time pricing calculations
- **Form Components**: React Hook Form integration with shadcn/ui components
- **Pricing Logic**: Embedded calculations based on revenue bands, transaction volumes, and industry complexity multipliers

### Shared Types and Validation
- Zod schemas for quote creation and validation
- TypeScript types generated from Drizzle schema
- Shared between client and server for type safety

## Data Flow

1. **Quote Creation Flow**:
   - User fills out quote form on frontend
   - Form validation using Zod schemas
   - Real-time price calculation on frontend
   - Form submission sends data to `/api/quotes` endpoint
   - Backend validates data and stores in PostgreSQL
   - Success response triggers UI updates and notifications

2. **Quote Retrieval Flow**:
   - Frontend queries `/api/quotes` with email parameter
   - Backend fetches quotes from database using Drizzle ORM
   - Results displayed in UI components

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL provider
- **Connection**: Uses `DATABASE_URL` environment variable

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **shadcn/ui**: Pre-built component library

### Development Tools
- **Replit Integration**: Special development environment support
- **Vite Plugins**: Runtime error overlay and development tools

## Deployment Strategy

### Development
- **Dev Server**: Vite development server for frontend
- **API Server**: Express.js with hot reloading using tsx
- **Database**: Connects to Neon Database in development

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code for Node.js production
- **Deployment**: Single process serving both API and static files
- **Environment**: Production detection via `NODE_ENV=production`

### Key Files
- `package.json`: Defines build and dev scripts
- `vite.config.ts`: Frontend build configuration
- `drizzle.config.ts`: Database schema and migration configuration
- `tsconfig.json`: TypeScript configuration for monorepo structure

The architecture follows a modern full-stack pattern with strong type safety, shared validation logic, and optimized development experience through Vite and TypeScript.