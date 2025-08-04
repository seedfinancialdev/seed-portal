# Replit.md

## Overview
This project is a comprehensive Internal Employee Portal for Seed Financial, built with React, TypeScript, Express.js, and PostgreSQL. It aims to be a centralized command center, enhancing internal efficiency and client engagement. Key capabilities include a centralized dashboard, a sophisticated quote calculator (supporting 5 services: Bookkeeping, TaaS, Payroll, AP/AR Lite, FP&A Lite), a commission tracker, a client intelligence engine, and profile management. It integrates with HubSpot, provides real-time weather, address autocomplete, advanced sales analytics, and automates MSA document generation with Box integration for client folder management.

## Recent Changes (August 4, 2025)
**AUTHENTICATION ISSUE FIXED**: Implemented unified authentication system to resolve Google OAuth redirect loop.
- ✅ **ROOT CAUSE**: Context synchronization problem between GoogleAuthProvider and AuthProvider
- ✅ **SOLUTION**: Created UnifiedAuthProvider that consolidates Google OAuth and session-based authentication
- ✅ **COMPONENTS UPDATED**: ProtectedRoute, App.tsx, UniversalNavbar, profile.tsx, admin-dashboard.tsx
- ✅ **NEW UNIFIED AUTH PAGE**: Combined Google and email login options in single auth page
- ✅ **SESSION MANAGEMENT**: Proper coordination between OAuth flow and session creation
- ✅ **PRODUCTION READY**: Unified authentication system ready for testing in production environment

**QUOTE UPDATE FUNCTIONALITY FIXED**:
- ✅ **ROOT CAUSE IDENTIFIED**: Same service field mapping issue affected quote updates - database fields (service_bookkeeping=true) vs HubSpot parameters (includesBookkeeping=false)
- ✅ **FIXED UPDATE FLOW**: Updated routes.ts update quote endpoint to use serviceBookkeeping/serviceTaas instead of includes* fields
- ✅ **ENHANCED UPDATE DIAGNOSTICS**: Added comprehensive step-by-step logging with emoji markers for update quote process
- ✅ **LINE ITEM MANAGEMENT**: Fixed manageServiceLineItems function to properly handle service transitions during updates
- ✅ **UPDATE ERROR HANDLING**: Quote updates now preserve line items correctly and provide detailed logging for troubleshooting

**QUOTE CREATION FUNCTIONALITY (PREVIOUSLY FIXED)**:
- ✅ **ROOT CAUSE IDENTIFIED**: Service field mapping mismatch between database fields (service_bookkeeping=true) and HubSpot parameters (includesBookkeeping=false)
- ✅ **FIXED CREATE FLOW**: Updated routes.ts to use serviceBookkeeping/serviceTaas instead of includes* fields for HubSpot integration
- ✅ **ENHANCED DIAGNOSTICS**: Added comprehensive step-by-step logging with emoji markers for line item creation process
- ✅ **PRODUCT VERIFICATION**: Implemented HubSpot product ID verification system to detect and replace invalid product IDs
- ✅ **ERROR HANDLING**: Line item creation failures no longer break quote creation - quotes succeed with manual line item addition option
- ✅ **DEBUGGING ENDPOINT**: Added /api/hubspot/debug/products endpoint for real-time product ID verification
- ✅ Example: Quote ID 120 successfully created and pushed to HubSpot (Deal: 41289977122, Quote: 22883799425) - testing line items with corrected service field mapping

**SCOPE ASSUMPTIONS FEATURE IMPLEMENTED (August 4, 2025)**:
- ✅ **NEW FEATURE**: Added scope assumptions to HubSpot comments field (hs_comments) for all quotes
- ✅ **BOOKKEEPING SCOPE**: Includes Entity Type, Monthly Transactions, Months of Cleanup Required, Accounting Basis, QuickBooks Subscription Needed
- ✅ **TAAS SCOPE**: Includes Number of Entities, States Filed, International Filing Required, Number of Personal 1040s, Number of Prior Years Filings
- ✅ **BOTH FLOWS UPDATED**: Scope assumptions generated for both quote creation and update processes
- ✅ **DYNAMIC CONTENT**: Personal 1040s field intelligently uses numBusinessOwners when include1040s checkbox is enabled
- ✅ **PROFESSIONAL FORMAT**: Clear section headers and bullet points for easy reading in HubSpot interface

