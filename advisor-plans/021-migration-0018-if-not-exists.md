# Plan 021: Make migration `0018_add_oficio_notification_types.sql` idempotent

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- drizzle/postgres/0018_add_oficio_notification_types.sql`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P3 | **Effort**: S | **Risk**: LOW | **Depends on**: none
- **Category**: migration | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#259](https://github.com/prof-ramos/intranet/issues/259)

## Why this matters

`drizzle/postgres/0018_add_oficio_notification_types.sql` has two
`ALTER TYPE ... ADD VALUE` statements without `IF NOT EXISTS`. Every other enum-extending
migration in the repo (`0006`, `0009`, `0028`) uses `IF NOT EXISTS` for re-runnability.
`0018` is the lone outlier: re-applying it (e.g., during a reset/restore sequence that
re-runs the journal) raises `duplicate_value` and aborts the migration run. Low blast
radius today (the migration already applied once in most envs), but it breaks the
"all migrations idempotent" contract.

## Current state

- `drizzle/postgres/0018_add_oficio_notification_types.sql` — 2 `ALTER TYPE ... ADD VALUE`
  lines, no `IF NOT EXISTS`.
- Idempotent exemplars: `0006_*.sql`, `0009_*.sql`, `0028_*.sql` — use `IF NOT EXISTS`.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Read migration | `cat drizzle/postgres/0018_add_oficio_notification_types.sql` | (inspect) |
| Schema contract | `npm run test:db` | exit 0 |

## Scope

**In scope**: `drizzle/postgres/0018_add_oficio_notification_types.sql` only.
**Out of scope**: the migration journal (`_journal.json`), other migrations, runtime code.

## Steps

### Step 1: Read the migration

Confirm the two `ALTER TYPE ... ADD VALUE` lines and the exact enum names.

### Step 2: Add `IF NOT EXISTS`

Append `IF NOT EXISTS` to both `ADD VALUE` clauses (match the `0006`/`0009`/`0028` form).

**Verify**: `cat drizzle/postgres/0018_add_oficio_notification_types.sql` shows
`IF NOT EXISTS` on both lines.

### Step 3: Run schema contract test

**Verify**: `npm run test:db` → exit 0.

## Test plan

- `npm run test:db` confirms schema alignment (the enum values still resolve).
- Manual: optionally re-apply the migration on a scratch DB to confirm idempotency
  (not required for done criteria — the change is a one-line guard).

## Done criteria

- [ ] Both `ALTER TYPE ... ADD VALUE` lines have `IF NOT EXISTS`
- [ ] `npm run test:db` exits 0
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- The migration journal marks `0018` as already applied and Drizzle won't re-run it —
  note: this is expected; the fix is forward-looking for reset/restore scenarios, not a
  re-run of an applied migration. Do not force re-run.
- Another migration in the journal also lacks `IF NOT EXISTS` — STOP; report and
  expand scope to all of them in one PR (do not split).

## Maintenance notes

- Reviewer: confirm only `0018` changed and the journal is untouched.
- This is a no-op for already-migrated envs; it only matters on re-apply.