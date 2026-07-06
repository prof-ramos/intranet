# Plan 012: `getAssociatesForReport` — bounded pagination

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/reports/queries.ts`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P2 | **Effort**: S | **Risk**: LOW | **Depends on**: none
- **Category**: perf | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#250](https://github.com/prof-ramos/intranet/issues/250)

## Why this matters

`getAssociatesForReport` selects all associates (no `.limit()`), decrypts 8 PII
columns per row in-memory, and returns the full set. As the associate count grows,
this is unbounded memory + DB work on a report path. Bounded pagination (or a
configurable hard cap) makes the report predictable and protects the DB pool
(`max: 10` per CLAUDE.md).

## Current state

- `src/lib/reports/queries.ts:110-169` — `getAssociatesForReport`:
  - lines 154-158: `db.select(reportColumns).from(associates).where(...).orderBy(...)`
    — no `.limit()`.
  - lines 169-184: `decryptPiiField(row.cpfCiphertext ?? null, row.cpf ?? null)` × 8 fields per row.
- `src/lib/reports/csv.ts` — CSV formatter (pt-BR, formula-injection prevention).
- Callers: the report route / server action that triggers the export.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npx vitest run src/lib/reports/queries.test.ts` | pass |
| Validate | `npm run validate:quick` | exit 0 |

## Scope

**In scope**: `src/lib/reports/queries.ts` + `queries.test.ts`.
**Out of scope**: `csv.ts`, the report UI/route, decryptPiiField itself.

## Steps

### Step 1: Add a hard cap

Add a `limit` parameter to `getAssociatesForReport` (default e.g. 5000) and apply
`.limit(limit)` to the query. Log a warning (structured logger, no PII) when the
result hits the cap so the operator knows the report was truncated.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Test the cap

Add a test that inserts >limit rows (or mocks the query) and asserts the result
length equals the cap and a warning is logged.

**Verify**: `npx vitest run src/lib/reports/queries.test.ts` → pass.

### Step 3: Surface truncation to the caller

Return a `{ rows, truncated: boolean, total?: number }` shape OR throw when the cap
is hit and let the caller decide — pick the one matching the report UI (check the
caller). If the UI cannot handle truncation, default to "throw with a message telling
the operator to narrow filters" rather than silently truncating.

**Verify**: `npm run validate:quick` → exit 0.

## Test plan

- New test: cap is enforced + truncation surfaced.
- Pattern: existing `queries.test.ts` (7 tests, mocks repository).
- Verification: `npx vitest run src/lib/reports/queries.test.ts` → all pass.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npx vitest run src/lib/reports/queries.test.ts` passes with the cap test
- [ ] `grep -n "\.limit(" src/lib/reports/queries.ts` shows the bound on the report query
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- The caller (report route/action) cannot handle the `{ rows, truncated }` shape —
  STOP; report the caller and pick the throw-on-cap approach.
- The report path already has a separate count guard the audit missed — STOP; reconfirm
  and close as REJECTED with rationale.

## Maintenance notes

- Reviewer: confirm truncation is never silent (log or surface to UI).
- If real export volumes grow past the cap, the fix is filter-driven narrowing, not a
  higher cap.