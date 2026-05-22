# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ASOF Intranet — Sistema interno da Associação dos Oficiais de Chancelaria do Ministério das Relações Exteriores do Brasil. Gerencia ~763 associados, atividades administrativas e comunicações internas da diretoria.

**Stack:** Next.js 16.2.6 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · DaisyUI 5 · Drizzle ORM · PostgreSQL/Supabase · Supabase Auth

## Commands

```bash
# Development (use Webpack default; Turbopack is diagnostic-only)
npm run dev              # next dev --webpack
npm run dev:turbo        # next dev --turbopack (diagnostics only)

# Build & quality
npm run build            # next build --webpack
npm run build:turbo      # next build --turbopack (diagnostics only)
npm run format           # prettier --write .
npm run format:check     # prettier --check .
npm run audit            # security audit
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run test             # vitest run
npm run test:watch       # vitest
npm run test:db          # schema contract tests against live PostgreSQL DB

# E2E tests (Playwright)
npm run test:e2e         # playwright test
npm run test:e2e:ui      # playwright test --ui
npm run test:e2e:debug   # playwright test --debug

# Database
npm run db:generate      # drizzle-kit generate
npm run db:migrate       # drizzle-kit migrate
npm run db:seed          # seed admin user only (seed-associados.ts removed)
npm run db:studio        # Drizzle Studio
npm run db:supabase:status

# Validation & checks
npm run validate:quick     # typecheck + lint + unit tests
npm run validate:full      # quick validation + DB tests + build
npm run scope:check        # check changed file scope (strict)
npm run pr:check           # PR readiness checks
```

Run a single test file: `npx vitest run src/lib/auth/password.test.ts`
Run a single test: `npx vitest run -t "test name"`

**Integration tests (real PostgreSQL):**

Requires a dedicated test database (never dev/prod). Configure in `.env.test.local`:

```bash
DATABASE_URL=postgres://<user>@localhost:5432/asof_intranet_test
DATABASE_MIGRATION_URL=postgres://<user>@localhost:5432/asof_intranet_test
```

```bash
createdb asof_intranet_test
DATABASE_MIGRATION_URL=postgres://<user>@localhost:5432/asof_intranet_test npm run db:migrate
npx vitest run --config vitest.integration.config.ts
```

**E2E environment:** Playwright uses `http://localhost:3001`, not the regular
dev server on `3000`. `e2e/global-setup.ts` creates/migrates/seeds `asof_test`
and starts its own Next.js server on `127.0.0.1:3001` with `DATABASE_URL`
pointing to that test database. The E2E server sets `NEXT_E2E=1`, so
`next.config.ts` uses `distDir: ".next-e2e"` and avoids the Next.js dev lock
used by the regular `.next/dev` server. If E2E specs are run against an
existing `npm run dev` server on `3000`, they hit the `.env.local` database
(`asof_intranet` locally); the E2E users may be missing, login redirects to
`/login?error=1`, and repeated attempts can persist in `login_attempts` until
the result becomes `/login?error=rate-limit`.

