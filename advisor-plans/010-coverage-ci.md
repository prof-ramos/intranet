# Plan 010: Enforce coverage thresholds in CI

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- .github/workflows/ci.yml vitest.config.ts`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P2 | **Effort**: S | **Risk**: LOW | **Depends on**: none
- **Category**: dx | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#248](https://github.com/prof-ramos/intranet/issues/248)

## Why this matters

`vitest.config.ts:34-40` sets coverage thresholds (lines 70 / functions 75 / branches 65)
but CI runs `npm run test` (no `--coverage`), so the thresholds are aspirational — a
regression that drags coverage below the floor ships green. Enforcing in CI makes the
configured gate real.

## Current state

- `vitest.config.ts:34-40` — `coverage.thresholds` configured.
- `.github/workflows/ci.yml` — `validate` job runs `npm run test` (vitest run, no coverage).
  Grep `coverage` in the workflow → empty (verified).
- `package.json` — `"test:coverage": "vitest run --coverage"` exists; `@vitest/coverage-v8`
  is the provider (per CLAUDE.md requires it).
- CI runners are Node 20.x GitHub Actions.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Coverage local | `npm run test:coverage` | exit 0 (thresholds met) |
| Validate | `npm run validate:quick` | exit 0 |

## Scope

**In scope**: `.github/workflows/ci.yml` only.
**Out of scope**: `vitest.config.ts` (threshold values stay), `package.json`.

## Steps

### Step 1: Add coverage to the validate CI job

In the `validate` job, after `npm run test`, add a step
`- run: npm run test:coverage`. Vitest exits non-zero when thresholds are missed,
so the job fails. Place it after the existing test step so unit failures surface first.

**Verify**: local `npm run test:coverage` exits 0 (thresholds currently met — verified
baseline 2026-06-23 per `TODO-PROD.md`).

### Step 2: Cache the coverage provider

If not already cached, ensure `@vitest/coverage-v8` is installed via the existing
`npm ci` step (it's a devDependency — confirm in `package.json`).

**Verify**: `npm run test:coverage` exits 0.

## Test plan

- No new tests. CI change only.
- Verification: `npm run test:coverage` locally exits 0; the CI step mirrors it.

## Done criteria

- [ ] `.github/workflows/ci.yml` `validate` job has `npm run test:coverage`
- [ ] Local `npm run test:coverage` exits 0
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- Local `npm run test:coverage` already fails (current coverage below threshold) —
  STOP; report the gap and either lower the threshold (with rationale) or fix coverage
  first. Do not commit a red CI step.
- `@vitest/coverage-v8` is not a devDependency — STOP; add it via `npm install -D`
  (operator approval) before the CI step.

## Maintenance notes

- Reviewer: confirm the coverage step runs in the same job as tests (not a new job)
  to avoid spinning a second runner for a one-line check.
- If thresholds need adjusting, change `vitest.config.ts` in the same PR.