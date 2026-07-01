# Plan 018: Adopt `DomainError` hierarchy in 5 hot services

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/errors/index.ts`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P2 | **Effort**: M | **Risk**: MED | **Depends on**: none
- **Category**: tech-debt | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#256](https://github.com/prof-ramos/intranet/issues/256)

## Why this matters

`src/lib/errors/index.ts` defines `DomainError`, `ConcurrencyConflictError`,
`NotFoundError`, `ValidationError`, `RateLimitError`, `ExternalServiceError`,
`UnauthorizedError` — but only 3 files import them. Other services throw plain
`new Error(...)`, so the typed `code`/`cause` discrimination is lost at the call
boundary — UI error mapping, audit logging, and `error.tsx` rendering can't
distinguish a concurrency conflict from a validation error from a crash.

## Current state

- `src/lib/errors/index.ts` — the 7-class hierarchy.
- Adopters (verified): `src/app/app/associados/[id]/DependentManager.tsx`,
  `src/app/app/associados/[id]/actions.ts`, `src/lib/associates/service.ts`.
- `throw new Error(...)` sites in `activities/service.ts`, `finance/service.ts`,
  `juridico/service.ts`, `oficios/service.ts`, `assinafy/service.ts` — locate each.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm run test` | pass |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**: `src/lib/activities/service.ts`, `src/lib/finance/service.ts`,
`src/lib/juridico/service.ts`, `src/lib/oficios/service.ts`, `src/lib/assinafy/service.ts`,
their tests, and the relevant `error.tsx` / `actions.ts` catch sites.
**Out of scope**: `src/lib/errors/index.ts` (no new classes), unrelated services.

## Steps

### Step 1: Audit throw sites

For each of the 5 services, grep `throw new Error(` and classify each by intended
semantic: validation (`ValidationError`), not-found (`NotFoundError`), concurrency
(`ConcurrencyConflictError` — already used in activities), rate-limit (`RateLimitError`),
external (`ExternalServiceError` for Assinafy/Gmail), unauthorized (`UnauthorizedError`).

### Step 2: Replace per service (one PR per service)

Swap `throw new Error('msg')` for `throw new ValidationError('msg')` (etc.). Preserve
message strings. Add `cause` where the original swallowed an underlying error.

**Verify**: `npm run typecheck` → exit 0; `npx vitest run src/lib/<svc>/service.test.ts` → pass
(tests asserting `.toThrow('msg')` still pass — `DomainError` extends `Error`).

### Step 3: Wire the call boundary

In each service's `actions.ts` / `error.tsx`, update catch blocks to branch on
`instanceof ConcurrencyConflictError` vs `ValidationError` etc. (mirror
`associates/[id]/actions.ts`).

**Verify**: `npm run validate:quick` → exit 0.

## Test plan

- Existing `.toThrow('msg')` tests still pass (`DomainError extends Error`).
- Add tests asserting the thrown class (`expect(...).rejects.toBeInstanceOf(ValidationError)`).
- Verification: `npm run validate:quick` → exit 0.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` passes
- [ ] 5 services throw `DomainError` subclasses, not bare `Error`
- [ ] At least the activities `error.tsx`/`actions.ts` branches on `instanceof`
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- A throw site is genuinely generic (not classifiable) — STOP; report and leave it
  as `Error` with a comment explaining why.
- An `error.tsx` consumer depends on the exact `Error` class identity — STOP; report
  and migrate the consumer first.

## Maintenance notes

- Reviewer: confirm no error message changed (UI may depend on exact strings).
- This enables future structured error mapping; don't expand scope to refactor the
  `error.tsx` rendering layer in the same PR.