**Post-change validation:** After dependency or Next/Tailwind changes, run at minimum `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.

## Architecture

### Routing & Auth Flow

- `src/proxy.ts` — Next.js 16 proxy (replaces `middleware.ts`). Coarse Supabase user lookup for `/app/:path*` routes. Redirects to `/login` if missing/invalid. No Drizzle queries here; full user revalidation happens in `requireAuth()` inside `src/app/app/layout.tsx`.
- `src/app/app/layout.tsx` — Authenticated shell. Calls `requireAuth()`, renders sidebar.
- `src/app/app/config/auditoria/page.tsx`, `src/app/app/config/page.tsx`, `src/app/app/config/usuarios/page.tsx`, `src/app/app/config/integracoes/page.tsx`, `src/app/app/config/lotacoes/page.tsx` — Thin configuration modules. Audit is read-only; users has admin-only actions.
- `src/app/app/secretaria/oficios/` — Ofício management UI (create, edit, list)
- `src/app/app/financeiro/mensalidades/` — Monthly payments management
- `src/app/login/actions.ts` — Server Action for login. Rate-limited (5 attempts / 15 min), Supabase Auth `signInWithPassword` for credential validation.
- `src/app/change-password/` — Required password-change flow for `mustChangePassword=true`.

### Database Layer

- `src/lib/db/index.ts` — Drizzle client. Prefers `DATABASE_URL`, falls back to `DATABASE_POSTGRES_URL`. Auto-detects transaction pooler (pgbouncer/port 6543) and sets `prepare: false` accordingly.
- `src/lib/db/schema/` — Drizzle schemas: `admins`, `associates`, `activities`, `audit` (table `audit_logs`), `finance`, `login_attempts`, `rate_limits`, `legal_consultations`, `legal_notes`, `legal_processes`, `legal_opinions`, `legal_opinion_tags`, `monthly_payments`, `oficios`, `assignments`, `domain_events`, `webhook_subscriptions`, `webhook_deliveries`, `integration_api_keys`, `notifications`.
- `drizzle.config.ts` — Targets PostgreSQL, writes migrations to `drizzle/postgres/`. **Rejects pooled URLs** — migrations require direct/non-pooling connection.
- **Migrations:** Use `DATABASE_MIGRATION_URL` or `DATABASE_POSTGRES_URL_NON_POOLING`.

### Database Conventions

- **Enums**: Use PostgreSQL enums for all status/type fields. Never use `text` for a bounded set of values. Shared enums (`paymentMethod`, `legalSatisfaction`) live in `src/lib/db/schema/enums.ts`.
- **Indexes**: Create partial indexes for queries with conditional `WHERE`. Use trigram GIN (`extensions.gin_trgm_ops` on Supabase) for `LIKE '%term%'`. Use composite indexes matching `(filter, order)` patterns. Prefix custom indexes with `idx_`. Each `CREATE INDEX CONCURRENTLY` must be in its own migration file (Drizzle/Supabase wrap migrations in transactions).
- **Connection pool**: `max: 10`, `max_lifetime: 1800`, `statement_timeout: 30000`, `application_name: 'asof-intranet'` in `src/lib/db/index.ts`. Pool config values are validated via Zod in `src/lib/env.ts`.
- **Transactions**: Multi-table operations MUST use `db.transaction()`. Pass the `tx` executor to repository functions that accept one. This includes `initializeMonth`, `dispatchDomainEventById`, and `rotateApiKey`.
- **RLS**: Hardened in migrations 0023 + 0044 — all policies use `TO authenticated` (not `TO PUBLIC`) and `FORCE ROW LEVEL SECURITY` is applied on all 19 application tables. Migration 0044 aligned `notifications` (the last `TO PUBLIC` outlier) to `TO authenticated` with `get_current_admin_id()`. JWT-based RLS policies are deferred; auth is enforced server-side.
- **Update safety**: `updateAssociateById` and similar functions must use typed interfaces, not `Record<string, unknown>`, to prevent unintended column overwrites.
- **Migrations**: Name SQL files with zero-padded index + description (e.g., `0009_quality_improvements.sql`). Update `meta/_journal.json` with the correct timestamp. `CREATE INDEX CONCURRENTLY` and `ALTER COLUMN TYPE ... USING` require manual migration SQL (Drizzle doesn't generate these).
- **Testing**: `npm run test:db` validates tables, columns, enums, indexes, extensions, and migration alignment against the live database.
- **CHECK constraints**: Use table-level `check()` (3rd argument of `pgTable`), not column-level `.check()` — Drizzle doesn't support column-level `.check()`. `pgEnum` already enforces enum values so CHECK constraints are only needed for range constraints.

### Data Access Pattern

Server Components fetch data directly from the database. The juridico module has a full repository/service layer; others are query-only:

- `src/lib/dashboard/queries.ts` — Dashboard aggregations
- `src/lib/associates/queries.ts` — Associate list/pagination
- `src/lib/associates/search-params.ts` — URL search-params parsing for the associates list (filters, pagination)
- `src/lib/reports/queries.ts` + `src/lib/reports/csv.ts` — Report generation
- `src/lib/finance/queries.ts` — Financial dashboard and monthly payments (repository + service in `src/lib/finance/repository.ts` / `service.ts`; `effective-payment.ts` has domain logic for contribution status derivation)
- `src/lib/juridico/repository.ts` + `service.ts` + `queries.ts` — Legal consultations (full service layer). `queries.ts` wraps repository calls with module-level `unstable_cache`; Server Actions call `revalidateTag` on mutations.
- `src/lib/oficios/repository.ts` + `service.ts` — Official letters (repository + service). `findOfficialLetters` has a default LIMIT 100; Server Actions cap at 1000.
- `src/lib/associates/repository.ts` — Associate data access. Uses HMAC blind indexes (`cpfHash`, `siapeHash`, `primaryEmailHash`) for PII lookups, never plaintext comparisons.
- `src/app/app/associados/actions.ts` — Server Actions for associate mutations (create/update). `[id]/editar/` is the edit route; `[id]/editar/EditarAssociadoForm.tsx` is the client form.
- `src/app/app/search/actions.ts` — Global search Server Action

### PII Encryption

All PII fields (CPF, SIAPE, email, phone, address, WhatsApp) are encrypted at rest using AES-256-GCM with HKDF key derivation:

- `src/lib/crypto/index.ts` — `hkdfDeriveKey(masterKey, context)` uses `crypto.hkdfSync('sha256', ...)` with domain-separated contexts (`pii-encryption`, `pii-search`, `webhook-secrets`). Supports V2 format `enc:v2:{keyId}.{iv}.{authTag}.{ciphertext}` for key rotation.
- `src/lib/crypto/pii.ts` — `encryptPii`, `decryptPii`, `piiBlindIndex`, `decryptPiiField`. Blind indexes use HMAC-SHA-256 (not plain SHA-256) to prevent offline enumeration.
- **Per-column fallback**: `decryptPiiField(row.cpfCiphertext, row.cpf)` — decrypts ciphertext if present, falls back to plaintext column. This supports incremental backfill.
- **Role-based masking**: `canViewSensitiveFields(role)` determines PII visibility. `getAssociateForEdit` decrypts for admin/diretoria, masks for secretaria.
- `src/lib/associates/lgpd.ts` — `SENSITIVE_FIELDS` set drives PII masking; includes `sourcePayload`, `primaryEmail`, and all ciphertext columns.
- `scripts/backfill-pii-encryption.ts` — Idempotent backfill script. Uses `Buffer` for key material with `buffer.fill(0)` after use.

### Application Modules

- `src/lib/activities/` — Activity (board) CRUD, assignments, workflows
- `src/lib/associates/` — Associate search, filters, repository
- `src/lib/audit/` — Audit log queries and helpers
- `src/lib/finance/` — Monthly payments, contributions
- `src/lib/integrations/` — API keys, webhooks, rate limits
- `src/lib/juridico/` — Legal consultations, processes, opinions, notes, SLA tracking
- `src/lib/notifications/` — Realtime notifications via Supabase
- `src/lib/oficios/` — Official letter (ofício) generation and management
- `src/lib/reports/` — CSV export, audit reports
- `src/lib/ai/` — Gemini integration
- `src/lib/email/` — Email message interface and sending (Mailjet)
- `src/lib/search/` — Associate and activity search queries
- `src/lib/dashboard/` — Dashboard queries and view-models
- `src/lib/routing/` — Navigation and route helpers (entry: `params.ts`)
- `src/lib/server-actions/` — Shared server action utilities (entry: `utils.ts`)
- `src/lib/validation/` — Shared validation schemas (entry: `schemas.ts`)

### Integration Auth (Dual-Auth)

`src/lib/integrations/auth.ts` supports two authentication paths with OR logic:

1. **Env-var key**: `ASOF_INTEGRATION_API_KEY` + `ASOF_INTEGRATION_HMAC_SECRET`. Env-var keys have full access (no scope restriction).
2. **Table-backed key**: `integration_api_keys` table with HMAC-SHA-256 hashed keys and scope arrays. Table keys are validated with scope checks per endpoint.

`authorizeIntegrationRequest(request, { requiredScopes, allowSessionRoles })` handles both paths plus optional session-based auth for operator UI access. Scope validation: table-backed keys must possess at least one of the `requiredScopes`; env-var keys bypass scope checks.

### PII Sanitization

`src/lib/sanitize-pii.ts` provides a shared `sanitizePiiValue()` function used by both `src/lib/audit/service.ts` and `src/lib/integrations/outbox.ts`. It redacts values for sensitive keys (CPF, SIAPE, email, phone, address, token, password, secret, etc.) while preserving structure. Handles Date, BigInt, function, and symbol values.

### Integration Rate Limiting

`src/lib/integrations/rate-limit.ts` provides a PostgreSQL-backed rate limiter using atomic `INSERT...ON CONFLICT DO UPDATE...RETURNING`. Applied to `/api/v1/events` and `/api/v1/health` endpoints. Default: 60 requests per 15-minute window per IP.

### Notifications

Real-time notification system for activities and legal consultations:

- `src/lib/notifications/repository.ts` — create, list, count unread, mark read, mark all read
- `src/lib/notifications/service.ts` — business logic layer
- `src/lib/events.ts` — in-process event bus used by notifications
- `src/components/NotificationBell.tsx` — UI component with Supabase realtime subscription
- `src/hooks/useNotifications.ts` — realtime subscription hook
- `src/app/app/notifications/actions.ts` — Server Actions for notification mutations

Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Auth & Authorization

- `src/lib/auth/config.ts` — `AUTH_ROLES` = `['admin', 'diretoria', 'secretaria']`.
- `src/lib/auth/require-auth.ts` — `requireAuth()` validates the Supabase session, queries DB for active user, caches with `React.cache()`.
- `src/lib/auth/authorization.ts` — `requireRole(['admin', 'diretoria'])` throws if the current user's role isn't in the allowed list.
- `src/lib/auth/session.ts` — server-side Supabase session lookup plus local admin revalidation.
- `src/lib/auth/password.ts` — Password policy (8+ chars, at least 1 number and 1 special character).
- `src/lib/auth/login-rate-limit.ts` — PostgreSQL-backed rate limiter (table `login_attempts`). Uses HMAC-SHA-256 for email hashing (not plain SHA-256).
- `src/lib/integrations/auth.ts` — Dual-auth for API endpoints (env-var key OR table-backed key with scopes). `authorizeIntegrationRequest()` checks integration headers first, then falls back to session auth if `allowSessionRoles` is provided.
- `src/lib/integrations/keys/service.ts` — CRUD for `integration_api_keys` table (create, list, revoke, rotate). Rotate is transactional — creates new key and revokes old in one `db.transaction()`.
- `src/lib/integrations/rate-limit.ts` — PostgreSQL-backed rate limiter for public API endpoints (60 req/15min per IP).

### Environment Validation

`src/lib/env.ts` uses Zod to validate env vars at startup. Imported in `next.config.ts` so missing required vars fail early. Do not access `process.env` directly; import from `@/lib/env`. DB connection pool params (`DB_MAX_CONNECTIONS`, `DB_CONNECT_TIMEOUT_SECONDS`, `DB_IDLE_TIMEOUT_SECONDS`) use `z.coerce.number().int().positive().optional()` — the `positiveInteger()` helper was removed from `db/index.ts`.

## Domain Context

### Vocabulary

| Term | DB Field | Meaning |
|---|---|---|
| Lotação | `assignment` | Current diplomatic post or SERE |
| Padrão/Classe | `classPattern` | Career level (A → B → C → Especial) |
| Situação associativa | `associationStatus` | ASOF membership: `ativo`, `inativo` |
| Situação funcional | `functionalStatus` | Civil service status: `ativo`, `aposentado`, `cedido`, `em_licenca` |
| Contribuição | `contributionStatus` | Dues status: `em_dia`, `inadimplente`, `pendente_migracao` |
| SIAPE | `siape` | Federal servant registration number |
| Mensalidade | `monthly_payments` | Monthly payment record |
| Ofício | `oficios` | Official document generated by the system |

### Roles

- `admin` — Administrative coordinator (internal team)
- `diretoria` — Executive board members
- `secretaria` — Administrative assistant

### Geography

~63% of ~763 associates serve abroad in ~220 posts. `locationCountry`/`locationCity` indicate assignment. Reassignments occur every 2–5 years.

## Development Auth Bypass

Set `SKIP_AUTH=true` in `.env.local` (ignored in production). Configures dev user via `DEV_USER_ID`, `DEV_USER_NAME`, `DEV_USER_EMAIL`, `DEV_USER_ROLE`, `DEV_USER_MUST_CHANGE_PASSWORD`.

## Security

- **LGPD:** CPF, SIAPE, email, phone, address, WhatsApp, and functional data are protected. Do not log or expose in API responses. All PII is encrypted at rest using AES-256-GCM with HKDF key derivation (`src/lib/crypto/`). HMAC-SHA-256 blind indexes enable searchable encrypted fields without plaintext comparison.
- **Auth:** Supabase Auth cookies via `@supabase/ssr`; do not reintroduce custom JWT `SESSION_SECRET` build requirements. Integration auth supports dual paths (env-var key OR table-backed API keys with scopes).
- **DB:** SSL required in production or when `DB_SSL=true`/`sslmode=require`. RLS policies use `TO authenticated` (not `TO PUBLIC`); `FORCE ROW LEVEL SECURITY` applied on all tables.
- **Service-role keys:** Server/script only. Never expose to client components.
- **CSV injection prevention:** Cells starting with `-`, `=`, `+`, `@`, or tab are prefixed with `\t` and quoted.
- **LIKE query safety:** Escape `%` and `_` to prevent wildcard injection.
- **PII sanitization:** `src/lib/sanitize-pii.ts` provides shared `sanitizePiiValue()` used by both audit service and webhook outbox. Never log or store plaintext PII in audit logs or domain event payloads.
- **PII encryption sunset:** Backfill script `scripts/backfill-pii-encryption.ts` exists. Code reads from ciphertext columns with per-column fallback to plaintext. Migration to drop plaintext columns is pending (plaintext columns still in schema).
- **Key rotation:** Encryption uses V2 format `enc:v2:{keyId}.{iv}.{authTag}.{ciphertext}` supporting zero-downtime key rotation. Decryption tries all known keys; encryption uses the active key.
- **Rate limiting:** PostgreSQL-backed rate limiter at `/api/v1/events` and `/api/v1/health` (60 req/15min/IP). Login rate limiting per email via `login_attempts` table.
- **Data access logging:** `logDataAccess()` in `src/lib/audit/service.ts` records PII view events for LGPD Art. 30/37 compliance.
- **Security audit false positives:** Record relevant false positives in vulnerability reports to avoid rediscovery in future reviews.

## Design System

Formal, institutional interface. See `DESIGN.md` for full specification.

- **DaisyUI being phased out.** New/refactored UI uses explicit `DESIGN.md` tokens (colors, borders, radii) instead of DaisyUI utility classes (`btn btn-primary`, `input input-bordered`). Prefer explicit inline `style={{}}` or Tailwind arbitrary values matching the design system.
- **Primary:** Navy `#040920` · **Sidebar:** `#06284f` · **Accent:** Sky blue `#76aeea`
- **Typography:** Playfair Display (headings only) + Google Sans (numeric metrics, body, controls)
- **Tokens:** `src/lib/ui/tokens.ts` — `statusStyles`, `priorityStyles`, `focusRingClass`, `hairline`, etc.

