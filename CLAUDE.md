# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ASOF Intranet — Sistema interno da Associação dos Oficiais de Chancelaria do Ministério das Relações Exteriores do Brasil. Gerencia ~763 associados, atividades administrativas e comunicações internas da diretoria.

**Stack:** Next.js 16.2.6 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · DaisyUI 5 · Drizzle ORM · PostgreSQL/Supabase · JWT (jose)

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
```

Run a single test file: `npx vitest run src/lib/auth/password.test.ts`
Run a single test: `npx vitest run -t "test name"`

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

- `src/proxy.ts` — Next.js 16 proxy (replaces `middleware.ts`). Coarse JWT cookie validation for `/app/:path*` routes. Redirects to `/login` if missing/invalid. No DB queries here; full user revalidation happens in `requireAuth()` inside `src/app/app/layout.tsx`.
- `src/app/app/layout.tsx` — Authenticated shell. Calls `requireAuth()`, renders sidebar.
- `src/app/app/auditoria/page.tsx`, `config/page.tsx`, `usuarios/page.tsx` — Thin single-page modules (read-only views, no sub-routes).
- `src/app/login/actions.ts` — Server Action for login. Rate-limited (5 attempts / 15 min), bcrypt with dummy hash for timing attack protection.
- `src/app/change-password/` — Required password-change flow for `mustChangePassword=true`.

### Database Layer

- `src/lib/db/index.ts` — Drizzle client. Prefers `DATABASE_URL`, falls back to `DATABASE_POSTGRES_URL`. Auto-detects transaction pooler (pgbouncer/port 6543) and sets `prepare: false` accordingly.
- `src/lib/db/schema/` — Drizzle schemas: `admins`, `associates`, `activities`, `audit_logs`, `login_attempts`, `rate_limits`, `legal_consultations`, `legal_notes`, `legal_processes`, `legal_opinions`, `monthly_payments`, `oficios`, `assignments`.
- `drizzle.config.ts` — Targets PostgreSQL, writes migrations to `drizzle/postgres/`. **Rejects pooled URLs** — migrations require direct/non-pooling connection.
- **Migrations:** Use `DATABASE_MIGRATION_URL` or `DATABASE_POSTGRES_URL_NON_POOLING`.

### Database Conventions

- **Enums**: Use PostgreSQL enums for all status/type fields. Never use `text` for a bounded set of values.
- **Indexes**: Create partial indexes for queries with conditional `WHERE`. Use trigram GIN (`gin_trgm_ops`) for `LIKE '%term%'`. Use composite indexes matching `(filter, order)` patterns. Prefix custom indexes with `idx_`.
- **Connection pool**: `max: 10`, `max_lifetime: 1800`, `statement_timeout: 30000`, `application_name: 'asof-intranet'` in `src/lib/db/index.ts`.
- **Transactions**: Multi-table operations MUST use `db.transaction()`. Pass the `tx` executor to repository functions that accept one.
- **RLS**: Re-enabled in migration 0009 as defense-in-depth. All current policies are permissive (`FOR ALL TO PUBLIC`); auth is enforced server-side. If a Supabase client is ever exposed to the browser, RLS policies must be narrowed.
- **Update safety**: `updateAssociateById` and similar functions must use typed interfaces, not `Record<string, unknown>`, to prevent unintended column overwrites.
- **Migrations**: Name SQL files with zero-padded index + description (e.g., `0009_quality_improvements.sql`). Update `_journal.json` with the correct timestamp.
- **Testing**: `npm run test:db` validates tables, columns, enums, indexes, extensions, and migration alignment against the live database.

### Data Access Pattern

Server Components fetch data directly from the database. The juridico module has a full repository/service layer; others are query-only:
- `src/lib/dashboard/queries.ts` — Dashboard aggregations
- `src/lib/associates/queries.ts` — Associate list/pagination
- `src/lib/associates/search-params.ts` — URL search-params parsing for the associates list (filters, pagination)
- `src/lib/reports/queries.ts` + `src/lib/reports/csv.ts` — Report generation
- `src/lib/finance/queries.ts` — Financial dashboard and monthly payments
- `src/lib/juridico/repository.ts` + `service.ts` + `queries.ts` — Legal consultations (full service layer). `queries.ts` wraps repository calls with module-level `unstable_cache`; Server Actions call `revalidateTag` on mutations.
- `src/app/app/associados/actions.ts` — Server Actions for associate mutations (create/update). `[id]/editar/` is the edit route; `[id]/editar/EditarAssociadoForm.tsx` is the client form.

### Auth & Authorization

- `src/lib/auth/config.ts` — `AUTH_ROLES` = `['admin', 'diretoria', 'secretaria']`.
- `src/lib/auth/require-auth.ts` — `requireAuth()` validates JWT session, queries DB for active user, caches with `React.cache()`.
- `src/lib/auth/authorization.ts` — `requireRole(['admin', 'diretoria'])` throws if the current user's role isn't in the allowed list.
- `src/lib/auth/session.ts` — JWT via `jose`, httpOnly + sameSite=strict + secure cookie.
- `src/lib/auth/password.ts` — Password policy (8+ chars, at least 1 number and 1 special character).
- `src/lib/auth/login-rate-limit.ts` — PostgreSQL-backed rate limiter (table `login_attempts`).

### Environment Validation

`src/lib/env.ts` uses Zod to validate env vars at startup. Imported in `next.config.ts` so missing required vars fail early. Do not access `process.env` directly; import from `@/lib/env`.

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

- **LGPD:** CPF, SIAPE, email, address, and functional data are protected. Do not log or expose in API responses.
- **Auth:** Supabase Auth cookies via `@supabase/ssr`; do not reintroduce custom JWT `SESSION_SECRET` build requirements.
- **DB:** SSL required in production or when `DB_SSL=true`/`sslmode=require`.
- **Service-role keys:** Server/script only. Never expose to client components.
- **CSV injection prevention:** Cells starting with `-`, `=`, `+`, `@`, or tab are prefixed with `\t` and quoted.
- **LIKE query safety:** Escape `%` and `_` to prevent wildcard injection.

## Design System

Formal, institutional interface. See `DESIGN.md` for full specification.
- **DaisyUI being phased out.** New/refactored UI uses explicit `DESIGN.md` tokens (colors, borders, radii) instead of DaisyUI utility classes (`btn btn-primary`, `input input-bordered`). Prefer explicit inline `style={{}}` or Tailwind arbitrary values matching the design system.
- **Primary:** Navy `#040920` · **Sidebar:** `#06284f` · **Accent:** Sky blue `#76aeea`
- **Typography:** Playfair Display (headlines, metrics) + Google Sans (body, controls)
- **Tokens:** `src/lib/ui/tokens.ts` — `statusStyles`, `priorityStyles`, `focusRingClass`, `hairline`, etc.

