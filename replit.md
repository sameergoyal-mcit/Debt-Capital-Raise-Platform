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
- **Database Tables**: users, deals, lenders, invitations, documents, commitments, qa_items, logs, sessions
- **Seed Data**: Demo users (bookrunner/sponsor/lender with password "demo123"), sample deals, lenders, and audit logs

### Authentication & Authorization
- **Auth API**: POST /api/auth/login, POST /api/auth/register with bcrypt password hashing
- **Middleware**: `ensureAuthenticated` and `ensureRole` for API route protection
- **Auth Context**: Client-side auth state in `client/src/context/auth-context.tsx`
- **Session Storage**: localStorage persistence
- **Roles**: Three distinct roles with different permissions:
  - `sponsor`: Deal sponsors, full access to their deals
  - `bookrunner`: Arrangers, full access plus investor book management
  - `lender`: Lenders, scoped access to invited deals only
- **Route Guards**: `ProtectedRoute` component with role-based access control
- **NDA Gating**: `NDAGate` component enforces NDA signing before document access

### Financial Modeling (Credit Engine)
- **Location**: `server/lib/credit-engine.ts`
- **5-Year Paydown Model**: POST /api/deals/:id/calculate
  - Revenue projections with growth rate
  - EBITDA and margin calculations
  - Interest expense, taxes, capex
  - Mandatory amortization + cash sweep paydown
  - Leverage ratio projections (entry to exit)
- **Quick Summary**: GET /api/deals/:id/credit-summary for dashboard metrics

### Key Data Models
- **Users**: Authentication with bcrypt-hashed passwords and roles
- **Deals**: Core deal entity with stages, pricing, covenants, financial modeling fields
- **Lenders**: Institutional investor profiles linked to users
- **Invitations**: Deal access grants with NDA tracking, tokens, and tier levels (early/full/legal)
- **Documents**: Tiered document access with version tracking
- **Q&A**: Due diligence questions with message-to-Q&A sync
- **Commitments**: Lender commitment submissions with firm-up workflow
- **Logs**: Audit trail tracking all investor actions (view deal, download doc, sign NDA, submit commitment)

### API Endpoints
- **Auth**: POST /api/auth/login, POST /api/auth/register, GET /api/auth/me
- **Deals**: GET/POST /api/deals, GET/PATCH /api/deals/:id
- **Lenders**: GET/POST /api/lenders, GET /api/lenders/:id
- **Invitations**: GET /api/deals/:dealId/invitations, POST /api/invitations, POST /api/invitations/:dealId/:lenderId/sign-nda
- **Documents**: GET /api/deals/:dealId/documents, POST /api/documents
- **Commitments**: GET /api/deals/:dealId/commitments, POST /api/commitments
- **Q&A**: GET /api/deals/:dealId/qa, POST /api/qa, PATCH /api/qa/:id/answer
- **Audit Logs**: GET /api/deals/:dealId/logs, POST /api/logs
- **Credit Model**: GET /api/deals/:dealId/credit-summary, POST /api/deals/:dealId/calculate

## Recent Changes (Jan 2026)
- Transitioned from frontend-only prototype to full-stack with PostgreSQL persistence
- Added users table with bcrypt password hashing for secure authentication
- Implemented 5-year debt paydown waterfall model with complete financial projections
- Created audit trail page for tracking investor activity
- Added seed data with demo users (username: bookrunner/sponsor/lender, password: demo123)

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