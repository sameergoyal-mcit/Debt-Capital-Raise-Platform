# CapitalFlow - Private Debt Execution Platform

## Overview

CapitalFlow is a next-generation private credit deal execution platform designed for debt capital markets. It facilitates the entire lifecycle of private debt transactions, connecting issuers, bookrunners, and institutional lenders through a secure, role-based workflow system.

The platform handles:
- Deal structuring and marketing
- Lender invitation and NDA management
- Document distribution with tiered access controls
- Due diligence Q&A workflows
- Commitment submission and tracking
- Closing checklist management
- Real-time messaging between deal participants

This is explicitly a **debt-first system** (NOT equity). All terminology, workflows, and permissions reflect private credit / leveraged finance processes. Use "Lender Presentation" instead of "CIM", reference spreads over SOFR/EURIBOR, and apply debt-specific stages (NDA → Lender Presentation → IOI → Bookbuilding → Docs → Signing → Funding).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state, React Context for auth/session
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful endpoints prefixed with `/api`
- **Build**: esbuild for production bundling with selective dependency bundling

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `db:push` command
- **Current State**: Uses mock data stores in `client/src/data/` for prototyping; designed for easy swap to real database

### Authentication & Authorization
- **Auth Context**: Client-side auth state in `client/src/context/auth-context.tsx`
- **Session Storage**: localStorage persistence
- **Roles**: Three distinct roles with different permissions:
  - `issuer`: Deal sponsors, full access to their deals
  - `bookrunner`: Arrangers, full access plus investor book management
  - `investor`: Lenders, scoped access to invited deals only
- **Route Guards**: `ProtectedRoute` component with role-based access control
- **NDA Gating**: `NDAGate` component enforces NDA signing before document access

### Key Data Models
- **Deals**: Core deal entity with stages, pricing, covenants
- **Lenders**: Institutional investor profiles
- **Invitations**: Deal access grants with NDA tracking and tier levels (early/full/legal)
- **Documents**: Tiered document access with version tracking
- **Q&A**: Due diligence questions with message-to-Q&A sync
- **Commitments**: Lender commitment submissions with firm-up workflow
- **Messages**: Deal-scoped threaded messaging

### File Structure Patterns
```
client/src/
├── components/     # Reusable UI components
├── context/        # React context providers (auth, role)
├── data/           # Mock data stores and types
├── hooks/          # Custom React hooks
├── lib/            # Utilities, helpers, services
├── pages/          # Route page components
└── App.tsx         # Main app with routing
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database via Drizzle ORM
- **Connection**: Uses `DATABASE_URL` environment variable
- **Session Store**: `connect-pg-simple` for Express sessions

### UI Framework
- **shadcn/ui**: Component library (new-york style, neutral base color)
- **Radix UI**: Accessible UI primitives (dialogs, dropdowns, tooltips, etc.)
- **Lucide React**: Icon library
- **Tailwind CSS**: Utility-first styling with custom theme

### Date/Time
- **date-fns**: Date manipulation and formatting
- **date-fns-tz**: Timezone handling

### Form Handling
- **React Hook Form**: Form state management
- **@hookform/resolvers**: Validation integration
- **Zod**: Schema validation (shared with drizzle-zod)

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development environment indicator

### Build Tools
- **Vite**: Frontend build and dev server
- **esbuild**: Server bundling for production
- **TypeScript**: Type checking (strict mode enabled)