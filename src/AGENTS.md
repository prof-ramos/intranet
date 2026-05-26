<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-26 | Updated: 2026-05-26 -->

# src

## Purpose
Next.js 16 App Router source directory. Contains all application code: pages, layouts, shared UI components, React hooks, domain services/repositories, and test mocks. The `@/*` import alias maps to this directory.

## Key Files
| File | Description |
|------|-------------|
| `proxy.ts` | API proxy utility — forwards requests to internal services, used by Server Actions for cross-service communication |
| `app/` | App Router pages, layouts, and API routes (authenticated area under `app/`, login at `app/login`) |
| `components/` | Shared UI components (Button, Modal, Table, Form, etc.) |
| `hooks/` | Custom React hooks (auth, data fetching, form state) |
| `lib/` | Domain modules: auth helpers, Drizzle DB, repositories, services, logger, PII sanitizer |
| `__mocks__/` | Vitest/Playwright mocks for testing |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages and layouts (see `app/AGENTS.md`) |
| `components/` | Shared React UI components (see `components/AGENTS.md`) |
| `hooks/` | Custom React hooks (see `hooks/AGENTS.md`) |
| `lib/` | Domain services, DB schema, auth, repositories (see `lib/AGENTS.md`) |
| `__mocks__/` | Test mocks (see `__mocks__/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Read `CLAUDE.md` and `src/lib/AGENTS.md` before modifying domain logic or database access.
- The `@/*` import alias (`tsconfig.json`) maps to `src/`, so `@/lib/db` resolves to `src/lib/db`.
- Auth helpers (`requireAuth()`, `requireRole()`) protect all `app/` routes; never expose raw DB queries without auth checks.
- PII fields (CPF, SIAPE, email, address) are stored encrypted or hashed. Use `src/lib/sanitize-pii.ts` before logging any user data.
- Use `src/lib/logger.ts` (`createLogger('module-name')`) instead of `console.*` for structured logging with PII redaction.

### Testing Requirements
- Unit tests: `src/**/*.test.{ts,tsx}` via `npm run test` (Vitest, Node environment).
- Schema contract: `npm run test:db` validates tables, columns, enums, indexes, and migration alignment against live DB.
- E2E: `npm run test:e2e` (Playwright) — do not point at `localhost:3000` dev server; use port 3001 via `npm run test:e2e`.

### Common Patterns
- Domain repositories live in `src/lib/repositories/` and accept a `tx` (transaction) executor.
- Multi-table operations use `db.transaction()` — never leave partial writes.
- Status/type fields use PostgreSQL enums (never `text` for bounded sets).
- Component props interfaces are defined above the component; use `FC<Props>` or plain function signatures.

## Dependencies

### Internal
- `../AGENTS.md` — Root project AGENTS with stack, auth, and database conventions
- `src/lib/db/schema/` — Drizzle schema definitions
- `src/lib/auth/` — Self-hosted cookie session auth
- `src/lib/logger.ts` — Structured logger with PII redaction

### External
- `next` 16.x, `react` 19.x — App Router framework
- `drizzle-orm`, `drizzle-kit` — ORM and migrations
- `@neondatabase/serverless` — Postgres driver
- `zod` — Schema validation
- `jose` — Session signing (JWT)
- `argon2` — Password hashing
- `vitest` — Unit testing
- `@playwright/test` — E2E testing

<!-- MANUAL: -->