### UI / Accessibility Conventions

- **Focus rings**: Always use `focusRingClass` from `src/lib/ui/tokens.ts` — never write raw `focus-visible:*` classes inline.
- **Hover**: CSS `hover:` classes only — no `onMouseEnter`/`onMouseLeave`/`useState` for hover. Use CSS custom property `--nav-hover-bg: primaryContainerHover` for token-backed hover backgrounds.
- **Async states**: `role="status"` + `aria-live="polite"` for loading; `role="alert"` for errors.
- **Sensitive inputs**: `spellCheck={false}` + `autoComplete="off"` on CPF, SIAPE, phone, WhatsApp fields.
- **Animation**: `motion-safe:animate-pulse` not `animate-pulse` (respects prefers-reduced-motion).
- **Collapsible panels**: Always render the `aria-controls` target in the DOM; use the HTML `hidden` attribute to toggle visibility instead of conditional rendering.

## Key Decisions

- **Webpack is default.** Turbopack (`*:turbo` scripts) is for explicit diagnostics only due to prior Tailwind resolution issues on memory-constrained machines.
- **No `middleware.ts`.** Next.js 16 renamed middleware to `proxy.ts`.
- **No API routes for data fetching.** Server Components query Drizzle directly. Exception: `src/app/app/associados/relatorio/download/route.ts` is a Route Handler used for CSV file streaming — not a data-fetch endpoint.
- **PII encryption at rest.** All sensitive fields (CPF, SIAPE, email, phone, address, WhatsApp) use AES-256-GCM with HKDF key derivation and HMAC-SHA-256 blind indexes. Per-column fallback supports incremental backfill. Plaintext columns sunset is pending until the drop migration is applied.
- **Dual-auth transition.** Integration auth supports both env-var API keys (unrestricted) and table-backed API keys (scoped). Env-var path will be deprecated once table auth is verified in production.
- **Shared PII sanitization.** `src/lib/sanitize-pii.ts` is the single source of truth for redacting sensitive values. Used by both audit service and webhook outbox.
- **Error boundaries are not global.** Exist: `src/app/app/error.tsx` (generic app-level), `src/app/app/juridico/error.tsx` (juridico module), `src/app/app/juridico/consultas/error.tsx` (consultas sub-route). Not every route has one.
- **Server Component shell + Client Component form.** Pages that need client interactivity (forms, state) use a Server Component for data fetching that renders a `'use client'` subcomponent. Example: `relatorio/page.tsx` → `RelatorioForm.tsx`.
- **`next/dynamic` for heavy client components.** Use lazy loading for components not needed on initial render. Example: `ReassignModal` in `AtividadesBoard.tsx` is loaded via `dynamic(() => import('./ReassignModal'))`.
- **`BoardActivity` name fallbacks.** `assigneeName` and `associateName` are kept alongside the IDs as optimistic-render fallbacks for items created via QuickAdd before the next server sync. The `peopleById` map is the authoritative source; UI code must prefer it (`peopleById.get(id)?.name ?? activity.assigneeName`). Do not remove these fields to "de-normalize PII" — they are intentional.