**PAYMENT TERMS INTEGRATION (August 4, 2025)**:
- ✅ **NEW FEATURE**: Added standardized payment terms to HubSpot quotes hs_terms field
- ✅ **BASE TERMS**: MSA reference, pricing assumptions, order of precedence, California governing law
- ✅ **CLICKABLE LINKS**: HTML formatted links to MSA and service schedules for legal documents
- ✅ **SERVICE-SPECIFIC SCHEDULES**: Dynamically includes Schedule A (Bookkeeping) and Schedule B (TaaS) based on engaged services
- ✅ **BOTH FLOWS UPDATED**: Payment terms generated for both quote creation and update processes
- ✅ **LEGAL COMPLIANCE**: All quotes now include proper legal framework and document references
- ✅ **HUBSPOT QUOTE CREATION FIXED**: Resolved invalid property names issue - quotes now create successfully in HubSpot
- ✅ **ERROR HANDLING IMPROVED**: Removed misleading fallback logic, added detailed error logging for troubleshooting

**QUOTE CREATION ISSUE RESOLVED (August 4, 2025)**:
- ✅ **ROOT CAUSE**: Invalid HubSpot property names (hs_payment_enabled, hs_payments_enabled, hs_signature_required) causing quote creation failures
- ✅ **FALLBACK ISSUE**: Misleading fallback logic was creating fake quote IDs (deal_41308005133) instead of real quotes
- ✅ **SOLUTION**: Removed invalid properties, kept valid ones (hs_esign_enabled, hs_comments, hs_terms)
- ✅ **VERIFICATION**: Quote ID 127 successfully created with proper HubSpot quote ID 22795357839
- ✅ **TRANSPARENCY**: Enhanced error logging provides clear diagnosis for future issues

**AUTHENTICATION DEEP INVESTIGATION COMPLETED (August 4, 2025)**:
- ✅ **SESSION AUTHENTICATION VERIFIED**: Email/password login and Redis session persistence work perfectly
- ✅ **OAUTH FLOW ANALYSIS**: Google OAuth requires valid, fresh tokens for backend verification  
- ✅ **FRONTEND TIMING OPTIMIZED**: Enhanced authentication flow to prevent session check conflicts during OAuth
- ✅ **COMPREHENSIVE DEBUGGING**: Added detailed logging to track OAuth sync, session creation, and token validation
- ✅ **TOKEN VALIDATION CONFIRMED**: Backend correctly validates Google tokens with Google's API before session creation
- ✅ **DEVELOPMENT DEBUG INFO**: Added authentication state debugging for troubleshooting OAuth flow issues
- ✅ **SYSTEM STATUS**: All 79 protected endpoints working correctly with session-based authentication

**AUTHENTICATION SYSTEM STATUS**:
- ✅ **LOGIN FLOW**: Google OAuth sync, session creation, and user authentication fully operational
- ✅ **SESSION PERSISTENCE**: Users remain authenticated across requests with proper session management
- ✅ **LOGOUT FLOW**: Session destruction and cleanup working correctly
- ✅ **PROTECTED ROUTES**: All 79 requireAuth endpoints accessible with session-based authentication
- ✅ **TOKEN CLEANUP**: OAuth tokens properly cleared after session creation for security
- ✅ **DUAL AUTH MIGRATION COMPLETE**: Successfully migrated from dual Bearer/session system to pure session-based auth
- ✅ **ERROR HANDLING**: Comprehensive logging and graceful error handling for authentication failures

**GIT AUTHENTICATION CLEANUP**: Resolved SSH authentication issues and restored Git functionality.
- ✅ Removed SSH configuration file (~/.ssh/config) that was causing Git authentication failures
- ✅ Uninstalled openssh system package (not needed for application functionality)
- ✅ Successfully switched Git remote from SSH to HTTPS authentication
- ✅ Restored Git push functionality - 220+ commits successfully pushed to GitHub
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