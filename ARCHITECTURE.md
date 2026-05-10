# Architecture Overview

This document is the living architecture map for the ASOF Intranet. Keep it updated when routes, persistence, authentication, deployment, or major module boundaries change.

## 1. Project Structure

```text
[Project Root]/
├── src/
│   ├── app/                         # Next.js App Router routes, layouts, global CSS, local fonts
│   │   ├── app/                     # Authenticated intranet area (/app/*)
│   │   │   ├── associados/          # Associates list and associate profile
│   │   │   ├── atividades/          # Kanban board and new activity form
│   │   │   ├── auditoria/           # Audit area placeholder
│   │   │   ├── config/              # Configuration placeholder
│   │   │   ├── juridico/            # Legal area placeholder
│   │   │   ├── usuarios/            # User-management placeholder
│   │   │   ├── layout.tsx           # Authenticated app shell
│   │   │   └── page.tsx             # Dashboard
│   │   ├── change-password/         # Required password-change flow
│   │   ├── login/                   # Login page and server actions
│   │   ├── globals.css              # Tailwind/DaisyUI theme entrypoint
│   │   ├── layout.tsx               # Root layout and font wiring
│   │   └── page.tsx                 # Root redirect entrypoint
│   ├── components/                  # Shared UI shell components
│   └── lib/
│       ├── associates/              # Search parameter parsing/helpers
│       ├── auth/                    # Auth config, sessions, guards, password logic
│       ├── db/                      # Drizzle client and schema exports
│       │   └── schema/              # admins, associates, activities, audit_logs
│       ├── supabase/                # Supabase SDK factories for script/server use
│       └── ui/                      # Shared UI tokens/helpers
├── drizzle/
│   └── postgres/                    # Current PostgreSQL migrations
├── docs/                            # Product, design, diagnostics, and analysis docs
├── scripts/                         # Seed, diagnostics, and Supabase status scripts
├── public/                          # Static public assets
├── proxy.ts                         # Next.js proxy route guard for protected routes
├── drizzle.config.ts                # Drizzle migration config for PostgreSQL
├── next.config.ts                   # Next.js config
├── package.json                     # npm scripts and dependencies
├── DESIGN.md                        # Visual design system documentation
├── README.md                        # Project overview and quick start
└── ARCHITECTURE.md                  # This document
```

## 2. High-Level System Diagram

```text
[Internal ASOF User]
        |
        v
[Next.js App Router UI]
        |
        +--> [proxy.ts route guard] --> [JWT cookie validation with jose]
        |
        +--> [Server Components / Server Actions]
                 |
                 +--> [Auth helpers in src/lib/auth]
                 |
                 +--> [Drizzle ORM client]
                          |
                          v
                    [PostgreSQL database]

[Admin scripts]
        |
        +--> [Drizzle Kit migrations]
        |
        +--> [Seed/status scripts]
        |
        +--> [Supabase SDK helpers] --> [Supabase project APIs]
```

The application is intentionally compact: the web UI and backend behavior live in one Next.js codebase. Server Components and Server Actions own most request-time work. `proxy.ts` performs coarse protected-route validation before the protected app renders. Database access is centralized through Drizzle.

## 3. Core Components

### 3.1. Frontend

Name: ASOF Intranet Web App

Description: Internal web interface for ASOF administrative staff and leadership. It currently supports an authenticated dashboard, associates list, associate profile view, activity kanban, new activity form, login, and forced password-change flow. Some administrative areas are placeholders.

Technologies: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, DaisyUI 5, Lucide React, local Playfair and Google Sans fonts.

Deployment: Vercel-compatible Next.js application. The exact production hosting policy should be kept in deployment docs when finalized.

### 3.2. Backend Services

#### 3.2.1. Next.js Server Runtime

Name: ASOF Intranet Server Runtime

Description: Handles SSR/RSC rendering, Server Actions, authentication workflows, password change, protected app rendering, and database reads/writes.

Technologies: Next.js 16, React Server Components, TypeScript, `jose`, `bcryptjs`, Drizzle ORM.

Deployment: Runs with the Next.js application. `npm run dev` and `npm run build` use Webpack explicitly; Turbopack scripts are kept for explicit diagnostics.

#### 3.2.2. Database Access Layer

Name: Drizzle/PostgreSQL Data Layer

Description: Centralizes database access through `src/lib/db/index.ts`, using schemas from `src/lib/db/schema/*`. Runtime connections prefer `DATABASE_URL`, then `DATABASE_POSTGRES_URL`.

Technologies: Drizzle ORM, `postgres`, PostgreSQL.

Deployment: Server-side only. Migrations require a direct/non-pooling PostgreSQL URL via `DATABASE_MIGRATION_URL` or `DATABASE_POSTGRES_URL_NON_POOLING`.

#### 3.2.3. Supabase SDK Tooling

Name: Supabase Server/Admin SDK Helpers

Description: Provides script-safe Supabase client factories for administrative checks and future server-side integrations without requiring manual dashboard access.

Technologies: `@supabase/supabase-js`.

Deployment: Used only from server/script contexts. Service-role keys must never be exposed to client components.

## 4. Data Stores

### 4.1. Primary Application Database

Name: ASOF Intranet PostgreSQL Database