## Git Worktree + Subagentes Paralelos

Este projeto adota um padrão de **git worktrees** combinado com **subagentes paralelos** no Maestri para desenvolvimento acelerado e sem conflitos.

### Controle de Escopo Antes de Commit/PR

- Antes de iniciar uma nova frente, rode `git status --short --branch` e classifique cada arquivo como: task atual, outra frente, worktree aninhado ou artefato local.
- Nao misture frentes no mesmo PR. Se a entrega atual terminou, crie commit/PR antes de iniciar a proxima. Se a proxima frente ja comecou, preserve-a com `git stash push -u -m "<nome-da-frente>"` ou mova para branch/worktree proprio antes de abrir PR.
- Evite `git add .` quando houver qualquer mudanca fora do escopo. Use `git add <arquivos-da-task>` e valide o indice com `git diff --cached --name-status`.
- Se `.claude/worktrees/*` ou `.worktrees/*` aparecer como dirty no repo principal, entre no worktree correspondente e resolva la dentro com commit ou stash. Nao apague nem reverta conteudo de outro agente sem confirmacao.
- Antes de `gh pr create`, o working tree deve estar limpo ou as mudancas fora do escopo devem estar explicitamente preservadas em stash/branch separado e mencionadas no handoff.

### Estrutura de Worktrees

