# Plan 005: Login rate limiter — fail-closed + IP rate-limit

> **Executor instructions**: Follow step by step. Run every verification and confirm
> the expected result before moving on. STOP → stop and report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/app/login/actions.ts`
> If changed, compare "Current state" against live code; on mismatch, STOP.
>
> **SECURITY NOTE**: plan-only — do not publish as a public issue.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `844df3b`, 2026-06-30
- **Issue**: plan-only (repo public)

## Why this matters

The login action initializes `rateLimitAllowed = true` and a `catch` leaves it `true`
on error — fail-open. A broken or unavailable rate-limiter (DB hiccup) silently
disables brute-force protection. Separately, the login path uses only per-email
rate-limiting, not per-IP, so an attacker rotating email identifiers bypasses the
per-email limit. The fix is fail-closed (default deny) + add IP rate-limiting using
the existing `consumeIpRateLimit` helper already wired into `defineFormAction` (which
login does not use).

## Current state

- `src/app/login/actions.ts:34-44` — `rateLimitAllowed = true` initialized; catch
  block leaves it `true` on error.
- `loginRateLimiter.consume(email)` is called (per-email); `consumeIpRateLimit` is
  NOT called (login bypasses `defineFormAction`).
- `src/lib/auth/login-rate-limit.ts` + `src/lib/auth/login-rate-limit.integration.test.ts`
  exist (the integration test is the pattern for verifying against real PG).
- `defineFormAction` in `src/lib/server-actions/define-form-action.ts:14` wires
  `consumeIpRateLimit`; reference this for the IP-limit call shape.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Unit tests | `npx vitest run src/lib/auth/login-rate-limit.test.ts src/app/login` | pass |
| Integration | `npx vitest run --config vitest.integration.config.ts src/lib/auth/login-rate-limit.integration.test.ts` | pass/skip gracefully |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**: `src/app/login/actions.ts` + login test files.
**Out of scope**: `src/lib/auth/login-rate-limit.ts` (API stable), `defineFormAction`.

## Steps

### Step 1: Fail-closed

Initialize `rateLimitAllowed = false`; only set `true` after explicit success.
On catch, leave `false` and return a rate-limited response (or surface a 500 — pick
the one matching existing error handling; the existing catch logs).

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Add IP rate-limit

Call `consumeIpRateLimit` (import from where `defineFormAction` imports it) before
or alongside the per-email `consume`. Reject when either is exceeded. Get the IP from
the request context the same way `defineFormAction` does.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Tests

Add: (a) when rate-limiter throws, login is blocked (fail-closed); (b) IP exceed
blocks even if email limit is fresh; (c) email exceed blocks even if IP limit is fresh.

**Verify**: `npx vitest run src/app/login` → pass; integration test passes/skips.

## Test plan

- New unit tests in the login actions test file: fail-closed on limiter error;
  IP-limit block; email-limit block.
- Pattern: `src/lib/auth/login-rate-limit.integration.test.ts` for real-PG behavior.
- Verification: `npx vitest run src/app/login` → all pass.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npx vitest run src/app/login` passes with new fail-closed + IP tests
- [ ] `npm run lint` exits 0
- [ ] `grep -n "rateLimitAllowed = true" src/app/login/actions.ts` returns no matches
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- `consumeIpRateLimit` cannot be called from the login action shape (no request
  context available the way `defineFormAction` has it) — STOP; report the actual
  signature and propose the minimal wiring.
- Fail-closed breaks a documented behavior (e.g., a graceful-degradation ADR) —
  STOP; report and cite the ADR.

## Maintenance notes

- Reviewer: confirm fail-closed does not lock out legitimate users during a
  transient DB outage — consider a narrow allowlist (e.g., `SKIP_AUTH` dev path)
  documented in CLAUDE.md.
- Plan 006 builds on this (env divergence).