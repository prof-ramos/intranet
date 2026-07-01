# Plan 016: Tests for `error.tsx` + `ErrorBoundary` + `instrumentation.ts`

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/components/ErrorBoundary.tsx src/instrumentation.ts`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P3 | **Effort**: M | **Risk**: LOW | **Depends on**: none
- **Category**: tests | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#254](https://github.com/prof-ramos/intranet/issues/254)

## Why this matters

There are 18 `error.tsx` boundaries plus `src/components/ErrorBoundary.tsx` and
`src/instrumentation.ts` (registers `registerUnhandledHandlers()`). Zero behavioral
tests exist (`find src -name "error*.test.*"` returns only `error-log.test.ts`, which
tests the logger). An `error.tsx` that throws while rendering, an `ErrorBoundary` that
doesn't reset `key` on remount, or a no-op unhandled-handler in production all go
undetected.

## Current state

- `find src/app -name error.tsx` → 18 files.
- `src/components/ErrorBoundary.tsx` — client boundary.
- `src/instrumentation.ts:1-7` — `registerUnhandledHandlers()`.
- `src/lib/error-log.test.ts` — tests the logger only.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npx vitest run src/components/ErrorBoundary.test.tsx` | pass |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**: `src/components/ErrorBoundary.test.tsx` (create), a representative
`error.tsx.test.tsx` (one route-level test as a template).
**Out of scope**: all 18 `error.tsx` files (template + sample, not exhaustive), source changes.

## Steps

### Step 1: `ErrorBoundary.test.tsx`

Use React Testing Library. Render a child that throws; assert the fallback renders.
Render a child that throws then recovers; assert `key` reset re-renders the child.

**Verify**: `npx vitest run src/components/ErrorBoundary.test.tsx` → pass.

### Step 2: One route-level `error.tsx` test

Pick the most-trafficked route's `error.tsx` (e.g., `src/app/app/error.tsx` if it
exists). Test that a Server Action throw surfaces the boundary's expected UI.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: `instrumentation.ts` smoke test

If feasible (instrumentation hooks run at startup), assert
`registerUnhandledHandlers` is invoked and does not throw in production mode.

**Verify**: `npm run lint` → exit 0.

## Test plan

- New `ErrorBoundary.test.tsx`: throw → fallback; recovery → re-render.
- One route-level `error.tsx` test as template.
- Verification: `npm run validate:quick` → exit 0.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `ErrorBoundary.test.tsx` passes (throw + recovery)
- [ ] One route-level error test passes
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- The repo has no React Testing Library setup for component tests — STOP; report and
  propose adding `@testing-library/react` (operator approval) or use a Playwright-based
  boundary test instead.
- `instrumentation.ts` cannot be unit-tested (runs once at boot) — STOP; cover via an
  E2E smoke instead and note it.

## Maintenance notes

- Reviewer: this is a template + sample; do not require all 18 boundaries to have
  tests in this PR — the template lets future routes copy the pattern.