```
<repo-root>/
├── .worktrees/
│   ├── feature-auth-refactor/      ← worktree isolado (agente A)
│   ├── feature-new-dashboard/      ← worktree isolado (agente B)
│   └── fix-login-race/             ← worktree isolado (agente C)
└── src/
```

Cada worktree é um checkout independente com histórico, `node_modules` e cache `.next` próprios.

### Padrão de Subagentes Paralelos

O Maestro decompõe features grandes em tarefas independentes e delega a subagentes em worktrees separados:

```
Maestro
├── Agente A — worktree: feature-auth-refactor
│   └── Responsabilidade: refatorar middleware de auth
├── Agente B — worktree: feature-new-dashboard
│   └── Responsabilidade: criar componentes do dashboard
└── Agente C — worktree: fix-login-race
    └── Responsabilidade: corrigir race condition no login
```

**Regras de Coordenação:**

1. **Isolamento obrigatório**: Cada subagente trabalha APENAS em seu worktree. Nenhum agente toca arquivos de outro.
2. **Rebase frequente**: Subagentes fazem `git rebase origin/main` a cada 30 min ou antes de qualquer push.
3. **Sem push direto para main**: Todos os worktrees usam branches nomeadas (`feature/*`, `fix/*`).
4. **Sincronização via notes**: Subagentes escrevem status em notes do Maestri (`maestri note write`) em vez de commits de merge.
5. **Testes locais independentes**: Cada worktree roda seu próprio `npm run test` e `npm run build` antes de reportar conclusão.

