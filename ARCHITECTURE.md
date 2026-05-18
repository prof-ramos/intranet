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
│   │   │   ├── config/              # Configuration modules (users, assignments, audit, webhooks)
│   │   │   ├── financeiro/          # Monthly payments and financial dashboard
│   │   │   ├── juridico/            # Legal consultations and notes (Fase 1)
│   │   │   ├── layout.tsx           # Authenticated app shell
│   │   │   └── page.tsx             # Dashboard
│   │   ├── change-password/         # Required password-change flow
│   │   ├── login/                   # Login page and server actions
│   │   ├── globals.css              # Tailwind/DaisyUI theme entrypoint
│   │   ├── layout.tsx               # Root layout and font wiring
│   │   └── page.tsx                 # Root redirect entrypoint
│   ├── components/                  # Shared UI shell components
│   └── lib/
│       ├── associates/              # Search parameter parsing + repository queries + PII masking
│       ├── auth/                    # Auth config, sessions, guards, password logic, rate limiting
│       ├── crypto/                  # HKDF key derivation, AES-256-GCM encryption, PII blind indexes
│       ├── db/                      # Drizzle client and schema exports
│       │   └── schema/              # admins, associates, activities, assignments, audit_logs, login_attempts,
│       │                            # legal_consultations, legal_processes, legal_notes, legal_opinions,
│       │                            # legal_opinion_tags, monthly_payments, oficios, rate_limits,
│       │                            # domain_events, webhook_subscriptions, webhook_deliveries,
│       │                            # integration_api_keys, enums, views
│       ├── dashboard/               # Dashboard aggregation queries
│       ├── env.ts                   # Zod-validated environment variables
│       ├── events.ts                # In-process domain event bus
│       ├── integrations/            # Versioned integration auth, JSON envelopes, rate limiting, and route helpers
│       │   ├── auth.ts              # Dual-auth (env-var OR table-backed API keys with scopes)
│       │   ├── config.ts            # Integration environment configuration
│       │   ├── http.ts              # JSON envelopes, request ID, error helpers
│       │   ├── keys/                # API key CRUD (service, repository)
│       │   ├── outbox.ts            # Domain event outbox with PII sanitization
│       │   ├── rate-limit.ts        # PostgreSQL-backed API rate limiter
│       │   ├── types.ts             # Shared integration types (scopes, auth results, signatures)
│       │   └── webhooks/            # Webhook dispatch, subscription management, secrets
│       ├── juridico/                # Repository, service, queries, formatters
│       ├── notifications/           # Real-time notification system (repository, service, events)
│       ├── oficios/                 # Official letters repository + service
│       ├── sanitize-pii.ts         # Shared PII sanitizer for audit logs and webhooks
│       ├── reports/                # Report queries and CSV serialization
│       ├── supabase/                # Supabase SDK factories for script/server use
│       │   └── client.ts            # Supabase realtime client for notifications
│       └── ui/                      # Shared UI tokens/helpers
├── drizzle/
│   └── postgres/                    # Current PostgreSQL migrations
├── docs/                            # Product, design, diagnostics, and analysis docs
├── scripts/                         # Seed, diagnostics, and Supabase status scripts
├── public/                          # Static public assets
├── proxy.ts                         # Next.js 16 proxy (replaces middleware.ts) — Supabase user lookup for /app/*
├── drizzle.config.ts                # Drizzle migration config for PostgreSQL
├── next.config.ts                   # Next.js config
├── package.json                     # npm scripts and dependencies
├── DESIGN.md                        # Visual design system documentation
├── README.md                        # Project overview and quick start
└── ARCHITECTURE.md                  # This document
```

## 2. High-Level System Diagram

```text
[Internal ASOF User]                          [External Integration Consumer]
        |                                              |
        v                                              v
