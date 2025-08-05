# Replit.md

## Overview
This project is Seed Financial's Internal Employee Portal, built with React, TypeScript, Express.js, and PostgreSQL. It functions as a centralized command center to enhance internal efficiency and client engagement. Key capabilities include a centralized dashboard, a sophisticated quote calculator for five services (Bookkeeping, TaaS, Payroll, AP/AR Lite, FP&A Lite), a commission tracker, a client intelligence engine, and profile management. It integrates with HubSpot, provides real-time weather, address autocomplete, advanced sales analytics, and automates MSA document generation with Box integration for client folder management.

## Recent Changes (August 2025)
- **Authentication System Fixed**: Successfully resolved bcrypt password verification issues that were causing login failures
- **Password Hash Compatibility**: Updated authentication system to handle both bcrypt and legacy scrypt password formats
- **Session Management**: Verified that user sessions persist correctly across requests and protected routes work properly
- **Test Environment**: Created test users for development with proper bcrypt password hashing
- **HubSpot Integration Fully Operational**: Fixed critical apiRequest function compatibility issues in quote saving and HubSpot push/update mutations. Complete end-to-end workflow now functions seamlessly with proper error handling and user feedback.
- **User Management System Enhanced**: Implemented comprehensive portal user management with default dashboard assignment (Admin, Sales, Service), automatic password generation, user creation/deletion, and password reset functionality. Simplified role structure to admin/employee with dashboard preferences controlling initial login destination.
- **Admin Impersonation System**: Added full impersonation functionality allowing admins to sign in as any user for support purposes. System preserves original admin session, automatically redirects to user's default dashboard (/admin, /sales-dashboard, /service-dashboard), and provides secure session switching with proper authentication handling.

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
- **Authentication**: Email/password authentication system with bcrypt password hashing, restricted to `@seedfinancial.io` emails, with simplified admin/employee role structure and default dashboard preferences (Admin, Sales, Service) for personalized login experience. Includes comprehensive user management interface with automatic password generation and user lifecycle management.
- **Role-Based Access Control**: Implemented for Admin, Sales, and Service roles.
- **Data Integration Strategy**: Direct API integrations with third-party services using a "Doorway Pattern" for consistent health monitoring, caching, and error handling.
- **Secret Management**: Environment variables and ADC files for Google API authentication.
- **Data Storage**: PostgreSQL as primary database.
- **Core Functionality**: Quote generation, commission tracking, client intelligence (HubSpot and OpenAI driven), user profile management, Knowledge Base (SEEDKB).
- **AI Integration**: AI article generation with versioning, AI-powered client intelligence for prospect scoring and data enhancement, and AI features within SEEDKB (e.g., AI Search Copilot). BullMQ handles AI insights generation with progress tracking and caching.
- **Error Handling & Resilience**: Enhanced database connection pooling, retry logic, graceful error handling for external API calls, Sentry error monitoring.
- **Workflow & User Experience**: Iterative development focusing on streamlined user flows, enhanced login, clear navigation, and rich visual feedback.
- **Security Enhancements**: Enforced session security, comprehensive security headers, CSRF protection, secure cookie flags, and API endpoint rate limiting.
- **Real-Time System Monitoring**: Admin dashboard integration for health monitoring of critical services (HubSpot CRM, Box Storage, OpenAI, Weather, Geocoding) with visual indicators.
- **Production Infrastructure**: Neon Database with PITR, Redis persistence, Replit Object Storage, dedicated BullMQ worker process, cache namespacing and invalidation.
- **Performance Optimizations**: Comprehensive API response caching for dashboard metrics, HubSpot contacts, and AI insights with automatic invalidation.
- **Startup Optimization**: HTTP server starts first, with Redis, BullMQ, HubSpot, and cache services initializing in the background to prevent deployment timeouts.

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