### Fluxo de Orquestração

**1. Decomposição (Maestro)**

- Divide a feature em tarefas com fronteiras claras.
- Garante que nenhuma tarefa edite os mesmos arquivos que outra.
- Define plano de dependências: paralelo vs. sequencial.

**2. Alocação (Maestro)**

```bash
git worktree add -b feature/nome .worktrees/feature-nome
```

- Recruta subagentes no Maestri (um por worktree).
- Conecta notes de contexto a cada subagente.

**3. Execução Paralela (Subagentes)**

- Cada subagente implementa sua tarefa no próprio worktree.
- Reporta progresso via `maestri note write` a cada checkpoint.
- Sinaliza conclusão ao Maestro.

**4. Integração (Maestro)**

- Revisa cada branch individualmente.
- Resolve conflitos de merge se necessário.
- Faz squash/merge para `main` na ordem correta (respeitando dependências).
- Remove worktrees após merge bem-sucedido.

### Exemplo: Módulo "Eventos e Notificações"

```
Maestro
├── Agente A — worktree: feature/eventos-db
│   └── Schema Drizzle + migration PostgreSQL
├── Agente B — worktree: feature/eventos-api
│   └── Server Actions + repository + queries
├── Agente C — worktree: feature/eventos-ui
│   └── Páginas React + componentes + formulários
└── Agente D — worktree: feature/eventos-tests
    └── Testes unitários + E2E + schema contract
```

