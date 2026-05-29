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

### E2E Gotchas & Hard-Won Lessons

These were discovered during real flakiness incidents (associados.spec.ts tests 4-5) and must be respected by future agents.

**1. `expect(page).toHaveURL()` default 5s timeout vs Next.js JIT compilation**

- The default `expect` timeout in Playwright is 5000ms.
- Dynamic routes under `/app/associados/[id]/editar` (and similar) can take **>5s to JIT-compile on a cold `.next-e2e` cache**.
- Symptom: "expect(page).toHaveURL(...) — Timeout 5000ms" even though the click was dispatched correctly and navigation eventually starts.
- Root cause is **not** broken selectors, opacity, or missing hover — it is route compilation latency.
- The fix lives in `global-setup.ts:warmupJitRoutes()` (real authenticated login + direct navigation to edit URLs + financeiro routes) + explicit `.hover()` before clicks on `opacity-0 group-hover:opacity-100` buttons in the spec.
- Additional defense-in-depth: `playwright.config.ts` now sets `expect.timeout: 15_000` (was implicit 5s).

**2. JIT warmup MUST use authenticated browser sessions**

- `fetch()` or unauthenticated requests **do not** compile protected App Router routes.
- `src/proxy.ts` (the route guard) redirects to `/login` before the page component or Server Actions ever run.
- Warmup code **must** launch a real browser, log in with E2E admin credentials, then navigate to the protected pages. See `warmupJitRoutes()` implementation for the exact pattern.

**3. Cold `.next-e2e` cache masks the direction of flakiness**

- Local runs accumulate cache in `.next-e2e/`. Tests that are flaky or slow on cold start (CI) often pass locally after the first run.
- **Always** `rm -rf .next-e2e` before diagnosing "works on my machine" E2E failures.
- The global setup now warms the critical routes precisely to make cold-cache runs reliable.

**4. Hardcoded `associationStatus = 'ativo'` filter in list queries**

- `src/lib/associates/repository.ts` (used by `getAssociatesListPage`) applies `eq(associates.associationStatus, 'ativo')` unconditionally for the main list.
- Any E2E seed data created with `associationStatus: 'inativo'` (or other values) will **never appear** in `/app/associados` table UI.
- Before writing list-based tests or seed data, **always read the repository query**, not just the page component or fixture.

## Dependencies

### Internal
- `../src/app/` — App Router pages and API routes under test
- `../src/lib/db/` — Drizzle schema used by `global-setup.ts` for migrations
- `../drizzle/postgres/` — SQL migration files applied by global setup

### External
- `@playwright/test` — E2E test runner
- `playwright` — Browser automation

<!-- MANUAL: -->
