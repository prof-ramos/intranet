# Plan 015: Integration tests for finance/assinafy/oficios/activities/webhooks

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/finance src/lib/assinafy src/lib/oficios src/lib/activities src/lib/integrations/webhooks vitest.integration.config.ts`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P3 | **Effort**: L | **Risk**: MED | **Depends on**: none
- **Category**: tests | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#253](https://github.com/prof-ramos/intranet/issues/253)

## Why this matters

Integration tests (against real PG) exist only for juridico, associates repository,
auth rate-limit, email-triage persister, and the DB schema. The transactional outbox,
optimistic lock, idempotency, and PII encrypt/decrypt paths in finance, assinafy,
oficios, activities, and webhooks are characterized only against mocked Drizzle
chains — exactly where real PG behavior (constraint checks, tx rollback, unique
violations, enum coercion) matters.

## Current state

- Existing integration tests (verified): `src/lib/associates/repository.integration.test.ts`,
  `src/lib/auth/login-rate-limit.integration.test.ts`, `src/lib/db/schema.integration.test.ts`,
  `src/lib/email-triage/persister.integration.test.ts`, `src/lib/juridico/service.integration.test.ts`.
- `vitest.integration.config.ts` — integration config; `npm run test:integration` skips
  gracefully if `.env.test.local` absent (CLAUDE.md).
- Pattern exemplar: `src/lib/juridico/service.integration.test.ts` — graceful skip +
  real-PG assertions.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Integration (focused) | `npx vitest run --config vitest.integration.config.ts src/lib/finance/service.integration.test.ts` | pass/skip gracefully |
| Full integration | `npm run test:integration` | pass/skip gracefully |
| Typecheck | `npm run typecheck` | exit 0 |

## Scope

**In scope** (create one `*.integration.test.ts` per module, prioritized):
- `src/lib/finance/service.integration.test.ts`
- `src/lib/assinafy/service.integration.test.ts`
- `src/lib/oficios/service.integration.test.ts`
- `src/lib/activities/service.integration.test.ts`
- `src/lib/integrations/webhooks/service.integration.test.ts`

**Out of scope**: existing unit tests, `vitest.integration.config.ts` (no config change).

## Steps

### Step 1: finance integration test

Mirror `juridico/service.integration.test.ts` graceful-skip. Cover: payment status
transition + outbox emit commits; rollback discards event (ties to plan 011);
`cancelMonthlyPayment` audit outside tx (ties to plan 002).

**Verify**: `npx vitest run --config vitest.integration.config.ts src/lib/finance/service.integration.test.ts` → pass/skip.

### Step 2: assinafy integration test

Cover: webhook idempotency (same signature twice → one mutation); status update +
outbox emit; audit outside tx.

**Verify**: same command pattern → pass/skip.

### Step 3: oficios integration test

Cover: `sendForSignature` creates oficio + emits event + audit outside tx; optimistic
concurrency on update.

### Step 4: activities integration test

Cover: create + `activity.created` emit inside tx; status change emits
`status_changed` + `completed` on first completion; optimistic concurrency rollback
discards emits (characterization for plan 001).

### Step 5: webhooks dispatch integration test

Cover: `dispatchEventToSubscriptions` delivers to a mock subscription URL;
`webhook_deliveries` retry row created on failure (ties to plan 024).

## Test plan

- 5 new integration test files, each with graceful skip + real-PG assertions.
- Pattern: `src/lib/juridico/service.integration.test.ts`.
- Verification: `npm run test:integration` → all pass or skip gracefully.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] 5 new `*.integration.test.ts` files exist
- [ ] `npm run test:integration` passes (or skips gracefully without `.env.test.local`)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- A module's service cannot be tested against PG without seeding complex fixtures
  (e.g., assinafy needs a remote Assinafy mock) — STOP; report and scope that module's
  integration test to the in-box parts only (idempotency, emit, audit) using local stubs.
- `.env.test.local` discipline is not in place and tests can't be run in CI — STOP;
  report and wire CI integration before writing tests that won't run.

## Maintenance notes

- Reviewer: confirm each test skips gracefully (not silently passes) when PG is absent.
- These tests are the regression net for plans 002, 011, 024 — keep them passing.