**Dependências:** A → B → C (sequencial), D roda em paralelo com B/C mas depende de A.

**Orquestração:**

1. Maestro lança A primeiro.
2. Quando A termina, Maestro faz merge do schema e lança B e D em paralelo.
3. Quando B termina, Maestro lança C.
4. Maestro integra tudo e faz merge final.

### Anti-padrões

- **NÃO** compartilhar um único worktree entre múltiplos agentes.
- **NÃO** permitir subagentes fazerem merge direto para `main`.
- **NÃO** deixar worktrees abandonados por mais de 48h sem rebase.
- **NÃO** dividir tarefas que editam o mesmo arquivo.
- **NÃO** abrir PR com arquivos sujos de outra frente no working tree.
- **NÃO** usar `git add .` sem antes conferir `git status --short` e `git diff --cached --name-status`.

### Comandos Úteis

```bash
# Criar worktree para uma feature
git worktree add -b feature/nome .worktrees/feature-nome

# Listar worktrees ativos
git worktree list

# Remover worktree após merge
git worktree remove .worktrees/feature-nome

# Forçar remoção de worktree sujo
git worktree remove --force .worktrees/<nome>

# Prune worktrees inválidos
git worktree prune

# Preservar uma frente inacabada antes de trocar de task
git stash push -u -m "nome-da-frente"

# Conferir exatamente o que entrara no commit
git diff --cached --name-status
```