Type: PostgreSQL, currently backed by Supabase in the known remote environment.

Purpose: Stores administrative users, ASOF associates, activity workflow records, and audit logs.

Key Schemas/Tables:

- `admins`
- `associates`
- `activities`
- `audit_logs`

### 4.2. Legacy/Local Migration Artifacts

Name: Historical SQLite migration artifacts

Type: Drizzle SQL migration files under the older `drizzle/` root.

Purpose: Preserved history from an earlier SQLite/libSQL phase. Current Drizzle configuration targets `drizzle/postgres/` and PostgreSQL.

## 5. External Integrations / APIs

Service Name: Supabase

Purpose: Managed PostgreSQL database hosting and programmatic database status checks.

Integration Method: PostgreSQL connection strings for Drizzle runtime/migrations; Supabase JavaScript SDK for server/admin tooling.

Service Name: GitHub

Purpose: Source control and collaboration.

Integration Method: Git remote `https://github.com/prof-ramos/intranet.git`.

Service Name: CodeRabbit

Purpose: AI-assisted code review workflow used by the project.

Integration Method: CLI workflow such as `git add . && coderabbit review --prompt-only`.

## 6. Deployment & Infrastructure

Cloud Provider: Not fully codified in repository infrastructure. The app is built as a Vercel-compatible Next.js application and uses Supabase-compatible PostgreSQL configuration.

Key Services Used:

- Next.js runtime
- PostgreSQL database
- Supabase project/API helpers

CI/CD Pipeline: No `.github` workflow files are currently present in the repository.

Monitoring & Logging: No dedicated monitoring stack is currently configured in code. Local diagnostics live in `scripts/run-dev-60s.sh` and `docs/diagnostico-travamento-next-dev.md`.

## 7. Security Considerations

Authentication: JWT session cookie named `asof-session`, signed/verified with `jose`. Login and password-change behavior live under `src/lib/auth` and `src/app/login` / `src/app/change-password`.

Authorization: Roles are `admin`, `diretoria`, and `secretaria`. Some route-level restrictions exist through `requireRole`, but route authorization should continue to be made explicit as administrative screens grow.

Data Encryption: TLS is expected for production HTTP and database transport. Runtime database SSL is required automatically in production or when `DB_SSL=true` / `sslmode=require` is present.

Key Security Tools/Practices:

- `SESSION_SECRET` must be at least 32 characters.
- `SKIP_AUTH=true` works only outside production.
- Service-role Supabase keys are server/script-only.
- Sensitive ASOF data such as CPF, SIAPE, email, address, and functional data must not be logged or exposed in public responses.
- Database migrations reject pooled PostgreSQL URLs to avoid unsafe migration behavior.

## 8. Development & Testing Environment

Local Setup Instructions:

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Main Commands:

```bash
npm run dev
npm run dev:turbo
npm run build
npm run build:turbo
npm run lint
npm run typecheck
npm run test
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:supabase:status
npm run db:studio
```

Testing Frameworks: Vitest for unit tests. Existing tests cover auth config, password logic, authorization, login rate limiting, associate search params, seed config, and smoke-level behavior.

Code Quality Tools: ESLint, TypeScript `tsc --noEmit`, Prettier with Tailwind plugin, npm audit.

Runtime Notes:

- `npm run dev` uses `next dev --webpack`.
- `npm run build` uses `next build --webpack`.
- Turbopack is available via explicit `*:turbo` scripts for diagnostics.
- `scripts/run-dev-60s.sh` is the preferred controlled dev-server diagnostic wrapper on memory-constrained machines.

## 9. Future Considerations / Roadmap

- Extract data access from route files that still mix query parsing, Drizzle calls, and UI rendering.
- Continue replacing placeholder dashboard/static metrics with real persisted data.
- Expand explicit role guards for administrative routes and actions.
- Keep PostgreSQL/Supabase documentation aligned with code; remove or archive stale SQLite/libSQL references.
- Add integration tests for login/session cookies, protected routes, and high-risk server actions.
- Decide and document production hosting, observability, backup, and incident-response practices.
- Keep `README.md`, `AGENTS.md`, `DESIGN.md`, and this file synchronized when runtime or architecture decisions change.

## 10. Project Identification

Project Name: ASOF Intranet

Repository URL: https://github.com/prof-ramos/intranet.git

Primary Contact/Team: ASOF / Prof. Ramos development workflow

Date of Last Update: 2026-05-10

## 11. Glossary / Acronyms

ASOF: Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro.

MRE: Ministério das Relações Exteriores.

SERE: Secretaria de Estado das Relações Exteriores, in Brasília.

Oficial de Chancelaria: Brazilian foreign service administrative career represented by ASOF.

Associado: ASOF member represented in the `associates` table.

Lotação: Current assignment or post of a public servant; stored as `assignment`.

Posto: Diplomatic or consular representation abroad, or SERE in Brasília; stored through assignment/location fields.

SIAPE: Brazilian federal public servant registration number.

Situação associativa: ASOF membership status, represented by `associationStatus`.

Situação funcional: Public service status, represented by `functionalStatus`.

Contribuição: ASOF dues/payment status, represented by `contributionStatus`.

RSC: React Server Components.

RLS: Row-Level Security in PostgreSQL/Supabase.

SDK: Software Development Kit.
