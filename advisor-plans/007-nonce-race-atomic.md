# Plan 007: `checkAndRecordNonce` — atomic insert with unique constraint

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/integrations/verify-request.ts`
> If changed, compare against live code; on mismatch, STOP.
>
> **SECURITY NOTE**: plan-only — do not publish as a public issue.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `844df3b`, 2026-06-30
- **Issue**: plan-only (repo public; LOW confidence race)

## Why this matters

`checkAndRecordNonce` does a SELECT, and if no row exists, an INSERT with
`onConflictDoNothing` — without a transaction or `FOR UPDATE`. Two concurrent
requests with the same signature both pass `existing.length === 0` and both insert
(the conflict is silently ignored, but both were already authorized). This is a
replay-protection race. Confidence is LOW (requires winning timing on a low-volume
M2M path), but the fix is cheap: make the insert the source of truth via a unique
constraint and treat `onConflictDoNothing` rowCount as the gate.

## Current state

- `src/lib/integrations/verify-request.ts:99-127` — `checkAndRecordNonce`:
  SELECT (lines 104-114); if `existing.length === 0`, INSERT with `onConflictDoNothing`
  (lines 121-124); no tx, no `FOR UPDATE`.
- The nonce table is in `src/lib/db/schema/` (locate the exact table — likely
  `integration_request_nonces` or similar); confirm a unique constraint on the
  signature/nonce column exists (if not, that is part of this plan).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npx vitest run src/lib/integrations/verify-request.test.ts` | pass |
| DB contract | `npm run test:db` | exit 0 |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**: `src/lib/integrations/verify-request.ts`, its test, the nonce schema/migration if a unique constraint is missing.
**Out of scope**: rate-limit logic, other M2M auth paths.

## Steps

### Step 1: Confirm/ add the unique constraint

Check the nonce table schema for a unique constraint on the signature column. If
absent, add a migration `0029_nonce_unique.sql` with `CREATE UNIQUE INDEX` (model on
existing migration style; use `IF NOT EXISTS` — see plan 021's lesson about `IF NOT EXISTS`).

**Verify**: `npm run test:db` → exit 0 (schema contract).

### Step 2: Make insert the gate

Replace the SELECT-then-INSERT with an INSERT-first flow: attempt the insert; if
`onConflictDoNothing` produces 0 rows (conflict), the nonce was already used → reject
as replay. Drop the prior SELECT gate or keep it only for a friendly error message.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Test the race

Add a test that fires two concurrent `checkAndRecordNonce` calls with the same
signature and asserts exactly one succeeds (use `Promise.all` + `expect(...).toHaveLength(1)`
on successes). Integration test against real PG if feasible; otherwise a unit test
that mocks the conflict rowCount.

**Verify**: `npx vitest run src/lib/integrations/verify-request.test.ts` → pass.

## Test plan

- New test: concurrent identical-signature requests → exactly one authorized.
- Pattern: `src/lib/auth/login-rate-limit.integration.test.ts` for concurrency vs PG.
- Verification: `npm run validate:quick` → exit 0.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npx vitest run src/lib/integrations/verify-request.test.ts` passes with the race test
- [ ] `npm run test:db` exits 0 (unique constraint present)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- The nonce table has no unique constraint AND adding one requires backfilling
  existing rows — STOP; report the row count and propose a migration with cleanup.
- The conflict-detectionrowCount API for `onConflictDoNothing` is not exposed by the
  Drizzle version in use — STOP; report and propose `ON CONFLICT DO UPDATE` with a
  no-op set + `returning()` to detect the existing row.

## Maintenance notes

- Reviewer: confirm the unique constraint is on the right column (signature, not
  an auto-increment id).
- This is defense-in-depth; the rate-limiter and signature verification still apply.