## Gotchas

- This project is on Next.js `16.2.6`; check `node_modules/next/dist/docs/` before changing Next APIs, routing conventions, config, or build behavior. Do not downgrade below the pinned 16.2.6 line.
- `next.config.ts` pins `turbopack.root` to this directory for explicit Turbopack checks. This was added because a prior real-project dev test resolved Tailwind from the parent project directory instead of this app directory.
- The machine previously showed heavy memory pressure from `next dev` PostCSS/Tailwind workers on an 8 GB MacBook Air. Prefer controlled dev-server tests with `scripts/run-dev-60s.sh` when diagnosing freezes.

## Important Files

- `src/proxy.ts` — Route guard
- `src/lib/env.ts` — Environment validation (Zod)
- `src/lib/auth/require-auth.ts` — Auth guard for pages
- `src/lib/crypto/index.ts` — HKDF key derivation, V2 encryption format
- `src/lib/crypto/pii.ts` — PII encrypt/decrypt/blind-index functions
- `src/lib/sanitize-pii.ts` — Shared PII sanitizer for audit logs and webhooks
- `src/lib/logger.ts` — Structured logger with PII redaction (`createLogger("module-name")`)
- `src/lib/db/index.ts` — Database client
- `src/lib/db/schema/views.ts` — PII-safe `associates_list_view`
- `src/lib/db/schema/enums.ts` — Shared enums (`paymentMethod`, `legalSatisfaction`)
- `src/lib/ui/tokens.ts` — Design tokens
- `src/lib/associates/search-params.ts` — Associates list filter/pagination URL params
- `src/lib/finance/search-params.ts` — Monthly payments filter/pagination URL params
- `src/lib/integrations/auth.ts` — Dual-auth (env-var OR table-backed API keys with scopes)
- `src/lib/integrations/keys/service.ts` — Integration API key CRUD (create, list, revoke, rotate)
- `src/lib/integrations/rate-limit.ts` — PostgreSQL-backed rate limiter for API endpoints
- `src/lib/integrations/webhooks/service.ts` — Transactional webhook dispatch with `Promise.allSettled`
- `src/lib/supabase/client.ts` — Supabase realtime client (notifications)
- `next.config.ts` — Next.js config (imports `env.ts`)
- `drizzle.config.ts` — Migration config
- `vitest.config.ts` — Test config

## Agent skills

### Issue tracker

Issues live in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — `CONTEXT.md` at root + `docs/adr/` for architectural decisions. See `docs/agents/domain.md`.

## External Resources

- README.md — Quick start, env vars, full command reference
- ARCHITECTURE.md — System diagram, deployment notes, glossary
- DESIGN.md — Visual design system
- AGENTS.md — Institutional context, domain vocabulary (sourced into this file)
- CONTEXT.md — Single-context repository overview
- API.md — API surface documentation
- CONTRIBUTING.md — Contribution guidelines and conventions
- vitest.integration.config.ts — Integration test configuration (real PostgreSQL)
