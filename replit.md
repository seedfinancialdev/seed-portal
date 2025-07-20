# Replit.md

## Overview

This is a full-stack web application built with React, TypeScript, Express.js, and PostgreSQL. The application appears to be a quote generation system that calculates pricing based on various business parameters like revenue bands, transaction volumes, and industry complexity. It uses modern web development practices with a component-based frontend and RESTful API backend.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Primary Database**: PostgreSQL hosted on Neon Database
- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: Drizzle Kit for database schema management
- **Schema Location**: Shared TypeScript schemas in `/shared/schema.ts`

## Key Components

### Database Schema
- **Quotes Table**: Stores quote information including contact email, revenue band, transaction volume, industry type, cleanup complexity, and calculated fees
- **Users Table**: Basic user management with username and password (legacy/placeholder)

### API Endpoints
- `POST /api/quotes` - Create a new quote with pricing calculations
- `GET /api/quotes?email=<email>` - Retrieve quotes by contact email
- `GET /api/quotes/:id` - Retrieve a specific quote by ID

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