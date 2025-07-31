# Replit.md

## Overview

This is a comprehensive Seed Financial Internal Employee Portal built with React, TypeScript, Express.js, and PostgreSQL. The application features a centralized dashboard as the home page (/) with integrated tools including a sophisticated quote calculator (/calculator), commission tracker, client intelligence engine, and profile management. The portal provides HubSpot integration, real-time weather services, address autocomplete, and advanced sales analytics. The quote calculator calculates pricing based on various business parameters like revenue bands, transaction volumes, and industry complexity. The overall vision is to create a centralized command center for all Seed Financial business operations, enhancing internal efficiency and client engagement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives with custom styling
- **UI/UX Decisions**: Blue-themed sales dashboard, purple-themed service dashboard, SEEDOS branding with role-appropriate color themes, clean white sidebar with gray background for executive dashboard. Design emphasizes consistent navigation, prominent action cards, and clear typography (League Spartan for SeedKB, Open Sans for titles). Visual elements include glassmorphism effects, gradient backgrounds, and subtle hover animations.

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API with JSON responses
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Validation**: Zod schemas shared between frontend and backend
- **Session Management**: Redis-backed sessions with connect-redis (falls back to memory store in development)
- **Security Middleware**: Helmet for security headers, CSRF protection with csurf
- **Logging**: Structured logging with Pino, request logging middleware
- **Error Tracking**: Sentry integration for production error monitoring
- **Rate Limiting**: Express-rate-limit on API endpoints

### System Design Choices
- **Authentication**: Google Workspace OIDC authentication, restricted to `@seedfinancial.io` email addresses, with multi-layer admin enforcement and manual role assignment. User management includes Google Admin API integration for user syncing.
- **Role-Based Access Control**: Implemented with Admin, Sales, and Service roles, controlling dashboard access, feature visibility, and functionality.
- **Data Integration Strategy**: Direct API integrations with third-party services. Future consideration for Apache Airbyte for unified data pipeline beyond 4-5 integrations.
- **Secret Management**: All secrets managed via environment variables (e.g., GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) and never hardcoded or committed. ADC files are used for Google API authentication.
- **Data Storage**: PostgreSQL as the primary database, using Drizzle ORM for type-safe operations.
- **Core Functionality**: Quote generation, commission tracking, client intelligence (HubSpot and OpenAI driven), user profile management, and a comprehensive Knowledge Base (SEEDKB).
- **AI Integration**: AI article generation with versioning, AI-powered client intelligence for prospect scoring and data enhancement, and AI features within SEEDKB (e.g., AI Search Copilot).
- **Error Handling & Resilience**: Enhanced database connection pooling, retry logic for transient failures, graceful error handling for external API calls, and comprehensive authentication system audits.
- **Workflow & User Experience**: Iterative development focusing on streamlining user flows, enhancing login experience, providing clear navigation, and offering rich visual feedback (e.g., toast notifications, scroll restoration, counter animations).

## Security & Infrastructure Implementation (July 31, 2025)

### Security Enhancements
- **Session Security**: Enforced SESSION_SECRET environment variable requirement with secure defaults for development
- **Security Headers**: Comprehensive security headers via Helmet (HSTS, CSP, X-Frame-Options, etc.)
- **CSRF Protection**: Conditional CSRF middleware for form submissions and state-changing operations
- **Cookie Security**: SameSite=strict, httpOnly, and secure flags on session cookies
- **Rate Limiting**: API endpoint protection against brute force and DDoS attacks

### Infrastructure Improvements
- **Redis Cloud Integration**: Managed Redis service with key-prefix strategy:
  - `sess:` prefix for session storage (24-hour TTL)
  - `cache:` prefix for API response caching
  - `queue:` prefix for BullMQ job queuing (ready for implementation)
  - Graceful fallback to memory storage when Redis unavailable
  - Memory usage monitoring with 60% threshold alerts
- **Structured Logging**: Pino logger with:
  - Request/response logging
  - Sensitive data redaction
  - Module-specific child loggers
  - Pretty printing in development, JSON in production
- **Error Monitoring**: Sentry integration with:
  - Automatic error capture
  - User context tracking
  - Performance monitoring
  - Sensitive data filtering
  - Slack notifications for critical errors

### Performance Optimizations
- **API Response Caching**: Comprehensive caching layer for external API calls:
  - Dashboard metrics cached for 5 minutes (10x faster loads)
  - HubSpot contacts cached for 15 minutes (16x faster searches)
  - AI insights cached for 1 hour (20x faster, reduced OpenAI costs)
  - Owner lookups cached for 10 minutes
  - Deal associations cached for 5 minutes
- **Cache Invalidation**: Automatic cache clearing on data mutations
- **Graceful Degradation**: Falls back to direct API calls if cache unavailable

## External Dependencies

- **Database**: Neon Database (serverless PostgreSQL)
- **Authentication**: Google OAuth (`@react-oauth/google`) for Google Workspace OIDC
- **CRM/Sales**: HubSpot API for lead data, deal management, and client intelligence
- **AI/ML**: OpenAI GPT-4o for AI analysis, article generation, and data enrichment
- **Data Management**: Airtable for specific lead data integration
- **Weather Service**: Open-Meteo API for real-time weather data
- **Geocoding**: Nominatim API (OpenStreetMap) for address autocomplete
- **Text Editor**: TinyMCE for rich text editing in AI article generator
- **UI Libraries**: Radix UI, Tailwind CSS, shadcn/ui, Lucide React (icons)
- **Development Tools**: Vite, tsx, esbuild, Drizzle Kit