[Next.js App Router UI]                    [/api/v1/events, /api/v1/health]
        |                                              |
        +--> [proxy.ts route guard] --> [Supabase user lookup]
        |                                              |
        +--> [Server Components / Server Actions]    +--> [Integration auth helpers]
                 |                                           +--> [env-var key (full access)]
                 +--> [Auth helpers in src/lib/auth]         +--> [table-backed key (scoped)]
                 |        +--> [requireAuth() — full session revalidation]
                 |        +--> [requireRole() — role-based access control]
                 |        +--> [loginRateLimiter — per-email rate limiting]
                 |        +--> [Integration auth — dual path: env OR table]
                 |        +--> [Data access logging — LGPD Art. 30/37]
                 |
                 +--> [src/lib/env.ts — Zod env validation]
                 +--> [src/lib/crypto/ — HKDF + AES-256-GCM + HMAC blind indexes]
                 +--> [src/lib/sanitize-pii.ts — shared PII redaction]
                 +--> [src/lib/integrations/* — versioned HTTP helpers for /api/v1/*]
                 |
                 +--> [Drizzle ORM client]
                 |        |
                 |        +--> [Repository layer — dashboard, associates, reports, juridico, oficios]
                 |        |        +--> [src/lib/juridico/repository.ts — SQL isolation]
                 |        |        +--> [src/lib/juridico/service.ts — business rules]
                 |        |        +--> [src/lib/associates/repository.ts — HMAC blind index lookups]
                 |        |        +--> [src/lib/associates/service.ts — PII decrypt/mask per role]
                 |        |
                 |        +--> [Rate limiting — src/lib/integrations/rate-limit.ts (PostgreSQL)]
                 |        |
                 |        v
                 |  [PostgreSQL database]
                 |        +--> [audit_logs — LGPD accountability + data access logging]
                 |        +--> [login_attempts — auth rate limiting (HMAC email hash)]
                 |        +--> [rate_limits — IP rate limiting]
                 |        +--> [domain_events — outbox with PII sanitization + retention]
                 |        +--> [webhook_subscriptions — encrypted secrets, event subscriptions]
                 |        +--> [webhook_deliveries — delivery attempts, idempotency keys, failure reasons]
                 |        +--> [integration_api_keys — scoped API keys, HMAC hashed]
                 |        +--> [associates_list_view — PII-safe view excluding sensitive columns]
                 |
                 +--> [src/lib/ui/tokens.ts — design tokens]

[Admin scripts]
        |
        +--> [Drizzle Kit migrations]
        |
        +--> [Seed/status scripts]
        |
        +--> [backfill-pii-encryption.ts — idempotent PII encryption backfill]
        |
        +--> [Supabase SDK helpers] --> [Supabase project APIs]
```

The application is intentionally compact: the web UI and backend behavior live in one Next.js codebase. Server Components and Server Actions own most request-time work. `proxy.ts` performs coarse protected-route validation before the protected app renders. Database access is centralized through Drizzle.

## 3. Core Components

### 3.1. Frontend

Name: ASOF Intranet Web App

Description: Internal web interface for ASOF administrative staff and leadership. It currently supports an authenticated dashboard, associates list, associate profile view, activity kanban, new activity form, finance, legal consultations, official letters, configuration screens, login, and forced password-change flow. The root configuration screen still has a small placeholder area for future operational preferences.

Technologies: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, DaisyUI, Lucide React, `@hello-pangea/dnd` (kanban drag-and-drop), local Playfair and Google Sans fonts.

**Atividades board DTO design:** `BoardActivity` carries `assigneeName`/`associateName` alongside `assigneeId`/`associateId`. These fields are optimistic-render fallbacks for items created via QuickAdd before the next data sync; `peopleById` (built from the `people` prop) is the authoritative name source. UI code must always prefer the map lookup and fall back to the DTO field, not the reverse.

Deployment: Vercel-compatible Next.js application. The exact production hosting policy should be kept in deployment docs when finalized.

### 3.2. Backend Services

#### 3.2.1. Next.js Server Runtime

Name: ASOF Intranet Server Runtime

Description: Handles SSR/RSC rendering, Server Actions, authentication workflows, password change, protected app rendering, and database reads/writes.

Technologies: Next.js 16, React Server Components, TypeScript, Supabase Auth, `bcryptjs`, Drizzle ORM.

Deployment: Runs with the Next.js application. `npm run dev` and `npm run build` use Webpack explicitly; Turbopack scripts are kept for explicit diagnostics.

#### 3.2.2. Database Access Layer

Name: Drizzle/PostgreSQL Data Layer

Description: Centralizes database access through `src/lib/db/index.ts`, using schemas from `src/lib/db/schema/*`. Runtime connections prefer `DATABASE_URL`, then `DATABASE_POSTGRES_URL`. Local development uses PostgreSQL installed by Homebrew; remote/staging/production environments use Supabase Postgres. The juridico module follows a repository pattern: `src/lib/juridico/repository.ts` isolates all SQL (with `Promise.all` for parallel queries and JOIN-based N+1 elimination), `src/lib/juridico/service.ts` contains business rules, and `src/lib/juridico/queries.ts` wraps repository calls with `unstable_cache` (module-level, with `revalidateTag` in Server Actions).

Technologies: Drizzle ORM, `postgres`, PostgreSQL.

Deployment: Server-side only. Migrations require a direct/non-pooling PostgreSQL URL via `DATABASE_MIGRATION_URL` or `DATABASE_POSTGRES_URL_NON_POOLING`. For local Homebrew PostgreSQL there is no pooler, so `DATABASE_URL` and `DATABASE_MIGRATION_URL` can point to the same local database.

#### 3.2.3. Integration HTTP Foundation

Name: Versioned Integration Helpers

Description: Provides the `/api/v1/*` groundwork for outbound integrations and inbound API access. The foundation includes: shared JSON envelopes, request ID propagation, dual-auth API key verification (env-var OR table-backed with scopes), HMAC-SHA-256 timestamp verification, PostgreSQL-backed rate limiting (60 req/15min/IP), an authenticated health route, an operator-facing `/api/v1/events` route, and a bearer-only cron `/api/v1/events/dispatch` route. Outbound webhook dispatch uses `Promise.allSettled()` for parallel delivery with deterministic idempotency keys (`{eventId}:{subscriptionId}`). Event payloads are persisted through an outbox (`domain_events`) with event-type allowlists, PII sanitization via shared `sanitize-pii.ts`, and 90-day retention (`expiresAt`). Failed deliveries are tracked with `failureReason` column. Webhook subscription secrets are stored as `secret_ciphertext` encrypted with HKDF-derived keys.

Technologies: Next.js Route Handlers, Web `Request`/`Response`, Node `crypto`, Drizzle ORM, PostgreSQL.

Deployment: Server-side only. Integration auth supports two paths: (1) env-var keys (`ASOF_INTEGRATION_API_KEY` + `ASOF_INTEGRATION_HMAC_SECRET`) with unrestricted access, and (2) table-backed API keys (`integration_api_keys`) with per-key scope arrays. Table-backed keys use HMAC-SHA-256 for key hashing and scope validation per endpoint. Scheduled dispatch uses Vercel Cron in `vercel.json` and validates `Authorization: Bearer $CRON_SECRET`.

#### 3.2.4. Supabase SDK Tooling

Name: Supabase Server/Admin SDK Helpers

Description: Provides script-safe Supabase client factories for administrative checks and future server-side integrations without requiring manual dashboard access.

Technologies: `@supabase/supabase-js`.

Deployment: Used only from server/script contexts. Service-role keys must never be exposed to client components.

### 3.2.5. Notification System

Name: Real-time Notification System

Description: Provides in-app notifications for activity reassignments and legal consultation updates using Supabase realtime subscriptions. Notifications are created via repository methods, delivered through a client-side hook with optimistic UI updates, and marked as read individually or in bulk.

Technologies: Supabase realtime (`@supabase/supabase-js`), React hooks, Server Actions.

Key files:
- `src/lib/notifications/repository.ts` — create, list, count unread, mark read, mark all read
- `src/lib/notifications/service.ts` — business logic layer
- `src/lib/events.ts` — in-process event bus used by notifications
- `src/components/NotificationBell.tsx` — UI component with realtime subscription
- `src/hooks/useNotifications.ts` — realtime subscription hook
- `src/app/app/notifications/actions.ts` — Server Actions for notification mutations
- `src/lib/supabase/client.ts` — Supabase client factory for realtime

Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Data Stores

### 4.1. Primary Application Database

Name: ASOF Intranet PostgreSQL Database

Type: PostgreSQL. Local development currently uses Homebrew PostgreSQL 16 on `localhost:5432`; known remote/staging/production environments use Supabase Postgres.

Purpose: Stores administrative users, ASOF associates, activity workflow records, audit logs, and login attempt tracking for rate limiting.

Key Schemas/Tables:

- `admins` — administrative users
- `associates` — ASOF members (PII fields encrypted at rest with AES-256-GCM; HMAC blind indexes for searchable fields)
- `activities` — administrative workflow records (`position` column is `integer`, not `real`)
- `audit_logs` — LGPD accountability trail + data access logging (`access_type: 'view' | 'export' | 'edit'`)
- `login_attempts` — per-email login rate limiting (email stored as HMAC-SHA-256 hash)
- `legal_consultations` — legal member consultations
- `legal_processes` — legal cases (schema prepared, Fase 2)
- `legal_notes` — interaction history for consultations/processes
- `legal_opinions` — legal opinion library (FK to `legal_processes`)
- `legal_opinion_tags` — opinion classification tags
- `monthly_payments` — payment records (CHECK: month 1-12, year 2000-2100)
- `oficios` — official documents (CHECK: year 2000-2100, sequence > 0)
- `rate_limits` — IP-based rate limiting (unique index on key+scope, `integer` counters)
- `domain_events` — integration outbox with `expiresAt` for retention (90-day default), PII-sanitized payloads
- `webhook_subscriptions` — configured outbound webhook destinations, with encrypted `secret_ciphertext`
- `webhook_deliveries` — delivery attempts, idempotency keys, failure reasons, status, response excerpts, retry scheduling
- `integration_api_keys` — persisted M2M API keys with scopes, HMAC-SHA-256 hashed
- `notifications` — real-time notification system (activity reassignments, legal consultation updates) with RLS
- `associates_list_view` — PII-safe view excluding CPF, SIAPE, email, phone, address, WhatsApp ciphertext/hash columns

Encrypted columns pattern: Each PII field has a `{field}Ciphertext` column (AES-256-GCM, `enc:v2:{keyId}.{iv}.{authTag}.{ciphertext}`) and a `{field}Hash` column (HMAC-SHA-256 blind index). Application code reads ciphertext with per-column fallback to plaintext during backfill transition.

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

| Table | Est. Indexes | Primary Patterns (Authority: Migration files / Schema) |
|---|---|---|
| `associates` | 10 | GIN trigram for name, HMAC hash indexes for CPF/SIAPE/email lookups, composite for status+name, partial for active |
| `activities` | 9 | Partial for open items, composite for associate+due_date+id |
| `legal_consultations` | 11 | Partial for open items, composite for status+updated_at, trigram for title |
| `legal_processes` | 5 | B-tree on status, associate, type |
| `legal_notes` | 3 | Composite for entity lookup |
| `audit_logs` | 3 | Composite for entity lookup |
| `monthly_payments` | 3 | Unique index for (associate, year, month), composite for status+contribution, FK on associate_id |
| `oficios` | 3 | DESC on created_at, B-tree on year, unique on year+sequence |
| `login_attempts` / `rate_limits` | 2 each | B-tree on lookup key and expiry; rate_limits has unique index on (key, scope) |
| `domain_events` | 8 | Event type, entity lookup, actor, status, occurred_at, partial for pending, retention expiry |
| `webhook_subscriptions` | 6 | Name uniqueness, target URL, partial for active, creator, subscribed event lookup |
| `webhook_deliveries` | 6 | Request id uniqueness, event/subscription lookup, status/retry, idempotency key uniqueness |
| `integration_api_keys` | 3 | HMAC hash for lookup, partial for active keys |

> **Nota:** As contagens acima são informativas. A fonte canônica de verdade para o schema e índices são os arquivos em `src/lib/db/schema/` e as migrações em `drizzle/postgres/`. O comando `npm run verify:indexes` (script `scripts/verify-indexes.ts`) valida periodicamente se os índices no banco batem com os padrões documentados.

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
| `legal_satisfaction` | `legal_consultations.satisfaction`, `legal_processes.satisfaction` (corrected in 0009) | ✅ Correct (shared, in `enums.ts`) |
| `legal_process_type` | `legal_processes.type` | ✅ Correct |
| `legal_process_subtype` | `legal_processes.subtype` | ✅ Correct |
| `legal_process_status` | `legal_processes.status` | ✅ Correct |
| `legal_note_entity_type` | `legal_notes.entity_type` (fixed in 0009) | ✅ Correct |
| `assignment_type` | `assignments.type` | ✅ Correct |
| `domain_event_type` | `domain_events.event_type` | ✅ Correct |
| `domain_event_entity_type` | `domain_events.entity_type` | ✅ Correct |
| `domain_event_delivery_status` | `domain_events.delivery_status` | ✅ Correct |
| `webhook_delivery_status` | `webhook_deliveries.status` | ✅ Correct |
| `payment_method` | `monthly_payments.method` | ✅ Correct (shared, in `enums.ts`) |

**Principle:** Any column representing a bounded set of states MUST use a PostgreSQL enum. Text-only columns exist for unbounded data (names, emails, notes). Cross-file shared enums (`payment_method`, `legal_satisfaction`) are centralized in `src/lib/db/schema/enums.ts`.

#### 4.2.4. Row-Level Security (RLS)

RLS was enabled in migration 0000, removed in migration 0001, reinstated in migration 0009, and hardened in migration 0023.

**Current state:** All 16 application tables have `FORCE ROW LEVEL SECURITY` applied and all policies use `TO authenticated` (not `TO PUBLIC`). This blocks anonymous (`anon`) database access while allowing authenticated connections.

**Rationale:** All database access goes through the Next.js server layer (Server Components / Server Actions). No Supabase client is exposed to the browser for direct database writes. Auth is enforced via `requireAuth()` (Supabase session lookup + DB admin lookup) and `requireRole()` (role-based guards).

**LGPD Security & RLS Hardening:**
1. **Authenticated-only policies:** Migration 0023 changed all policies from `TO PUBLIC` to `TO authenticated` and applied `FORCE ROW LEVEL SECURITY`. This blocks `anon` role at the DB level.
2. **Monitoring:** Recomenda-se monitorar conexões diretas ao banco que não utilizem `application_name='asof-intranet'`.
3. **Session Context:** Futuras iterações devem adotar predicados RLS que referenciem o estado da sessão, como `current_setting('app.user_id')`, fornecendo uma trava adicional no nível do banco (deferred — W3.0).
4. **Service-role Keys:** As chaves de serviço do Supabase (`service_role`) possuem privilégios totais e **devem** ser rotacionadas periodicamente, nunca commitadas e auditadas.
5. **Narrowing:** Caso um cliente Supabase seja exposto ao browser, as políticas devem ser imediatamente restritas para `per-user` ou `per-role`.
6. **Verification:** `npm run test:db` must include explicit checks for `relrowsecurity` and `pg_policies` on LGPD-sensitive tables whenever migrations change RLS, enums, FKs, or indexes.

#### 4.2.5. Transaction Boundaries

Transactions are used where data consistency across multiple tables is required:

| Operation | Transaction | Status |
|---|---|---|
| `generateInternalNumber` | ✅ Yes | Inside `db.transaction(tx)` for sequence isolation |
| `addNoteService` + `touchConsultationInteraction` | ✅ Yes | Note + timestamp update are atomic |
| `createConsultationService` (generate number + insert) | ✅ Yes | Fixed in service refactor |
| `updateConsultationStatus` | N/A | Single-statement update; no transaction needed |
| `initializeMonth` | ✅ Yes | `db.transaction()` wraps all individual upserts |
| `dispatchDomainEventById` | ✅ Yes | `db.transaction()` wraps claim + delivery |
| `rotateApiKey` | ✅ Yes | `db.transaction()` creates new key and revokes old atomically |
| Bulk associate import | ❌ No | Each row is upserted individually (future work) |

#### 4.2.6. Known N+1 Patterns

- `findLinkedActivities` is called per-associate in profile view. With ~763 associates and a covering index `(associate_id, due_date, id)`, each query is a fast index-only scan. Acceptable at current scale.
- Dashboard aggregates run 3+ `count()` queries in parallel via `Promise.all`. Acceptable.

#### 4.2.7. Monitoring

- `pg_stat_statements` is installed (migration 0009) for query profiling.
- No slow-query logging threshold is configured in Postgres.
- Application-level logging: structured logger (`src/lib/logger.ts`) with PII redaction, configurable `LOG_LEVEL`, and JSON output in production. No external APM (Sentry, Datadog) is currently configured.
- RLS monitoring should flag direct connections whose `application_name` is missing or differs from `asof-intranet`, especially before enabling any browser-side Supabase feature.

## 5. External Integrations / APIs

Service Name: Supabase

Purpose: Managed PostgreSQL database hosting and programmatic database status checks.

Integration Method: PostgreSQL connection strings for Drizzle runtime/migrations; Supabase JavaScript SDK for server/admin tooling.

Service Name: Integration Consumers (outbound)

Purpose: External automation consumers can receive signed outbound events from the intranet, such as workflow tools or other approved systems.

Integration Method: Domain services emit minimized events into `domain_events`. `/api/v1/events` dispatches pending or specific events for manual/operator use, while `/api/v1/events/dispatch` runs the scheduled bearer-only batch path for Vercel Cron. Each outbound POST is signed with HMAC SHA-256, delivery attempts are recorded in `webhook_deliveries`, manual/scheduled dispatches are audited with `audit_logs.entity_type = 'domain_event'`, and subscription administration is audited with `audit_logs.entity_type = 'webhook_subscription'`. There is no public inbound webhook endpoint yet.

Current event types:

- `legal_consultation.created`
- `legal_consultation.status_changed`
- `associate.updated`
- `monthly_payment.updated`
- `official_letter.created`
- `official_letter.published`

Operational constraints:

- The dispatcher uses a 10s fetch timeout per delivery.
- Retry scheduling is recorded in `webhook_deliveries`; on the Vercel Hobby/Free plan, Vercel Cron calls `/api/v1/events/dispatch` once per day (`0 3 * * *`) and skips retries whose `next_retry_at` is still in the future. Manual/operator dispatch through `/api/v1/events` remains available for urgent batches.
- `associate.updated` emits only `associateId`, safe changed field names, and an internal app link. It never emits CPF, SIAPE, emails, phone, address, WhatsApp, birth date, or internal notes.
- Webhook subscription management is available only inside the authenticated admin UI at `/app/config/integracoes/webhooks`; no public CRUD endpoint exists for subscriptions.
- Webhook target URLs must be public HTTPS endpoints; localhost, local/internal hostnames, and private/link-local/reserved IP ranges are rejected before persistence.
- Plaintext legacy webhook secrets are accepted only for transition; no secret value is logged.

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

O deploy de produção usa o domínio customizado `https://intranet.asof.com.br`. O projeto deve ser tratado pela Vercel como **Next.js**, não como `Other`/site estático. Essa decisão fica versionada em `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
```

Não configure `outputDirectory` para `public` ou `.` neste projeto. Para Next.js, deixe a Vercel usar o output do framework; caso contrário, o deploy pode ficar `Ready` mas servir apenas arquivos estáticos, causando `404 NOT_FOUND` em rotas como `/`, `/login` e `/app`.

#### Incidente de deploy — 2026-05-12

Sintoma observado:

- `vercel inspect intranet.asof.com.br` resolvia para um deployment `Ready`;
- `https://intranet.asof.com.br/`, `/login` e `/app` retornavam `HTTP/2 404` com `x-vercel-error: NOT_FOUND`;
- URLs internas `*.vercel.app` retornavam `401` por Vercel Authentication;
- arquivos estáticos como `/next.svg` podiam retornar `200`;
- o build log listava rotas Next.js válidas, mas a borda servia comportamento de site estático.

Causa raiz:

- o projeto estava configurado na Vercel como `Framework Preset: Other`, com `Output Directory: public if it exists, or .`;
- como havia `public/`, o domínio customizado servia o output estático em vez do app Next.js;
- o problema não estava no código da app, proxy/middleware, DNS, certificado ou Vercel Authentication.

Correção aplicada:

- adicionar `"framework": "nextjs"` em `vercel.json`;
- redeployar produção com `vercel deploy --prod --yes`;
- validar o domínio customizado depois do deploy.

Validação esperada:

```bash
vercel project inspect asof-intranet
vercel inspect intranet.asof.com.br

curl -sSI https://intranet.asof.com.br/
curl -sSI https://intranet.asof.com.br/app
curl -sSI https://intranet.asof.com.br/login
```

Resultado saudável:

- `/` retorna `307` para `/app`;
- `/app` retorna `307` para `/login` quando não há sessão;
- `/login` retorna `200`;
- `vercel inspect intranet.asof.com.br` mostra `status Ready` e aliases incluindo `https://intranet.asof.com.br`.

Se `/login` voltar a responder `404 NOT_FOUND`, conferir primeiro:

1. `vercel project inspect asof-intranet` — deve indicar framework Next.js, não `Other`.
2. `vercel inspect intranet.asof.com.br` — deve apontar para o deployment de produção mais recente.
3. `vercel alias list | rg 'intranet\.asof\.com\.br'` — deve apontar o domínio para o deployment esperado.
4. `curl -sSI https://intranet.asof.com.br/next.svg` — se estático retorna `200` mas rotas Next retornam `404`, suspeite de output estático/Framework Preset errado.

Validacao de 2026-05-17: o Project Setting remoto foi ajustado para `Framework Preset: Next.js`, `Build Command: npm run build` ou `next build`, e `Output Directory: Next.js default`. O dominio customizado respondeu com `/` -> `307 /app`, `/app` -> `307 /login` sem sessao, e `/login` -> `200` com cabecalho Next.js.

### 6.2 Variáveis de ambiente por ambiente

#### Desenvolvimento local

Local development uses PostgreSQL installed through Homebrew, currently `postgresql@16` running as the macOS user service.

| Variável | Valor / Origem |
|---|---|
| `DATABASE_URL` | Direct local URL, e.g. `postgres://$USER@localhost:5432/asof_intranet` |
| `DATABASE_MIGRATION_URL` | Same direct local URL; there is no local pooler |
| `SKIP_AUTH` / `DEV_USER_*` | Development-only auth bypass values |

Homebrew PostgreSQL usually creates a role matching the macOS username, not a `postgres` role. On this machine `$USER` resolves to `gabrielramos`; `postgres://postgres@localhost:5432/...` fails because that role does not exist.

#### Staging / Preview (Vercel)

Staging/preview deve usar um projeto Supabase separado de produção. Previews não devem apontar para o banco de produção.

| Variável | Origem / Dono |
|---|---|
| `DATABASE_URL` | Pooler de conexões do Supabase (porta 6543) |
| `DATABASE_MIGRATION_URL` | URL direta/non-pooling do Supabase |
| `DATABASE_SUPABASE_URL` | Dashboard do projeto Supabase |
| `DATABASE_SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Project Settings → API → service_role key |

#### Produção (Vercel)

As mesmas variáveis do staging, apontando para o projeto Supabase de produção. O projeto Supabase oficial de produção é `uftzjmmfkoqhjjwsiynk` (`db-intranet`). Qualquer referência a `vmohxhyfgywaqfuqeuom` deve ser tratada como drift até reconciliação explícita.

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

- [ ] Supabase de produção oficial confirmado como `uftzjmmfkoqhjjwsiynk`
- [ ] Staging/preview apontando para Supabase separado de produção
- [ ] Projeto Vercel remoto com `Framework Preset: Next.js` e sem `Output Directory` estático (`public` ou `.`)
- [ ] `npm run lint` — passou
- [ ] `npm run typecheck` — passou
- [ ] `npm run test` — passou (Vitest)
- [ ] `npm run test:e2e` — passou (Playwright)
- [ ] `npm run build` — passou (gera build de produção localmente)
- [ ] Banco remoto reconciliado com `drizzle.__drizzle_migrations`, `_journal.json`, tabelas, enums, índices e extensões esperadas (`pg_trgm`)
- [ ] RLS habilitado e `FORCE ROW LEVEL SECURITY` aplicado no remoto correto; RLS restritiva por papel/sessão fica para a fase da issue #41, desde que não haja Data API/browser expondo tabelas sensíveis diretamente
- [ ] Criar e validar backup/snapshot do banco de produção antes de aplicar migrações
- [ ] Aplicar migrações na produção manualmente, com `DATABASE_MIGRATION_URL` direta/non-pooling, **antes** do deploy
- [ ] Verificar env vars obrigatórias na produção
- [ ] Plano explícito de rollback de deploy, migration e banco revisado antes da janela
- [ ] Smoke test pós-deploy obrigatório: login, dashboard, associados, jurídico e ofícios
- [ ] Financeiro validado apenas se houver dependência operacional no dia 1
- [ ] Integrações/webhooks não obrigatórios no dia 1; produção inicial deve manter `ASOF_INTEGRATIONS_ENABLED=false`, salvo decisão separada
- [ ] Notificações realtime não bloqueiam go-live; o fluxo principal deve operar sem depender de Supabase Realtime

### 6.5 CI/CD

**Estado atual (`.github/workflows/ci.yml`):**

| Job | Trigger | O que faz |
|---|---|---|
| `validate` | push/PR para `main` | lint, typecheck, unit tests (`npm run test`) |
| `build` | needs: validate | build verification (`npm run build`) |
| `database-contract` | push/PR para `main` | sobe PostgreSQL 16 em container, aplica migrations, roda `npm run test:db` |
| `e2e` | needs: validate | sobe PostgreSQL 16 em container, instala Playwright Chromium, roda `npm run test:e2e` |

**Workflows auxiliares:**

| Workflow | Trigger | O que faz |
|---|---|---|
| `migrate-staging.yml` | `workflow_dispatch` | aplica migrations em ambiente de staging com confirmação manual (`MIGRATE-STAGING`) |

**Limitações atuais:**
- Sem job `migrate-prod` automatizado — deploys e migrations de produção são manuais
- Sem notificação/alerta de falha de CI além do status do PR

**Recomendações futuras:**
- Job `migrate-prod` manual (triggered), com backup/snapshot e opt-in explícito antes de promote
- Alerta de falha de CI para canal de comunicação da equipe

**Política de deploy:** push em `main` não autoriza deploy de produção. Deploy é manual após checklist de release (6.4) e smoke test.

**Estado validado em 2026-05-18:**

- `origin/main` inclui logger estruturado, CI com E2E, workflow de migration staging e runbook operacional.
- Antes do push foram executados `npm run typecheck`, `npm run test`, `npm run lint` e `npm run build` com sucesso.
- O commit inclui endurecimento de parsing, logs seguros, actions/rotas, notificações, jurídico, financeiro, storage, integrações e testes dedicados.
- Essa atualização de código não alterou Supabase remoto, Vercel env vars, secrets ou migrations de produção.

```bash
vercel deploy --prod --yes
```

Monitoring & Logging: Structured logger (`src/lib/logger.ts`) with PII redaction, configurable levels, and JSON output in production. No dedicated external monitoring stack (Sentry, Datadog) is currently configured. Local diagnostics live in `scripts/run-dev-60s.sh`.

### 6.6 Git hygiene para deploys Vercel

Não versionar worktrees locais em `.claude/worktrees/`. Em 2026-05-12, `.claude/worktrees/associates-migration` estava rastreado como gitlink/submódulo (`mode 160000`) sem `.gitmodules`, causando o warning:

```text
Warning: Failed to fetch one or more git submodules
fatal: no submodule mapping found in .gitmodules for path '.claude/worktrees/associates-migration'
```

Esse warning polui CI/CD e deve permanecer eliminado. `.gitignore` ignora `.claude/worktrees/`; se o warning reaparecer, validar com:

```bash
git submodule status
git ls-files --stage | rg '\.claude/worktrees|160000'
```

Resultado saudável: `git submodule status` sai com código `0`, e o `rg` não encontra gitlinks em `.claude/worktrees`.

## 7. Security Considerations

Authentication: Supabase Auth cookies managed by `@supabase/ssr`, followed by local admin revalidation in `src/lib/auth/session.ts`. Login and password-change behavior live under `src/lib/auth` and `src/app/login` / `src/app/change-password`.

Authorization: Roles are `admin`, `diretoria`, and `secretaria`. Route-level restrictions exist through `requireRole()`; the juridico module blocks `secretaria` at layout level (`src/app/app/juridico/layout.tsx`).

Data Encryption: TLS is expected for production HTTP and database transport. Runtime database SSL is required automatically in production or when `DB_SSL=true` / `sslmode=require` is present. PII fields (CPF, SIAPE, email, phone, address, WhatsApp) are encrypted at rest using AES-256-GCM with HKDF key derivation (`src/lib/crypto/`). HMAC-SHA-256 blind indexes enable searchable encrypted fields. Encryption format `enc:v2:{keyId}.{iv}.{authTag}.{ciphertext}` supports zero-downtime key rotation.

Key Security Tools/Practices:

- `SKIP_AUTH=true` works only outside production.
- Service-role Supabase keys are server/script-only.
- **Dual-auth integration:** API endpoints accept both env-var API keys (unrestricted) and table-backed API keys (scoped) via `src/lib/integrations/auth.ts`. Table keys use HMAC-SHA-256 hashing and per-endpoint scope validation.
- Integration signing is HMAC-SHA256 over method, path+query, timestamp, and body hash. The versioned surface covers `/api/v1/health`, `/api/v1/events`, and `/api/v1/events/dispatch`.
- Outbound event payloads must stay within the allowlists in `src/lib/integrations/outbox.ts`. PII (CPF, SIAPE, email, phone, address, tokens, secrets, etc.) is sanitized via `src/lib/sanitize-pii.ts` before storage in `domain_events.payload` or `audit_logs.changes`.
- Webhook delivery uses `Promise.allSettled()` for parallel dispatch with deterministic idempotency keys. Failed deliveries record `failureReason` for dead-letter analysis.
- Sensitive ASOF data such as CPF, SIAPE, email, address, and functional data must not be logged or exposed in public responses.
- Database migrations reject pooled PostgreSQL URLs to avoid unsafe migration behavior.
- Login rate limiting is backed by PostgreSQL (`login_attempts` table with HMAC-SHA-256 email hashing) for multi-instance consistency.
- IP-based rate limiting (`rate_limits` table) protects report downloads (10 req/min), juridico Server Actions (30 req/min), and public API endpoints (60 req/15min/IP via `src/lib/integrations/rate-limit.ts`).
- **PII access logging:** `logDataAccess()` in `src/lib/audit/service.ts` records view/export/edit access to PII data for LGPD Art. 30/37 compliance.
- **PII-safe views:** `associates_list_view` excludes all ciphertext and hash columns, providing a safe default for list queries.
- Audit trail for CSV downloads: every `report_download` is logged in `audit_logs` with filters, fields, and row count.
- CSV injection prevention: cells starting with `-`, `=`, `+`, `@`, or tab are prefixed with `\t` and quoted.
- Dummy bcrypt hash is used when user is not found to prevent timing-based user enumeration.
- `createdBy` is derived from the authenticated server session, never from client-provided FormData.
- LIKE queries escape `%` and `_` to prevent wildcard injection.
- `sql.raw()` is banned in service code — replaced with parameterized `sql` template literals.
- CHECK constraints enforce valid ranges at the DB level (month 1-12, year 2000-2100, sequence > 0, attempt > 0).
- Core application environment variables are validated via Zod in `src/lib/env.ts` at startup. DB pool parameters use `z.coerce.number().int().positive().optional()`. Integration variables are validated in `src/lib/integrations/config.ts`.
- `idle_in_transaction_session_timeout` is set to 30s at the PostgreSQL level via `ALTER DATABASE SET`.

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

- Unit tests: `npx vitest run` — auth, password, authorization, login rate limiting, PII encryption, HKDF key derivation, HMAC blind indexes, integration auth (dual-path), API key CRUD, webhook dispatch, rate limiting, associate search params, juridico service validation, oficios, finance, validation schemas, env config, sanitize-pii.
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
- ~~Encrypt PII at rest (CPF, SIAPE).~~ ✅ Done — AES-256-GCM with HKDF key derivation and HMAC-SHA-256 blind indexes.
- ~~Add integration API keys with scoped access.~~ ✅ Done — dual-auth with env-var and table-backed keys.
- ~~RLS hardening from `TO PUBLIC` to `TO authenticated`.~~ ✅ Done — migration 0023.
- ~~PII sanitization in audit logs and domain events.~~ ✅ Done — shared `sanitize-pii.ts`.
- ~~Rate limiting for public API endpoints.~~ ✅ Done — PostgreSQL-backed limiter at 60 req/15min/IP.
- ~~Transaction wrapping for multi-table operations.~~ ✅ Done — `dispatchDomainEventById`, `initializeMonth`, `rotateApiKey`.
- Add integration tests for login/session cookies, protected routes, and high-risk server actions.
- Implement JWT-based RLS policies for critical tables (deferred — W3.0).
- Add external observability (Sentry/Datadog) for production error tracking and performance monitoring.
- Keep `README.md`, `AGENTS.md`, `DESIGN.md`, `CLAUDE.md`, `API.md`, `CONTRIBUTING.md`, and this file synchronized when runtime or architecture decisions change.
- Implement Fase 2 do módulo jurídico: processos, pareceres, biblioteca de pareceres, anexos.
- Deprecate env-var integration API key path (Phase 2 of dual-auth transition).
- Drop plaintext PII columns after backfill verification (migration pending — backfill script `scripts/backfill-pii-encryption.ts` exists; plaintext columns still in schema with per-column fallback).
- Evaluate formal API documentation (OpenAPI/Swagger) if REST endpoints grow.

## 10. Project Identification

Project Name: ASOF Intranet

Repository URL: https://github.com/prof-ramos/intranet.git

Primary Contact/Team: ASOF / Prof. Ramos development workflow

Date of Last Update: 2026-05-18

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
