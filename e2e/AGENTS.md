<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-26 | Updated: 2026-05-26 -->

# e2e

## Purpose
Playwright end-to-end test suite for the ASOF Intranet application. Spins up a separate Next.js dev server on port 3001 with its own `.next-e2e` distDir, creates/migrates/seeds an isolated `asof_test` database via global setup, and runs browser-based tests across authenticatedfunctional areas (associados, dashboard, financeiro, juridico, login, roles, secretaria, usuarios).

## Key Files
| File | Description |
|------|-------------|
| `playwright.config.ts` | Playwright configuration — baseURL http://localhost:3001, headless, 30s timeout, reporter |
| `global-setup.ts` | Creates `asof_test` database, runs migrations via `npm run db:migrate`, seeds test data |
| `global-teardown.ts` | Tears down test db and kills the e2e Next.js server process |
| `fixtures.ts` | Shared Playwright fixtures for authenticated pages and db reset per test |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `helpers/` | Test utilities — `db.ts` wraps the seed/admin helper for resetting test data |
| `tests/` | Spec files per functional area — associados, dashboard, financeiro, juridico, login, roles, secretaria, usuarios |

## For AI Agents

### Working In This Directory
- Run tests with `npm run test:e2e` from the project root.
- The E2E server starts on port 3001 and sets `NEXT_E2E=1`; `next.config.ts` uses `distDir: ".next-e2e"` to isolate cache/dev from the normal dev server on port 3000.
- Global setup creates `asof_test` fresh before the session; do not run E2E against an unseeded dev server on 3000.
- Repeated login failures can leave entries in `login_attempts` and trigger `/login?error=rate-limit`.

### Testing Requirements
- All specs require authenticated sessions; fixtures handle login via seeded test credentials.
- Use `fixtures.adminPage`, `fixtures.diretoriaPage`, etc. for role-scoped tests.
- Reset test data between tests via the `db` fixture helper in `helpers/db.ts`.

### Common Patterns
- Each spec file groups tests by page/route using `test.describe`.
- Server Actions are tested via `page.request.post()` on the Next.js server.
- Screenshot on failure is automatic via Playwright trace config.

## Dependencies

### Internal
- `../src/app/` — App Router pages and API routes under test
- `../src/lib/db/` — Drizzle schema used by `global-setup.ts` for migrations
- `../drizzle/postgres/` — SQL migration files applied by global setup

### External
- `@playwright/test` — E2E test runner
- `playwright` — Browser automation

<!-- MANUAL: -->
