# Plan 023: Update `DATABASE.md` migration count and table

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- DATABASE.md drizzle/postgres/_journal.json`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P3 | **Effort**: S | **Risk**: LOW | **Depends on**: none
- **Category**: docs | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#261](https://github.com/prof-ramos/intranet/issues/261)

## Why this matters

`DATABASE.md` states "28 migrações aplicadas" but the migration table stops at `0027`,
while the filesystem has `0028_*`.sql`. The doc is out of sync with the journal — a
contributor reading `DATABASE.md` to understand the current schema state gets a wrong
count and a truncated table. Docs-as-source-of-truth drift is how onboarding goes wrong.

## Current state

- `DATABASE.md:91` — "28 migrações aplicadas" (or similar phrasing).
- `DATABASE.md:115-122` — migration table ends at `0027`.
- `drizzle/postgres/` — files through `0028_*`.sql` on disk.
- `drizzle/postgres/_journal.json` — the authoritative journal.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| List migrations | `ls drizzle/postgres/*.sql | sort` | see latest |
| Read journal | `cat drizzle/postgres/_journal.json` | see applied entries |
| Schema contract | `npm run test:db` | exit 0 |

## Scope

**In scope**: `DATABASE.md` only (the migration count line + the migration table).
**Out of scope**: `DATABASE.md` schema descriptions (unless they reference the missing
`0028` content), the journal, the migrations themselves.

## Steps

### Step 1: Reconcile count with the journal

Read `_journal.json` and `ls drizzle/postgres/*.sql`. The authoritative count is the
number of journal entries (applied) — note if the on-disk count diverges from the
journal (e.g., a migration file present but not yet in the journal).

### Step 2: Update the count line

Replace "28 migrações aplicadas" with the reconciled number + a note pointing to the
journal as the source of truth.

### Step 3: Extend the migration table

Add rows for `0028` (and `0029` if plan 007's `0029_nonce_unique.sql` has landed by
then — exclude if not yet). Match the existing table format.

**Verify**: `npm run test:db` → exit 0 (no schema change, just doc).

## Test plan

- No tests; this is a doc fix.
- Verification: `npm run test:db` still passes (sanity — doc change doesn't touch schema).

## Done criteria

- [ ] `DATABASE.md` migration count matches `_journal.json` entry count
- [ ] Migration table includes `0028` (and `0029` if landed)
- [ ] `npm run test:db` exits 0
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- The journal and on-disk counts diverge (a `.sql` file with no journal entry, or vice
  versa) — STOP; report the discrepancy and reconcile the journal (separate concern)
  before fixing the doc.
- `DATABASE.md` references a migration that the journal says was rolled back — STOP;
  report and document the rollback in the doc, not just the count.

## Maintenance notes

- Reviewer: confirm the count matches `_journal.json`, not just `ls`.
- Add a maintenance note in `DATABASE.md` pointing future authors to the journal as
  the source of truth, so this drift doesn't recur.