# Plan 020: tsconfig — enable stricter flags incrementally

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- tsconfig.json`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P3 | **Effort**: M | **Risk**: HIGH | **Depends on**: none
- **Category**: dx | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#258](https://github.com/prof-ramos/intranet/issues/258)

## Why this matters

`tsconfig.json` has `strict: true` but omits `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
`noImplicitReturns`. Array indexing returns `T` instead of `T | undefined` (525 src
files do unchecked indexing), switch fallthrough and implicit `undefined` returns
compile silently. The "strict" label is leakier than it appears — matters in a codebase
with heavy enum `switch` dispatch. Enabling all at once will surface dozens of errors;
stage incrementally.

## Current state

- `tsconfig.json` — `"strict": true`; none of the 5 flags present (verified).
- `finance/service.ts` `validateStatusTransition` @line 36, `activities/service.ts`
  status/priority validation @lines 58-64 — enum `switch`/validation dispatch (fallthrough risk).
- `associates/repository.ts`, `email-triage/analyzer.ts` `getRecordArray` — unchecked indexing.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck (current) | `npm run typecheck` | exit 0 (baseline) |
| Typecheck (flag on) | edit tsconfig then `npm run typecheck` | see error count per flag |

## Scope

**In scope**: `tsconfig.json` + per-directory `tsconfig.json` overrides if needed + the
files flagged by each new check.
**Out of scope**: unrelated refactors.

## Steps

### Step 1: Cheap flags first

Enable `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noImplicitOverride`
(low blast radius). Run `npm run typecheck`; fix the surfaced errors (likely few —
add `return` / `break` / `override`).

**Verify**: `npm run typecheck` → exit 0 with the 3 flags on.

### Step 2: `exactOptionalPropertyTypes`

Enable; fix surfaced errors (typically `x?: T` vs `x: T | undefined` mismatches).
This can be noisy — fix mechanically (`?` → `| undefined` where the value is
explicitly passed as `undefined`).

**Verify**: `npm run typecheck` → exit 0.

### Step 3: `noUncheckedIndexedAccess` (staged)

This surfaces the most errors. Stage it module-by-module via per-directory
`tsconfig.json` `extends` + `compilerOptions.noUncheckedIndexedAccess: true`. Start
with a low-churn module (e.g., `src/lib/db/`), expand outward over multiple PRs.

**Verify**: per module, `npm run typecheck` → exit 0.

## Test plan

- No new tests; typecheck is the gate.
- After each flag, run `npm run test` to confirm no runtime regression from the fixes.
- Verification: `npm run validate:quick` → exit 0 after each stage.

## Done criteria

- [ ] `npm run typecheck` exits 0 with the 3 cheap flags on
- [ ] `exactOptionalPropertyTypes` on, typecheck exit 0
- [ ] `noUncheckedIndexedAccess` on for at least one module via per-directory override, typecheck exit 0
- [ ] `npm run validate:quick` exits 0
- [ ] `advisor-plans/README.md` status row updated (track which flags landed)

## STOP conditions

- `exactOptionalPropertyTypes` surfaces >100 errors across many files — STOP; report
  the count and either stage it per-module like `noUncheckedIndexedAccess` or defer.
- `noUncheckedIndexedAccess` surfaces errors in generated/migration code — STOP;
  exclude those directories from the flag via per-directory override.
- A flag changes runtime behavior (not just types) — STOP; investigate before
  committing.

## Maintenance notes

- Reviewer: each flag should be its own PR; do not bundle all 5.
- The end state is all 5 flags on repo-wide; track progress in the README status row.
- **Drift vs uncommitted work (recorded during vet):** the original "Current state"
  cited `activities/domain-events.ts` as an enum-switch example. That file does NOT
  exist at `844df3b` (it is uncommitted ADR 018 work — same drift class as plans
  002/011/024). The citation was motivation prose only; no step modifies that file
  (the work is enabling tsconfig flags + fixing what TS reports, which is
  file-discovery-driven, not citation-driven). Replaced with `finance/service.ts
  validateStatusTransition` @36 and `activities/service.ts` @58-64 (both verified at
  `844df3b`). When ADR 018 lands, `activities/domain-events.ts` may become a
  legitimate additional example. See memory `feedback_advisor_plans_vs_uncommitted_work`.