## Key Decisions

- **Webpack is default.** Turbopack (`*:turbo` scripts) is for explicit diagnostics only due to prior Tailwind resolution issues on memory-constrained machines.
- **No `middleware.ts`.** Next.js 16 renamed middleware to `proxy.ts`.
- **No API routes for data fetching.** Server Components query Drizzle directly. Exception: `src/app/app/associados/relatorio/download/route.ts` is a Route Handler used for CSV file streaming — not a data-fetch endpoint.
- **Error boundaries are not global.** Exist: `src/app/app/error.tsx` (generic app-level), `src/app/app/juridico/error.tsx` (juridico module), `src/app/app/juridico/consultas/error.tsx` (consultas sub-route). Not every route has one.
- **Server Component shell + Client Component form.** Pages that need client interactivity (forms, state) use a Server Component for data fetching that renders a `'use client'` subcomponent. Example: `relatorio/page.tsx` → `RelatorioForm.tsx`.
- **`next/dynamic` for heavy client components.** Use lazy loading for components not needed on initial render. Example: `ReassignModal` in `AtividadesBoard.tsx` is loaded via `dynamic(() => import('./ReassignModal'))`.
- **`BoardActivity` name fallbacks.** `assigneeName` and `associateName` are kept alongside the IDs as optimistic-render fallbacks for items created via QuickAdd before the next server sync. The `peopleById` map is the authoritative source; UI code must prefer it (`peopleById.get(id)?.name ?? activity.assigneeName`). Do not remove these fields to "de-normalize PII" — they are intentional.

## Git Worktree + Subagentes Paralelos

Este projeto adota um padrão de **git worktrees** combinado com **subagentes paralelos** no Maestri para desenvolvimento acelerado e sem conflitos.

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
```

## Gotchas

- This project is on Next.js `16.2.6`; check `node_modules/next/dist/docs/` before changing Next APIs, routing conventions, config, or build behavior. Do not downgrade below the pinned 16.2.6 line.
- `next.config.ts` pins `turbopack.root` to this directory for explicit Turbopack checks. This was added because a prior real-project dev test resolved Tailwind from the parent project directory instead of this app directory.
- The machine previously showed heavy memory pressure from `next dev` PostCSS/Tailwind workers on an 8 GB MacBook Air. Prefer controlled dev-server tests with `scripts/run-dev-60s.sh` when diagnosing freezes.

## Important Files

- `src/proxy.ts` — Route guard
- `src/lib/env.ts` — Environment validation
- `src/lib/auth/require-auth.ts` — Auth guard for pages
- `src/lib/db/index.ts` — Database client
- `src/lib/ui/tokens.ts` — Design tokens
- `src/lib/associates/search-params.ts` — Associates list filter/pagination URL params
- `src/lib/finance/search-params.ts` — Monthly payments filter/pagination URL params
- `next.config.ts` — Next.js config (imports `env.ts`)
- `drizzle.config.ts` — Migration config
- `vitest.config.ts` — Test config

## External Resources

- README.md — Quick start, env vars, full command reference
- ARCHITECTURE.md — System diagram, deployment notes, glossary
- DESIGN.md — Visual design system
- AGENTS.md — Institutional context, domain vocabulary (sourced into this file)
