# Plan 008: Reject default admin placeholders in production

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/env.ts scripts/seed-dev.ts .env.example`
> If changed, compare against live code; on mismatch, STOP.
>
> **SECURITY NOTE**: plan-only — references credential *type* and *location* only;
> do NOT reproduce the placeholder value in any published issue.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `844df3b`, 2026-06-30
- **Issue**: plan-only (repo public; credential location)

## Why this matters

`.env.example` ships default admin credentials (`INITIAL_ADMIN_EMAIL` /
`INITIAL_ADMIN_PASSWORD` placeholder values). `env.ts` declares them `optionalString`
without a refine that rejects the example placeholders in production. A production
deploy that accidentally copies the example values boots with a known, documented
admin account. The fix: in production, reject the placeholder values at env
validation time (fail fast, refuse to boot) — same posture as `CRON_SECRET` /
`ASOF_INTRANET_URL` enforcement.

## Current state

- `.env.example:76-77` — `INITIAL_ADMIN_EMAIL=admin@example.invalid` and
  `INITIAL_ADMIN_PASSWORD=ChangeMe-2026!` (placeholder type: default admin
  credential; never reproduce the value in issues/docs).
- `src/lib/env.ts:57-58` — both declared `optionalString` with no refine rejecting
  the example values in production.
- `scripts/seed-dev.ts:78,97` — `getInitialAdminCredentials()` reads them; sets
  `mustChangePassword: true`. Dev seed path is correct; the gap is env validation
  in production.
- `src/lib/env.ts` already gates production secrets on `VERCEL_ENV === 'production'`
  (pattern to reuse).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npx vitest run src/lib/env.test.ts` (create if absent) | pass |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**: `src/lib/env.ts`, `src/lib/env.test.ts` (create if absent).
**Out of scope**: `.env.example` (keep the placeholders for dev ergonomics),
`scripts/seed-dev.ts` (dev path is fine).

## Steps

### Step 1: Add a placeholder reject-list

Define a small set of known placeholder values to reject (the `admin@example.invalid`
email and the documented default password string). In production only, add a
`.refine()` on `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` that rejects these
exact values with a clear message ("default admin credentials are not allowed in
production; set real values").

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Tests

Add a unit test that sets `VERCEL_ENV=production` + the placeholder values and
asserts env validation throws. Add a dev-mode test asserting the placeholders are
accepted (dev ergonomics preserved).

**Verify**: `npx vitest run src/lib/env.test.ts` → pass.

### Step 3: Document the rotation

Note in `TODO-PROD.md` that production must set real admin credentials (the existing
go-live checklist may already track this — verify before duplicating).

**Verify**: `npm run validate:quick` → exit 0.

## Test plan

- New `env.test.ts`: production + placeholder → throws; dev + placeholder → accepts.
- Verification: `npm run validate:quick` → exit 0.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npx vitest run src/lib/env.test.ts` passes (production-rejects + dev-accepts)
- [ ] No placeholder credential value appears in test assertions or code (use a
  constant imported from `.env.example`-equivalent or assert by type, not value)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- The placeholder values differ from those in `.env.example:76-77` at execution
  time — STOP; reconfirm the exact strings before writing the refine.
- `env.ts` validation runs in contexts where the placeholders are legitimate
  (e.g., a Vercel preview build with no admin seeded) — STOP; report and narrow the
  reject to `VERCEL_ENV === 'production'` only (already the plan, but confirm).

## Maintenance notes

- Reviewer: confirm the reject-list covers both email and password and that dev
  still boots with the example values.
- If the placeholders change in `.env.example`, update the reject-list in the same
  PR — add a test that reads `.env.example` and asserts the reject-list covers it.