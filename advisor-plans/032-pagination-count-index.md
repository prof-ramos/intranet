# Plan 032: Optimize paginated count query

> **Executor instructions**: Follow this plan step by step.
>
> **Drift check**: `git diff --stat 257b5cc..HEAD -- src/lib/associates/repository.ts`

## Status

- **Priority**: P2 (perf)
- **Effort**: M (day-ish)
- **Risk**: LOW
- **Category**: performance

## Why

`findAssociatesPaginated` runs two parallel queries: one for rows, one for
`count()`. Without a specific composite index, the count query does a full scan
for large filtered result sets, adding 50–100ms per page load.

## Steps

### Step 1: Create migration

Create `drizzle/postgres/0029_pagination_count_index.sql`:

```sql
CREATE INDEX IF NOT EXISTS idx_associates_paginated_list
  ON associates (associationStatus, contributionStatus, functionalStatus, fullName, id);
```

### Step 2: Update journal

Add entry to `drizzle/postgres/meta/_journal.json`:
```json
{"idx": 29, "version": "7", "tag": "0029_pagination_count_index", "breakpoints": true}
```

### Step 3: Update schema integration test

In `src/lib/db/schema.integration.test.ts`, add `'idx_associates_paginated_list'`
to the associates array in `expectedIndexes`.

**Verify**: `npm run typecheck` → exit 0

## Done criteria

- [ ] Migration file exists and typecheck passes
- [ ] No unintended files are modified
