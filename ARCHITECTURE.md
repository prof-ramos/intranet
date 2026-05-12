# Architecture Overview

This document is the living architecture map for the ASOF Intranet. Keep it updated when routes, persistence, authentication, deployment, or major module boundaries change.

## 1. Project Structure

```text
[Project Root]/
├── src/
│   ├── app/                         # Next.js App Router routes, layouts, global CSS, local fonts
│   │   ├── app/                     # Authenticated intranet area (/app/*)
│   │   │   ├── associados/          # Associates list, profile, and CSV reports
│   │   │   ├── atividades/          # Kanban board and new activity form
│   │   │   ├── auditoria/           # Audit logs (LGPD accountability)
│   │   │   ├── config/              # Configuration placeholder
│   │   │   ├── juridico/            # Legal consultations and notes (Fase 1)
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
│       ├── associates/              # Search parameter parsing + repository queries
│       ├── auth/                    # Auth config, sessions, guards, password logic, rate limiting
│       ├── db/                      # Drizzle client and schema exports
│       │   └── schema/              # admins, associates, activities, audit_logs, login_attempts,
│       │                            # legal_consultations, legal_processes, legal_notes,
│       │                            # legal_opinions, legal_opinion_tags, rate_limits
│       ├── dashboard/               # Dashboard aggregation queries
│       ├── env.ts                   # Zod-validated environment variables
│       ├── ip.ts                    # Client IP extraction from headers
│       ├── juridico/                # Repository, service, queries, formatters
│       ├── rate-limit.ts            # IP-based rate limiting (PostgreSQL-backed)
│       ├── reports/                 # Report queries and CSV serialization
│       ├── supabase/                # Supabase SDK factories for script/server use
│       └── ui/                      # Shared UI tokens/helpers
├── drizzle/
│   └── postgres/                    # Current PostgreSQL migrations
├── docs/                            # Product, design, diagnostics, and analysis docs
├── scripts/                         # Seed, diagnostics, and Supabase status scripts
├── public/                          # Static public assets
├── proxy.ts                         # Next.js 16 proxy (replaces middleware.ts) — JWT cookie validation for /app/*
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
                 |        +--> [requireAuth() — full session revalidation]
                 |        +--> [requireRole() — role-based access control]
                 |        +--> [loginRateLimiter — per-email rate limiting]
                 |
                 +--> [src/lib/env.ts — Zod env validation]
                 |
                 +--> [Drizzle ORM client]
                 |        |
                 |        +--> [Repository layer — dashboard, associates, reports, juridico]
                 |        |        +--> [src/lib/juridico/repository.ts — SQL isolation]
                 |        |        +--> [src/lib/juridico/service.ts — business rules]
                 |        |
                 |        +--> [Rate limiting — src/lib/rate-limit.ts (PostgreSQL)]
                 |        |
                 |        v
                 |  [PostgreSQL database]
                 |        +--> [audit_logs — LGPD accountability]
                 |        +--> [login_attempts — auth rate limiting]
                 |        +--> [rate_limits — IP rate limiting]
                 |
                 +--> [src/lib/ui/tokens.ts — design tokens]

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

Technologies: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, DaisyUI, Lucide React, `@hello-pangea/dnd` (kanban drag-and-drop), local Playfair and Google Sans fonts.

**Atividades board DTO design:** `BoardActivity` carries `assigneeName`/`associateName` alongside `assigneeId`/`associateId`. These fields are optimistic-render fallbacks for items created via QuickAdd before the next data sync; `peopleById` (built from the `people` prop) is the authoritative name source. UI code must always prefer the map lookup and fall back to the DTO field, not the reverse.

Deployment: Vercel-compatible Next.js application. The exact production hosting policy should be kept in deployment docs when finalized.

### 3.2. Backend Services

#### 3.2.1. Next.js Server Runtime

Name: ASOF Intranet Server Runtime

Description: Handles SSR/RSC rendering, Server Actions, authentication workflows, password change, protected app rendering, and database reads/writes.

Technologies: Next.js 16, React Server Components, TypeScript, `jose`, `bcryptjs`, Drizzle ORM.

Deployment: Runs with the Next.js application. `npm run dev` and `npm run build` use Webpack explicitly; Turbopack scripts are kept for explicit diagnostics.

#### 3.2.2. Database Access Layer

Name: Drizzle/PostgreSQL Data Layer

Description: Centralizes database access through `src/lib/db/index.ts`, using schemas from `src/lib/db/schema/*`. Runtime connections prefer `DATABASE_URL`, then `DATABASE_POSTGRES_URL`. Local development uses PostgreSQL installed by Homebrew; remote/staging/production environments use Supabase Postgres. The juridico module follows a repository pattern: `src/lib/juridico/repository.ts` isolates all SQL (with `Promise.all` for parallel queries and JOIN-based N+1 elimination), `src/lib/juridico/service.ts` contains business rules, and `src/lib/juridico/queries.ts` wraps repository calls with `unstable_cache` (module-level, with `revalidateTag` in Server Actions).

Technologies: Drizzle ORM, `postgres`, PostgreSQL.

Deployment: Server-side only. Migrations require a direct/non-pooling PostgreSQL URL via `DATABASE_MIGRATION_URL` or `DATABASE_POSTGRES_URL_NON_POOLING`. For local Homebrew PostgreSQL there is no pooler, so `DATABASE_URL` and `DATABASE_MIGRATION_URL` can point to the same local database.

#### 3.2.3. Supabase SDK Tooling

Name: Supabase Server/Admin SDK Helpers

Description: Provides script-safe Supabase client factories for administrative checks and future server-side integrations without requiring manual dashboard access.

Technologies: `@supabase/supabase-js`.

Deployment: Used only from server/script contexts. Service-role keys must never be exposed to client components.

## 4. Data Stores

### 4.1. Primary Application Database

Name: ASOF Intranet PostgreSQL Database

Type: PostgreSQL. Local development currently uses Homebrew PostgreSQL 16 on `localhost:5432`; known remote/staging/production environments use Supabase Postgres.

Purpose: Stores administrative users, ASOF associates, activity workflow records, audit logs, and login attempt tracking for rate limiting.

Key Schemas/Tables:

- `admins` — administrative users
- `associates` — ASOF members
- `activities` — administrative workflow records
- `audit_logs` — LGPD accountability trail
- `login_attempts` — per-email login rate limiting
- `legal_consultations` — legal member consultations
- `legal_processes` — legal cases (schema prepared, Fase 2)
- `legal_notes` — interaction history for consultations/processes
- `legal_opinions` — legal opinion library (schema prepared)
- `legal_opinion_tags` — opinion classification tags
- `rate_limits` — IP-based rate limiting

### 4.2. Database Architecture Decisions

#### 4.2.1. Connection Pooling

The `postgres.js` client is configured in `src/lib/db/index.ts`:

| Parameter | Value | Rationale |
|---|---|---|
| `max` | `10` (default) | Postgres.js default; Supabase pooler default is 42. Tuned for < 1000 associates |
| `max_lifetime` | `1800` (30 min) | Prevents connection leaks by recycling stale connections |
| `connect_timeout` | `10s` | Fail fast if DB is unreachable |
| `idle_timeout` | `20s` | Free idle connections during low traffic |
| `statement_timeout` | `30000` (30s) | Kills runaway queries; prevents connection pool starvation |
| `application_name` | `'asof-intranet'` | Identifies this app's queries in `pg_stat_statements` and `pg_stat_activity` |
| `prepare` | `false` if pgBouncer detected | Prepared statements are incompatible with transaction mode poolers |

SSL is enforced in production (`DB_SSL=true` or `NODE_ENV=production`).

#### 4.2.2. Indexing Strategy

Rules applied across all tables:

1. **Partial indexes** for all queries with conditional `WHERE` clauses (e.g., `WHERE status != 'arquivada'`). Smaller index, faster scans.
2. **Composite indexes** match the exact `(filter, order)` pattern of paginated queries.
3. **GIN indexes** for JSONB operators (`@>`, `?`) on `tags` columns.
4. **Trigram GIN indexes** for `LIKE '%term%'` searches on text columns.
5. **No over-indexing**: tables with < 100 rows (e.g., `admins`) have minimal indexes.

Current indexes by table:

| Table | Indexes | Pattern |
|---|---|---|
| `associates` | 8 (3 unique + 5 regular) | Trigram for name, B-tree for status, composite for status+name |
| `activities` | 9 | Partial for open items, composite for associate+due_date+id |
| `legal_consultations` | 11 | Partial for open items, composite for status+updated_at, trigram for title |
| `legal_processes` | 5 | B-tree on status, associate, type |
| `legal_notes` | 3 | Composite for entity lookup |
| `audit_logs` | 3 | Composite for entity lookup |
| `login_attempts` / `rate_limits` | 2 each | B-tree on lookup key and expiry |

#### 4.2.3. Enum Usage

PostgreSQL enums are preferred over free-text columns for status and type fields:

| Enum | Used By | Status |
|---|---|---|
| `admin_role` | `admins.role` | ✅ Correct |
| `association_status` | `associates.association_status` | ✅ Correct |
| `contribution_status` | `associates.contribution_status` | ✅ Correct |
| `functional_status` | `associates.functional_status` | ✅ Correct |
| `activity_status` | `activities.status` | ✅ Correct |
| `activity_priority` | `activities.priority` | ✅ Correct |
| `audit_entity_type` | `audit_logs.entity_type` | ✅ Correct |
| `legal_consultation_status` | `legal_consultations.status` | ✅ Correct |
| `legal_satisfaction` | `legal_consultations.satisfaction`, `legal_processes.satisfaction` (corrected in 0009) | ✅ Correct |
| `legal_process_type` | `legal_processes.type` | ✅ Correct |
| `legal_process_subtype` | `legal_processes.subtype` | ✅ Correct |
| `legal_process_status` | `legal_processes.status` | ✅ Correct |
| `legal_note_entity_type` | `legal_notes.entity_type` (fixed in 0009) | ✅ Correct |
| `assignment_type` | `assignments.type` | ✅ Correct |

**Principle:** Any column representing a bounded set of states MUST use a PostgreSQL enum. Text-only columns exist for unbounded data (names, emails, notes).

#### 4.2.4. Row-Level Security (RLS)

RLS was enabled in migration 0000 and **removed in migration 0001**. Rationale:

- All database access goes through the Next.js server layer (Server Components / Server Actions).
- No Supabase client is exposed to the browser; there is no direct client-to-DB path.
- Auth is enforced via `requireAuth()` (JWT session verification + DB admin lookup) and `requireRole()` (role-based guards).

**Risk:** Any direct database connection (e.g., Supabase client from a script, ad-hoc query tool) bypasses all authorization. RLS was reinstated in migration 0009 as a defense-in-depth layer. All tables now have `FOR ALL TO PUBLIC USING (true) WITH CHECK (true)` policies since the server layer already enforces auth. If a Supabase client is ever exposed to the browser, these policies must be narrowed to per-user or per-role rules.

#### 4.2.5. Transaction Boundaries

Transactions are used where data consistency across multiple tables is required:

| Operation | Transaction | Status |
|---|---|---|
| `generateInternalNumber` | ✅ Yes | Inside `db.transaction(tx)` for sequence isolation |
| `addNoteService` + `touchConsultationInteraction` | ✅ Yes | Note + timestamp update are atomic |
| `createConsultationService` (generate number + insert) | ✅ Yes | Fixed in service refactor |
| `updateConsultationStatus` | N/A | Single-statement update; no transaction needed |
| Bulk associate import | ❌ No | Each row is upserted individually (future work) |

#### 4.2.6. Known N+1 Patterns

- `findLinkedActivities` is called per-associate in profile view. With ~763 associates and a covering index `(associate_id, due_date, id)`, each query is a fast index-only scan. Acceptable at current scale.
- Dashboard aggregates run 3+ `count()` queries in parallel via `Promise.all`. Acceptable.

#### 4.2.7. Monitoring

- `pg_stat_statements` is installed (migration 0009) for query profiling.
- No slow-query logging threshold is configured in Postgres.
- Application-level monitoring: none currently. Consider `pglite` or Supabase observability dashboard for production.

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

### 6.1 Deploy Target

| Camada | Serviço | Tipo |
|---|---|---|
| Frontend / Serverless Functions | **Vercel** | Hospedagem Next.js com Fluid Compute (Node.js 24) |
| Banco de dados | **Supabase** | PostgreSQL 15+ gerenciado |
| DNS / CDN | Vercel Edge Network | Incluído na plataforma |
| Armazenamento de objetos (futuro) | Supabase Storage | Para anexos do módulo jurídico Fase 2 |

O projeto é uma aplicação Next.js 16 App Router **full-stack**, não apenas frontend estático. Server Components, Server Actions e Route Handlers executam nativamente na plataforma Vercel sem configuração extra.

### 6.2 Variáveis de ambiente por ambiente

#### Desenvolvimento local

Local development uses PostgreSQL installed through Homebrew, currently `postgresql@16` running as the macOS user service.

| Variável | Valor / Origem |
|---|---|
| `DATABASE_URL` | Direct local URL, e.g. `postgres://$USER@localhost:5432/asof_intranet` |
| `DATABASE_MIGRATION_URL` | Same direct local URL; there is no local pooler |
| `SESSION_SECRET` | Local development secret in `.env.local` |
| `SKIP_AUTH` / `DEV_USER_*` | Development-only auth bypass values |

Homebrew PostgreSQL usually creates a role matching the macOS username, not a `postgres` role. On this machine `$USER` resolves to `gabrielramos`; `postgres://postgres@localhost:5432/...` fails because that role does not exist.

#### Staging / Preview (Vercel)

| Variável | Origem / Dono |
|---|---|
| `SESSION_SECRET` | Gerada pelo time de infra (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `DATABASE_URL` | Pooler de conexões do Supabase (porta 6543) |
| `DATABASE_MIGRATION_URL` | URL direta/non-pooling do Supabase |
| `DATABASE_SUPABASE_URL` | Dashboard do projeto Supabase |
| `DATABASE_SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Project Settings → API → service_role key |

#### Produção (Vercel)

As mesmas variáveis do staging, apontando para o projeto Supabase de produção. `SESSION_SECRET` deve ser diferente do staging.

> **Regra:** `DATABASE_MIGRATION_URL` nunca usa pooler (porta 6543). Migrations precisam de conexão direta.

### 6.3 Fresh environment setup

Ordem para provisionar um novo ambiente do zero:

1. **Criar projeto Supabase** → anotar `DATABASE_URL` (pooler), `DATABASE_MIGRATION_URL` (direta)
2. **Configurar env vars no Vercel** (Project Settings → Environment Variables)
3. **Deploy inicial** (pode falhar se o banco estiver vazio — isso é esperado)
4. **Aplicar migrações:** `DATABASE_MIGRATION_URL="..." npx drizzle-kit migrate`
5. **Seed do admin:** `INITIAL_ADMIN_EMAIL="..." INITIAL_ADMIN_PASSWORD="..." npm run db:seed`
6. **Smoke test:** login → dashboard → associados → jurídico

### 6.4 Release checklist

Antes de promover staging → produção:

- [ ] `npm run lint` — passou
- [ ] `npm run typecheck` — passou
- [ ] `npm run test` — passou (Vitest)
- [ ] `npm run test:e2e` — passou (Playwright)
- [ ] `npm run build` — passou (gera build de produção localmente)
- [ ] Verificar se há migrações pendentes (`npx drizzle-kit migrate --dry-run` se suportado, ou comparar schema)
- [ ] Criar e validar backup/snapshot do banco de produção antes de aplicar migrações
- [ ] Aplicar migrações na produção **antes** do deploy
- [ ] Verificar env vars obrigatórias na produção
- [ ] Smoke test pós-deploy: login, dashboard, associados, jurídico, CSV download

### 6.5 CI/CD

Não há `.github/workflows` no repositório atualmente. O processo é manual via Vercel Git Integration (auto-deploy em push para `main`) ou CLI (`vercel --prod`).

**Recomendação futura:** adicionar GitHub Actions com:
- Job `lint-test-build` em todo PR
- Job `e2e` com Playwright + banco de testes
- Job `migrate-staging` em merge para `main`
- Job `migrate-prod` manual (triggered) antes de promote

Monitoring & Logging: No dedicated monitoring stack is currently configured in code. Local diagnostics live in `scripts/run-dev-60s.sh`.

## 7. Security Considerations

Authentication: JWT session cookie named `__Host-asof-session` (prefixo `__Host-` requer HTTPS), signed/verified with `jose`. Cookie attributes: `Secure`, `HttpOnly`, `SameSite=Strict`, `Partitioned`. Login and password-change behavior live under `src/lib/auth` and `src/app/login` / `src/app/change-password`.

Authorization: Roles are `admin`, `diretoria`, and `secretaria`. Route-level restrictions exist through `requireRole()`; the juridico module blocks `secretaria` at layout level (`src/app/app/juridico/layout.tsx`).

Data Encryption: TLS is expected for production HTTP and database transport. Runtime database SSL is required automatically in production or when `DB_SSL=true` / `sslmode=require` is present.

Key Security Tools/Practices:

- `SESSION_SECRET` must be at least 32 characters.
- `SKIP_AUTH=true` works only outside production.
- Service-role Supabase keys are server/script-only.
- Sensitive ASOF data such as CPF, SIAPE, email, address, and functional data must not be logged or exposed in public responses.
- Database migrations reject pooled PostgreSQL URLs to avoid unsafe migration behavior.
- Login rate limiting is backed by PostgreSQL (`login_attempts` table) for multi-instance consistency.
- IP-based rate limiting (`rate_limits` table) protects report downloads (10 req/min) and juridico Server Actions (30 req/min).
- Audit trail for CSV downloads: every `report_download` is logged in `audit_logs` with filters, fields, and row count (LGPD accountability).
- CSV injection prevention: cells starting with `-`, `=`, `+`, `@`, or tab are prefixed with `\t` and quoted.
- Dummy bcrypt hash is used when user is not found to prevent timing-based user enumeration.
- `createdBy` is derived from the JWT session, never from client-provided FormData.
- LIKE queries escape `%` and `_` to prevent wildcard injection.
- All environment variables are validated via Zod in `src/lib/env.ts` at startup.

## 8. Development & Testing Environment

Local Setup Instructions:

```bash
npm install
cp .env.example .env.local
createdb asof_intranet
npm run db:migrate
npm run db:seed
npm run dev
```

For local Homebrew PostgreSQL, `.env.local` should use the macOS role:

```bash
DATABASE_URL=postgres://$USER@localhost:5432/asof_intranet
DATABASE_MIGRATION_URL=postgres://$USER@localhost:5432/asof_intranet
```

Main Commands:

```bash
npm run dev
npm run dev:turbo
npm run build
npm run build:turbo
npm run lint
npm run typecheck
npm run format
npm run format:check
npm run audit
npm run test
npm run test:db
npm run test:watch
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:debug
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:supabase:status
npm run db:studio
```

Testing Frameworks: Vitest for unit tests; Playwright for E2E tests. Integration tests with real PostgreSQL run via `vitest.integration.config.ts` and require `DATABASE_URL`.

- Unit tests: `npx vitest run` (14 files, 95 tests) — auth, password, authorization, login rate limiting, associate search params, juridico service validation, validation schemas, env config.
- Database schema contract tests: `npm run test:db` — validates the real PostgreSQL database against the expected tables, columns, enums, indexes, `pg_trgm`, migration SQL files, `_journal.json`, and `drizzle.__drizzle_migrations`.
- Integration tests: `npx vitest run --config vitest.integration.config.ts` — juridico service with DB insertion, login rate limiter with PostgreSQL store. Requires a dedicated test database (never dev/prod). Set `DATABASE_URL` via `.env.test.local` or shell export; create the test DB and run migrations before first use.
- E2E tests: `npm run test:e2e` — Playwright with authentication fixtures.

Code Quality Tools: ESLint, TypeScript `tsc --noEmit`, Prettier with Tailwind plugin, npm audit.

Runtime Notes:

- `npm run dev` uses `next dev --webpack`.
- `npm run build` uses `next build --webpack`.
- Turbopack is available via explicit `*:turbo` scripts for diagnostics.
- `scripts/run-dev-60s.sh` is the preferred controlled dev-server diagnostic wrapper on memory-constrained machines.

## 9. Future Considerations / Roadmap

- ~~Continue extracting data access from route files into repository modules (`src/lib/*/queries.ts`).~~ ✅ Done for juridico module (`src/lib/juridico/repository.ts`, `service.ts`).
- ~~Replace remaining placeholder dashboard/static metrics with real persisted data.~~ ✅ Dashboard jurídico agora usa queries reais.
- ~~Expand explicit role guards for administrative routes and actions.~~ ✅ `requireRole()` ativo em `/app/juridico`.
- ~~Keep PostgreSQL/Supabase documentation aligned with code; remove or archive stale SQLite/libSQL references.~~ ✅ SQLite/libSQL references removidos.
- Add integration tests for login/session cookies, protected routes, and high-risk server actions.
- Decide and document production hosting, observability, backup, and incident-response practices.
- Keep `README.md`, `AGENTS.md`, `DESIGN.md`, `CLAUDE.md`, `API.md`, `CONTRIBUTING.md`, and this file synchronized when runtime or architecture decisions change.
- Implement Fase 2 do módulo jurídico: processos, pareceres, biblioteca de pareceres, anexos.
- Add IP-based rate limiting to login endpoint (currently per-email only via `login_attempts`; IP-based `rate_limits` table exists but is not wired to login).
- Evaluate formal API documentation (OpenAPI/Swagger) if REST endpoints grow.

## 10. Project Identification

Project Name: ASOF Intranet

Repository URL: https://github.com/prof-ramos/intranet.git

Primary Contact/Team: ASOF / Prof. Ramos development workflow

Date of Last Update: 2026-05-11

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
