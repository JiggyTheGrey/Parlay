# Parlay-it - Crypto Clan Wagering Platform

## Overview

Parlay-it is a centralized web application for clan-vs-clan crypto wagering across multiple games (Bloodstrike, Call of Duty, etc.). This is a custodial platform (similar to Stake.com) where clans can create accounts, challenge each other with crypto wagers, play matches off-platform, and manually confirm winners for fund distribution. The platform does NOT use smart contracts - all balances are controlled by the backend.

**Core Features:**
- Team creation and management with captain roles
- Email invitation system for team members (captains can invite by email)
- Match challenges with crypto wagers between teams
- Multi-game support (Bloodstrike, Call of Duty, Apex, Valorant, CS2, Fortnite, and more)
- Shareable battle links for opponent captains to accept challenges
- Manual winner confirmation with dispute resolution
- Custodial wallet system for deposits/withdrawals
- Admin panel for dispute resolution

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite build system)
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **State Management**: TanStack React Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **Theme**: Dark-dominant gaming aesthetic with light/dark mode toggle

The frontend follows a standard SPA pattern with:
- Landing page for unauthenticated users
- Authenticated layout with sidebar navigation
- Pages for dashboard, teams, matches, wallet, and history

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON API under `/api/*` prefix
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

Key API routes include:
- `/api/auth/*` - Authentication endpoints
- `/api/teams/*` - Team CRUD and membership
- `/api/teams/:id/invite` - Email invitation for team members
- `/api/invitations/*` - Accept/decline team invitations
- `/api/matches/*` - Match creation, acceptance, and confirmation
- `/api/battles/:token` - Public battle link access
- `/api/wallet/*` - Deposit/withdrawal operations
- `/api/admin/*` - Admin dispute resolution

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit (`drizzle-kit push`)

Core entities:
- `users` - User accounts with balance and admin flag
- `teams` - Teams with owner, balance, and win/loss stats
- `teamMembers` - Many-to-many user-team relationships
- `teamInvitations` - Email-based team invitation system with tokens and expiration
- `matches` - Wager matches with status workflow, game selection, and shareToken for public links
- `transactions` - Wallet transaction history
- `sessions` - Authentication session storage

### Match Status Workflow
1. **pending** - Challenge sent, awaiting acceptance
2. **accepted** - Both teams agreed, ready to play
3. **active** - Match in progress
4. **confirming** - Awaiting winner confirmation from both teams
5. **disputed** - Teams disagree, requires admin resolution
6. **completed** - Winner confirmed, funds distributed
7. **cancelled** - Match cancelled

## External Dependencies

### Third-Party Services
- **Authentication**: Replit OIDC (`ISSUER_URL`, `REPL_ID` environment variables)
- **Database**: PostgreSQL (`DATABASE_URL` environment variable)
- **Session Secret**: `SESSION_SECRET` environment variable required

### Key NPM Packages
- `drizzle-orm` + `drizzle-zod` - Database ORM and schema validation
- `express-session` + `connect-pg-simple` - Session management
- `passport` + `openid-client` - Authentication
- `@tanstack/react-query` - Data fetching and caching
- `@radix-ui/*` + `shadcn/ui` - UI component primitives
- `wouter` - Client-side routing
- `zod` - Runtime validation

### Build Configuration
- Development: `tsx` for TypeScript execution
- Production: Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- Path aliases: `@/*` maps to `client/src/*`, `@shared/*` maps to `shared/*`