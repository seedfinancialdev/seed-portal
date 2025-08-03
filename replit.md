# Replit.md

## Overview
This project is a comprehensive Internal Employee Portal for Seed Financial, built with React, TypeScript, Express.js, and PostgreSQL. It aims to be a centralized command center, enhancing internal efficiency and client engagement. Key capabilities include a centralized dashboard, a sophisticated quote calculator (supporting 5 services: Bookkeeping, TaaS, Payroll, AP/AR Lite, FP&A Lite), a commission tracker, a client intelligence engine, and profile management. It integrates with HubSpot, provides real-time weather, address autocomplete, advanced sales analytics, and automates MSA document generation with Box integration for client folder management.

## Recent Changes (August 3, 2025)
**CRITICAL API RESPONSE PARSING ISSUE RESOLVED**: Fixed quote creation and HubSpot integration.
- ✅ **RESOLVED: Quote creation returning empty objects** - Fixed apiRequest JSON parsing in mutations
- ✅ **RESOLVED: HubSpot push failing with null quote IDs** - Frontend now properly receives quote data with IDs
- ✅ Added comprehensive debug logging throughout quote creation flow for future troubleshooting
- ✅ Quote creation and HubSpot push workflow now fully functional
- ✅ Example: Quote ID 118 successfully created and pushed to HubSpot (Deal: 41288732267, Quote: 22719074175)

**GIT AUTHENTICATION CLEANUP**: Removed SSH-related configurations to prevent future Git issues.
- ✅ Removed SSH configuration file (~/.ssh/config) that was causing Git authentication failures
- ✅ Uninstalled openssh system package (not needed for application functionality)
- ✅ Preserved critical dependencies (sshpk npm package) and security scanning rules
- ✅ Application functionality completely unaffected - all integrations working normally

**QUOTE CALCULATOR FIELD MIGRATION COMPLETED**: Successfully migrated field naming for consistency.
- ✅ Database schema migrated from `revenueBand` to `monthlyRevenueRange` successfully
- ✅ Updated all pricing calculations to use consistent field names (`shared/pricing.ts`)
- ✅ Fixed form validation to require `monthlyRevenueRange` for TaaS quotes 
- ✅ Auto-set HubSpot verification status to 'verified' for contacts selected from HubSpot
- ✅ All backend and frontend systems functioning correctly

**GOOGLE WORKSPACE INTEGRATION**: Service account authentication complete.
- ✅ Google service account authentication working (seed-admin-api@seedportal.iam.gserviceaccount.com)
- ⚠️ **BLOCKER**: Domain-wide delegation needs configuration in Google Workspace Admin Console

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui component library, Radix UI primitives
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form with Zod
- **UI/UX Decisions**: Emphasizes consistent navigation, prominent action cards, clear typography (League Spartan for SeedKB, Open Sans for titles). Color themes are role-appropriate (blue for sales, purple for service, white sidebar for executive). Visual elements include glassmorphism, gradient backgrounds, and subtle hover animations.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API with JSON responses
- **Database**: PostgreSQL with Drizzle ORM (Neon Database provider)
- **Validation**: Zod schemas (shared with frontend)
- **Session Management**: Redis-backed sessions with connect-redis
- **Security Middleware**: Helmet, csurf
- **Logging**: Pino for structured logging
- **Error Tracking**: Sentry
- **Rate Limiting**: Express-rate-limit

### System Design Choices
- **Authentication**: Google Workspace OIDC, restricted to `@seedfinancial.io` emails, with multi-layer admin enforcement, manual role assignment, and Google Admin API integration for user syncing.
- **Role-Based Access Control**: Implemented for Admin, Sales, and Service roles to control access and features.
- **Data Integration Strategy**: Direct API integrations with third-party services.
- **Secret Management**: Environment variables (e.g., GOOGLE_CLIENT_ID, HUBSPOT_ACCESS_TOKEN) and ADC files for Google API authentication.
- **Data Storage**: PostgreSQL as primary database.
- **Core Functionality**: Quote generation, commission tracking, client intelligence (HubSpot and OpenAI driven), user profile management, Knowledge Base (SEEDKB).
- **AI Integration**: AI article generation with versioning, AI-powered client intelligence for prospect scoring and data enhancement, and AI features within SEEDKB (e.g., AI Search Copilot).
- **Error Handling & Resilience**: Enhanced database connection pooling, retry logic, graceful error handling for external API calls.
- **Workflow & User Experience**: Iterative development focusing on streamlined user flows, enhanced login, clear navigation, and rich visual feedback.
- **Security Enhancements**: Enforced session security, comprehensive security headers, CSRF protection, secure cookie flags, and API endpoint rate limiting.
- **CDN Monitoring System**: Real-time dashboard for health checks, asset management, and performance analytics.
- **Infrastructure Improvements**: Redis Cloud integration for session, caching, and job queuing; structured Pino logging; Sentry error monitoring.
- **OAuth Authentication System**: Full Google OIDC authentication with hosted domain restriction and Redis-backed persistent sessions. Google Admin API integrated for user sync.
- **Workspace User Synchronization**: Local storage of Google Workspace employee data in `workspace_users` table, with automated nightly cron jobs (BullMQ) and manual sync API.
- **Real-Time System Monitoring**: Admin dashboard integration for health monitoring of 5 critical services (HubSpot CRM, Box Storage, OpenAI, Weather, Geocoding) with visual indicators.
- **Production Infrastructure**: Neon Database with PITR, Cloud Redis persistence, Replit Object Storage, dedicated BullMQ worker process, cache namespacing and invalidation.
- **AI-Powered Client Intelligence**: BullMQ handles AI insights generation (pain points, service gaps, risk scoring) with progress tracking and caching.
- **Performance Optimizations**: Comprehensive API response caching for dashboard metrics, HubSpot contacts, and AI insights with automatic invalidation.
- **Centralized Service Architecture**: "Doorway Pattern" for external integrations in `server/services/` ensuring consistent health monitoring, caching, and error handling.

## External Dependencies
- **Database**: Neon Database (PostgreSQL)
- **Authentication**: Google OAuth (`@react-oauth/google`)
- **CRM/Sales**: HubSpot API
- **AI/ML**: OpenAI GPT-4o
- **Data Management**: Airtable
- **Weather Service**: Open-Meteo API
- **Geocoding**: Nominatim API (OpenStreetMap)
- **Text Editor**: TinyMCE
- **UI Libraries**: Radix UI, Tailwind CSS, shadcn/ui, Lucide React
- **Development Tools**: Vite, tsx, esbuild, Drizzle Kit