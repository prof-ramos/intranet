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
│   │   │   ├── config/              # Configuration modules (users, assignments, audit)
│   │   │   ├── financeiro/          # Monthly payments and financial dashboard
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
│       ├── crypto/                    # AES-256-GCM encryption, safe-compare, versioned ciphertext format
│       ├── db/                      # Drizzle client and schema exports
│       │   └── schema/              # admins, associates, activities, assignments, audit_logs, login_attempts,
│       │                            # legal_consultations, legal_processes, legal_notes, legal_opinions,
│       │                            # legal_opinion_tags, monthly_payments, oficios, rate_limits,
│       │                            # domain_events, webhook_subscriptions, webhook_deliveries, integration_api_keys
│       ├── dashboard/               # Dashboard aggregation queries
│       ├── env.ts                   # Zod-validated environment variables
│       ├── ip.ts                    # Client IP extraction from headers
│       ├── integrations/            # Versioned integration auth, JSON envelopes, and route helpers
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
                 |        +--> [Integration auth helpers — API key + HMAC + timestamp]
                 |
                 +--> [src/lib/env.ts — Zod env validation]
                 +--> [src/lib/integrations/* — versioned HTTP helpers for /api/v1/*]
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

#### 3.2.3. Integration HTTP Foundation

Name: Versioned Integration Helpers

Description: Provides the initial `/api/v1/*` groundwork for outbound integrations. The current foundation is intentionally narrow: shared JSON envelopes, request ID propagation, API key + HMAC + timestamp verification helpers, an authenticated health route, an operator-facing `/api/v1/events` route, and a bearer-only cron `/api/v1/events/dispatch` route that dispatches persisted outbound events without exposing broad domain APIs or accepting inbound event ingestion. Event payloads are persisted through an outbox (`domain_events`) with event-type allowlists and are sanitized again before outbound delivery.

Technologies: Next.js Route Handlers, Web `Request`/`Response`, Node `crypto`.

Deployment: Server-side only. Integration auth secrets are read in `src/lib/integrations/config.ts` from `ASOF_INTEGRATIONS_ENABLED`, `ASOF_INTEGRATION_API_KEY`, `ASOF_INTEGRATION_HMAC_SECRET`, and optional `ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS`. Outbound webhook subscription secrets are stored as `secret_ciphertext` and encrypted/decrypted through `src/lib/integrations/webhooks/secrets.ts` using `ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY`. Scheduled dispatch uses Vercel Cron in `vercel.json` and validates `Authorization: Bearer $CRON_SECRET`.

#### 3.2.4. Supabase SDK Tooling

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
- `domain_events` — integration outbox for outbound domain events
- `webhook_subscriptions` — configured outbound webhook destinations, with encrypted `secret_ciphertext`
- `webhook_deliveries` — delivery attempts, status, response excerpts, and retry scheduling metadata
- `integration_api_keys` — persisted API keys with SHA-256 hashes, scopes, and `last_used_at` tracking

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
| `associates` | 8 | Trigram for name, B-tree for status, composite for status+name |
| `activities` | 9 | Partial for open items, composite for associate+due_date+id |
| `legal_consultations` | 11 | Partial for open items, composite for status+updated_at, trigram for title |
| `legal_processes` | 5 | B-tree on status, associate, type |
| `legal_notes` | 3 | Composite for entity lookup |
| `audit_logs` | 3 | Composite for entity lookup |
| `monthly_payments` | 1 | Unique index for (associate, year, month) |
| `login_attempts` / `rate_limits` | 3 / 2 | login_attempts: B-tree on email, email_hash, expiry; rate_limits: B-tree on key and expiry |
| `domain_events` | 6 | Event type, entity lookup, actor, status, occurred_at |
| `webhook_subscriptions` | 5 | Name uniqueness, target URL, active flag, creator, subscribed event lookup |
| `webhook_deliveries` | 5 | Request id uniqueness, event/subscription lookup, status/retry |

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
| `legal_satisfaction` | `legal_consultations.satisfaction`, `legal_processes.satisfaction` (corrected in 0009) | ✅ Correct |
| `legal_process_type` | `legal_processes.type` | ✅ Correct |
| `legal_process_subtype` | `legal_processes.subtype` | ✅ Correct |
| `legal_process_status` | `legal_processes.status` | ✅ Correct |
| `legal_note_entity_type` | `legal_notes.entity_type` (fixed in 0009) | ✅ Correct |
| `assignment_type` | `assignments.type` | ✅ Correct |
| `domain_event_type` | `domain_events.event_type` | ✅ Correct |
| `domain_event_entity_type` | `domain_events.entity_type` | ✅ Correct |
| `domain_event_delivery_status` | `domain_events.delivery_status` | ✅ Correct |
| `webhook_delivery_status` | `webhook_deliveries.status` | ✅ Correct |

**Principle:** Any column representing a bounded set of states MUST use a PostgreSQL enum. Text-only columns exist for unbounded data (names, emails, notes).

#### 4.2.4. Row-Level Security (RLS)

RLS was enabled in migration 0000 and **removed in migration 0001**, then **reinstated in migration 0009** with permissive policies. In **migration 0017**, RLS was hardened:

- **Critical tables** (`admins`, `associates`, `login_attempts`, `rate_limits`, `audit_logs`, `integration_api_keys`, `webhook_subscriptions`, `domain_events`, `webhook_deliveries`): policies changed from `FOR ALL TO PUBLIC USING (true) WITH CHECK (true)` to `FOR ALL TO authenticated USING (true) WITH CHECK (true)`.
- **Previously unprotected tables** (`monthly_payments`, `oficios`): RLS enabled for the first time with `FOR ALL TO authenticated USING (true) WITH CHECK (true)`.
- **Non-sensitive operational tables** (`activities`, `assignments`, `legal_consultations`, etc.): retain permissive `PUBLIC` policies since they contain no PII.

**Current posture:** `TO authenticated` policies ensure that only authenticated database connections can access PII-bearing tables. The app enforces role-based access via `requireAuth()`/`requireRole()` on top of RLS. This is defense-in-depth — if a Supabase client key were exposed, anonymous access would be blocked.

**Planned hardening (Wave 3):** JWT-based RLS policies that reference `current_setting('request.jwt.claims')` for per-role access control at the database level. This provides true row-level security even for authenticated connections.

**LGPD Security & RLS Hardening:**
1. **Authenticated-only policies:** Critical tables require `authenticated` role. App enforces role checks server-side.
2. **Monitoring:** Recomenda-se monitorar conexões diretas ao banco que não utilizam `application_name='asof-intranet'`.
3. **Session Context:** Futuras iterações devem adotar predicados RLS que referenciem o estado da sessão, como `current_setting('request.jwt.claims')`, fornecendo uma trava adicional no nível do banco.
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
| `initializeMonth` (finance) | ✅ Yes | Transaction-wrapped individual upserts; atomic rollback on partial failure |
| `dispatchDomainEventById` (single event) | ✅ Yes | Transaction wraps lock + delivery updates |
| `dispatchBatchEvents` (cron) | ✅ Yes | `SELECT FOR UPDATE SKIP LOCKED` for atomic event claiming; stuck events recovered on dispatch |
| Bulk associate import | ❌ No | Each row is upserted individually (future work) |

#### 4.2.6. Known N+1 Patterns

- `findLinkedActivities` is called per-associate in profile view. With ~763 associates and a covering index `(associate_id, due_date, id)`, each query is a fast index-only scan. Acceptable at current scale.
- Dashboard aggregates run 3+ `count()` queries in parallel via `Promise.all`. Acceptable.

#### 4.2.7. Monitoring

- `pg_stat_statements` is installed (migration 0009) for query profiling.
- No slow-query logging threshold is configured in Postgres.
- Application-level monitoring: none currently. Consider `pglite` or Supabase observability dashboard for production.
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

| Variável | Origem / Dono |
|---|---|
| `DATABASE_URL` | Pooler de conexões do Supabase (porta 6543) |
| `DATABASE_MIGRATION_URL` | URL direta/non-pooling do Supabase |
| `DATABASE_SUPABASE_URL` | Dashboard do projeto Supabase |
| `DATABASE_SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Project Settings → API → service_role key |

#### Produção (Vercel)

As mesmas variáveis do staging, apontando para o projeto Supabase de produção.

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

O repositório possui GitHub Actions em `.github/workflows/ci.yml` com lint, typecheck, testes unitários e build verification em `push`/`pull_request` para `main`. O deploy de produção é feito pela Vercel Git Integration em push para `main` ou manualmente por CLI:

```bash
vercel deploy --prod --yes
```

**Recomendação futura:** adicionar GitHub Actions com:
- Job `e2e` com Playwright + banco de testes
- Job `migrate-staging` em merge para `main`
- Job `migrate-prod` manual (triggered) antes de promote

Monitoring & Logging: No dedicated monitoring stack is currently configured in code. Local diagnostics live in `scripts/run-dev-60s.sh`.

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

Authentication: JWT session cookie named `__Host-asof-session` (prefixo `__Host-` requer HTTPS), signed/verified with `jose`. Cookie attributes: `Secure`, `HttpOnly`, `SameSite=Strict`, `Partitioned`. Login and password-change behavior live under `src/lib/auth` and `src/app/login` / `src/app/change-password`.

Authorization: Roles are `admin`, `diretoria`, and `secretaria`. Route-level restrictions exist through `requireRole()`; the juridico module blocks `secretaria` at layout level (`src/app/app/juridico/layout.tsx`).

Data Encryption: TLS is expected for production HTTP and database transport. Runtime database SSL is required automatically in production or when `DB_SSL=true` / `sslmode=require` is present. Webhook subscription secrets are encrypted at rest using AES-256-GCM (`src/lib/crypto/index.ts`) with the `enc:v1:` versioned format. PII fields (CPF, SIAPE) are scheduled for encryption at rest in Wave 1 of the DB architecture improvements plan.

Key Security Tools/Practices:

- `SKIP_AUTH=true` works only outside production.
- Service-role Supabase keys are server/script-only.
- Integration signing is HMAC-SHA256 over method, path+query, timestamp, and body hash. The current versioned surface is deliberately limited to `/api/v1/health`, `/api/v1/events`, and `/api/v1/events/dispatch`, with outbound dispatch only.
- Outbound event payloads must stay within the allowlists in `src/lib/integrations/outbox.ts`. CPF, SIAPE, email, address, phone, tokens, secrets, legal full text, official-letter body text, and internal notes must not be placed in `domain_events.payload`.
- `safeCompare` is extracted to `src/lib/crypto/safe-compare.ts` and used for both integration auth and webhook dispatch verification (timing-safe comparison).
- Integration auth (`src/lib/integrations/auth.ts`) updates `last_used_at` on the `integration_api_keys` table after successful authentication, providing usage tracking for API keys.
- Manual dispatch through `/api/v1/events` and scheduled dispatch through `/api/v1/events/dispatch` are audited before the response is returned. Webhook subscription CRUD/secret rotation is audited separately as `webhook_subscription`. Webhook delivery attempts are recorded in `webhook_deliveries`; successful delivery audit beyond the dispatch record remains future hardening.
- Batch dispatch uses `SELECT FOR UPDATE SKIP LOCKED` to claim events atomically, preventing double-processing across concurrent workers. Stuck events in `processing` status are recovered at the start of each dispatch cycle.
- Sensitive ASOF data such as CPF, SIAPE, email, address, and functional data must not be logged or exposed in public responses.
- Database migrations reject pooled PostgreSQL URLs to avoid unsafe migration behavior.
- Login rate limiting is backed by PostgreSQL (`login_attempts` table) for multi-instance consistency. Email lookups use SHA-256 hash (`email_hash` column) to avoid storing plaintext emails in rate-limit queries (migration 0018).
- IP-based rate limiting (`rate_limits` table) protects report downloads (10 req/min) and juridico Server Actions (30 req/min).
- Audit trail for CSV downloads: every `report_download` is logged in `audit_logs` with filters, fields, and row count (LGPD accountability).
- CSV injection prevention: cells starting with `-`, `=`, `+`, `@`, or tab are prefixed with `\t` and quoted.
- Dummy bcrypt hash is used when user is not found to prevent timing-based user enumeration.
- `createdBy` is derived from the JWT session, never from client-provided FormData.
- LIKE queries escape `%` and `_` to prevent wildcard injection.
- Core application environment variables are validated via Zod in `src/lib/env.ts` at startup. The isolated integration groundwork currently reads its own `ASOF_INTEGRATION_*` variables in `src/lib/integrations/config.ts`.

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
- **DB Architecture Improvements:** See `docs/db-architecture-review-2026-05-14.md` and `.omc/plans/ralplan-2026-05-14-db-improvements.md` for the full prioritized plan. Phase 1 (Quick Wins) is complete. Remaining phases cover PII encryption at rest, integration API key CRUD, transaction hardening, CHECK constraints, partial indexes, JWT-based RLS, and more.

## 10. Project Identification

Project Name: ASOF Intranet

Repository URL: https://github.com/prof-ramos/intranet.git

Primary Contact/Team: ASOF / Prof. Ramos development workflow

Date of Last Update: 2026-05-14

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
