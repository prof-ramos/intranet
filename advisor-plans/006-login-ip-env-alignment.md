# Plan 006: Login hardening — IP rate-limit + `NODE_ENV`/`VERCEL_ENV` alignment

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/auth/session.ts src/lib/auth/config.ts src/lib/env.ts`
> If changed, compare against live code; on mismatch, STOP.
>
> **SECURITY NOTE**: plan-only — do not publish as a public issue.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `advisor-plans/005-login-rate-limiter-fail-open.md`
- **Category**: security
- **Planned at**: commit `844df3b`, 2026-06-30
- **Issue**: plan-only (repo public)

## Why this matters

`isSkipAuthEnabled` (in `config.ts:36`) gates on `NODE_ENV !== 'production'`, but
`env.ts` gates production-only secret validation on `VERCEL_ENV === 'production'`.
If a deployment ever has `NODE_ENV != production` while `VERCEL_ENV == production`
(misconfigured preview, build override), skip-auth could be silently enabled in a
production-data environment. Aligning the gate to one authoritative signal removes
that ambiguity. (Plan 005 covers the IP rate-limit half; this plan covers the env
alignment.)

## Current state

- `src/lib/auth/config.ts:36` — `isSkipAuthEnabled` gated on `env.NODE_ENV !== 'production'`.
- `src/lib/auth/session.ts:136` — `secure: env.NODE_ENV === 'production'` (cookie).
- `src/lib/env.ts` — production secrets gated on `VERCEL_ENV === 'production'`.
- `src/lib/env.ts:57-58` — `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD` are
  `optionalString` (see plan 008).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm run test` | pass |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**: `src/lib/auth/config.ts`, `src/lib/auth/session.ts`, `src/lib/env.ts`, their tests.
**Out of scope**: `src/proxy.ts`, login actions (plan 005).

## Steps

### Step 1: Pick the authoritative production signal

Prefer a single derived `isProductionRuntime` that is `true` only when
`VERCEL_ENV === 'production'` (or, if Node-only contexts need it,
`NODE_ENV === 'production' && VERCEL_ENV === 'production'`). Audit each callsite of
`NODE_ENV === 'production'` and route through the helper.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Update `isSkipAuthEnabled` and `secure` cookie

Gate both on the new helper so they cannot diverge from env validation.

**Verify**: `npm run test` → pass; add a test asserting skip-auth is disabled when
`VERCEL_ENV === 'production'` regardless of `NODE_ENV`.

### Step 3: Tests

Add a unit test that mocks env with `VERCEL_ENV=production` + `NODE_ENV=development`
and asserts `isSkipAuthEnabled === false` and `secure` cookie flag is `true`.

**Verify**: `npm run validate:quick` → exit 0.

## Test plan

- New env-matrix test in `config.test.ts` (create if absent) covering the divergent
  `NODE_ENV`/`VERCEL_ENV` case.
- Verification: `npm run validate:quick` → exit 0.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run validate:quick` exits 0
- [ ] Test asserts skip-auth disabled when `VERCEL_ENV=production` + `NODE_ENV=development`
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- Some callsite genuinely needs `NODE_ENV` (e.g., dev-only instrumentation that
  must run in `NODE_ENV=development` even on Vercel preview) — STOP; report each
  callsite and route only the security-relevant ones through the helper.

## Maintenance notes

- Reviewer: confirm no path enables skip-auth in production-data environments.
- Memory note (from CLAUDE.md feedback): `/login?error=1` is ambiguous — diagnose
  via server logs; this plan should not add new ambiguous error surfaces.