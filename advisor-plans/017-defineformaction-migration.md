# Plan 017: Migrate 17 action files to `defineFormAction`

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/server-actions/define-form-action.ts`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P2 | **Effort**: L | **Risk**: MED | **Depends on**: none
- **Category**: tech-debt | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#255](https://github.com/prof-ramos/intranet/issues/255)
- **Resolution (2026-07-09)**: All non-auth app `actions.ts` files use `defineFormAction` /
  `defineServerAction` / `defineNoInputServerAction` / `defineFormStateAction`. Last bare
  app file was `etiquetas/actions.ts` → `defineServerAction`. **Intentional holdouts**
  (custom redirect-on-error UX): `login`, `change-password`, `forgot-password`,
  `reset-password` — documented with `// not defineFormAction` comments.

## Why this matters

`defineFormAction` centralizes auth, rate-limit, Zod parsing, revalidate, and
redirect-error handling. It's adopted in 5 of 22 action files; 17 re-implement these
concerns (or skip them), so auth/rate-limit behavior drifts structurally across
action files. Migrating the 17 — money/auth first — closes the drift.

## Current state

- Adopters (verified): `app/associados/actions.ts`, `app/atividades/actions.ts`,
  `app/email-triage/actions.ts`, `app/juridico/actions.ts`, `app/secretaria/documentos/actions.ts`.
- 22 action files total; 17 use bare `useActionState`/`createAction` or ad-hoc patterns.
- `src/lib/server-actions/define-form-action.ts:14` — the factory; `consumeIpRateLimit` is wired here.

## Commands you will need

| Purpose   | Command                           | Expected |
| --------- | --------------------------------- | -------- |
| Typecheck | `npm run typecheck`               | exit 0   |
| Tests     | `npx vitest run src/app/<module>` | pass     |
| Validate  | `npm run validate:quick`          | exit 0   |

## Scope

**In scope** (migrate one per PR, priority order):

1. `src/app/login/actions.ts` (auth-critical; coordinate with plan 005)
2. `src/app/forgot-password/actions.ts`
3. `src/app/reset-password/actions.ts`
4. `src/app/app/financeiro/mensalidades/actions.ts` (money)
5. `src/app/app/secretaria/oficios/actions.ts`
6. … remaining 12 (lower risk)

**Out of scope**: the 5 already-adopted files, `define-form-action.ts` itself.

## Steps

Per file (one PR each):

### Step 1: Read the existing action's auth/rate-limit/parse logic

Document what it currently does (auth check, rate-limit, Zod schema, revalidate paths,
redirect handling). Compare to what `defineFormAction` provides.

### Step 2: Rewrite via `defineFormAction`

Replace the ad-hoc handler with `defineFormAction({ auth, rateLimit, schema, ... })`.
Preserve the exact public behavior (return shape, redirect targets, error messages).

**Verify**: `npm run typecheck` → exit 0; `npx vitest run src/app/<module>` → pass.

### Step 3: Add/keep a test asserting auth + rate-limit behavior

If the file had no auth test, add one (401/redirect when unauthenticated; rate-limit
block). Model on existing `defineFormAction`-adopter tests.

**Verify**: `npm run validate:quick` → exit 0.

## Test plan

- Per migrated file: an auth test + a rate-limit test (if absent).
- Pattern: existing adopter tests in `app/atividades/actions.ts` area.
- Verification: `npm run validate:quick` per PR → exit 0.

## Done criteria

- [ ] `npm run typecheck` exits 0 after each migration
- [ ] `grep -rln "useActionState\|createAction" src/app` no longer shows the migrated files (they use `defineFormAction`)
- [ ] `advisor-plans/README.md` status row updated (track which files migrated)

## STOP conditions

- A file's behavior cannot be expressed via `defineFormAction` (custom redirect flow,
  multi-step action) — STOP; report and either extend the factory (separate plan) or
  keep the file ad-hoc with a documented `// not defineFormAction because …` comment.
- Migrating `login/actions.ts` conflicts with plan 005 (fail-closed + IP limit) —
  coordinate: land plan 005 first, then migrate to `defineFormAction` so the factory
  carries the fail-closed semantics.

## Maintenance notes

- One file per PR — do not bundle 17 migrations; each touches a working form and
  auth/rate-limit regressions are subtle.
- Reviewer: confirm return shapes and redirect targets are byte-identical to the
  pre-migration behavior.
