# Replit.md

## Overview

This project is a comprehensive Seed Financial Internal Employee Portal, designed to centralize internal tools and information for employees. Built with React, TypeScript, Express.js, and PostgreSQL, its primary purpose is to enhance productivity and streamline operations. Key capabilities include a dynamic quote calculator for financial services, a commission tracker, a client intelligence engine powered by HubSpot and AI, and robust profile management. The portal integrates with external services like HubSpot for CRM, real-time weather services, and address autocomplete, offering advanced sales analytics and a unified operating system for business operations. The vision is to provide a central command center for all Seed Financial activities, improving efficiency and supporting data-driven decisions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API with JSON responses
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Validation**: Zod schemas shared between frontend and backend

### Core Architectural Decisions
- **Component-Based Frontend**: Emphasizes reusable UI components for maintainability.
- **RESTful API Backend**: Standardized communication between frontend and backend.
- **Type Safety**: End-to-end type safety enforced using TypeScript and Zod schemas shared across the stack.
- **Server State Management**: Utilizes TanStack Query for efficient data fetching, caching, and synchronization.
- **Modular Design**: Business logic is separated into reusable components, hooks, and shared utilities (e.g., `/shared/pricing.ts`).
- **Authentication**: Google Workspace OIDC authentication is implemented for enterprise-grade access control, restricting logins to `@seedfinancial.io` email addresses.
- **Role-Based Access Control**: Implements three user roles (Admin, Sales, Service) with granular permissions and role-based dashboard routing.
- **UI/UX Design**: Features a modern, professional aesthetic with consistent branding (SEEDOS theme), including glassmorphism effects, gradient backgrounds, and orange accents, with role-appropriate color themes for dashboards (blue for Sales, purple for Service).
- **Security**: Focuses on robust secret management via environment variables and proper handling of ADC files, with all hardcoded secrets removed.
- **Data Integration Strategy**: Primarily uses direct API integrations, with a future consideration for Apache Airbyte for broader data pipeline unification if integrations expand significantly.

### Key Features
- **Quote Calculator**: Calculates pricing based on revenue bands, transaction volumes, and industry complexity.
- **User Management System**: Comprehensive system with Google Admin API integration for syncing users, assigning roles, and tracking access. Features restricted access control where admins manually assign roles.
- **Knowledge Base (SEEDKB)**: A PostgreSQL-backed knowledge system with 9 categories, article management, search functionality, and administrative interface.
- **AI Article Generator**: Enhances content creation with AI-powered article generation, template management, and versioning.
- **Sales Inbox**: Integrates with HubSpot for lead management, featuring owner-based filtering, advanced search, and modals.
- **Client Intelligence Engine**: Utilizes HubSpot and OpenAI GPT-4o for prospect scoring, pain point detection, service gap identification, and automated data enhancement.
- **Dynamic Dashboard**: Centralized dashboard with real-time business intelligence, executive summaries, and quick action cards.

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL provider.

### UI Libraries
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **shadcn/ui**: Pre-built component library.

### Third-Party Services/APIs
- **HubSpot API**: For CRM integration, contact verification, deal creation, and client intelligence.
- **OpenAI API**: For AI-powered article generation, client data analysis, and content enhancement.
- **Nominatim API (OpenStreetMap)**: For address autocomplete and geocoding services.
- **Open-Meteo API**: For real-time weather data.
- **Airtable**: Integration for specific lead data enhancement and management.

### Development Tools
- **Replit Integration**: Special development environment support.
- **Vite**: Frontend build tool.
- **Drizzle Kit**: Database schema and migration management.