---
allowed-tools: Read, Write, Edit, Bash
argument-hint: '<migration-description> (e.g. "add index to associates email")'
description: Create a Drizzle ORM migration for this project following all naming conventions, journal update, and safety rules
---

# New Drizzle Migration

Create a migration for: **$ARGUMENTS**

## Steps

### 1. Check current migration state

```
!ls drizzle/postgres/
!cat drizzle/postgres/meta/_journal.json | tail -20
```

Identify the next zero-padded index (e.g. if last is `0054_*`, next is `0055`).

### 2. Update the Drizzle schema

Edit the relevant file in `src/lib/db/schema/`. Follow these rules:
- **Enums**: Use `pgEnum` in `src/lib/db/schema/enums.ts` for any bounded set of values — never `text` with a CHECK constraint for enum-like fields.
- **CHECK constraints**: Use table-level `check()` (3rd argument of `pgTable`), never column-level `.check()`.
- **Indexes**: Prefix with `idx_`. Use partial indexes with `WHERE` for conditional queries. Use `gin_trgm_ops` for LIKE search columns.
- **CONCURRENTLY**: `CREATE INDEX CONCURRENTLY` must go in its own separate migration file — Drizzle wraps migrations in transactions and CONCURRENTLY cannot run inside a transaction.

### 3. Generate the migration SQL

```
!npm run db:generate
```

### 4. Rename and verify the generated file

The filename convention accepts both manually chosen descriptive names and Drizzle-generated creative/tematic names:
- `<index>_<short-description>.sql` — manual descriptive style (e.g. `0055_add_email_index_associates.sql`)
- `<index>_<drizzle-style>.sql` — Drizzle-generated thematic style (e.g. `0055_strange_wrecking_crew.sql`)
- Zero-padded index (e.g. `0055`)
- Lowercase, underscores, no hyphens

Review the generated SQL. Flag anything that needs manual intervention:
- `ALTER COLUMN TYPE ... USING` → Drizzle doesn't generate these; write manually
- `CREATE INDEX CONCURRENTLY` → must be a separate migration file
- Dropping columns that still have data → add a comment

### 5. Update `_journal.json`

Add an entry to `drizzle/postgres/meta/_journal.json`:
```json
{
  "idx": <next-index>,
  "version": "7",
  "when": <current-unix-timestamp-ms>,
  "tag": "<filename-without-.sql>",
  "breakpoints": true
}
```

Get the timestamp: `!python3 -c 'import time; print(int(time.time()*1000))'`

### 6. Run the migration against the test database

```
!npm run test:db
```

If the test database is configured, also run:
```
!npm run db:migrate
```

Do **not** use `db:migrate:unsafe` unless the guarded migration explicitly fails for a known reason.

### 7. Safety checklist before finishing

- [ ] No plaintext PII columns added without a matching ciphertext column plan
- [ ] RLS policies updated if new table added (use `TO authenticated`, add `FORCE ROW LEVEL SECURITY`)
- [ ] `CONCURRENTLY` indexes are in their own file
- [ ] `_journal.json` entry added with correct timestamp and tag
- [ ] `npm run test:db` passes
