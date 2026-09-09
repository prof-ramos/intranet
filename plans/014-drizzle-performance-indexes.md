# Plan 014: Declare wave-E performance indexes in the Drizzle table definitions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/db/schema/activities.ts src/lib/db/schema/audit.ts src/lib/db/schema/legal-consultations.ts src/lib/db/schema/associates.ts drizzle/postgres/0034_performance_query_indexes.sql drizzle/postgres/0029_pagination_count_index.sql src/lib/db/schema.integration.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/479

## Why this matters

Wave E created indexes in SQL (`0034_performance_query_indexes.sql`, `0029_pagination_count_index.sql`) and pinned them in `schema.integration.test.ts`, but several are missing from the Drizzle `pgTable` index callbacks. The next `npm run db:generate` can emit `DROP INDEX` for objects that production and CI still need. Mirror the live indexes in the schema so generate is a no-op (or only additive).

## Current state

`drizzle/postgres/0034_performance_query_indexes.sql`:

- `idx_activities_open_updated` — `(updated_at DESC, id DESC) WHERE status <> 'concluido'`
- `idx_activities_title_trgm` — GIN `title gin_trgm_ops`
- `idx_audit_entity_created` — `(entity_type, created_at DESC, id DESC)`
- `idx_audit_action_trgm` — GIN `action gin_trgm_ops`
- `idx_legal_notes_entity_created` — `(entity_type, entity_id, created_at, id)`
- `idx_legal_consultations_title_trgm` / `idx_legal_consultations_internal_number_trgm` — GIN

`0029_pagination_count_index.sql` — `idx_associates_paginated_list` (read the file for the exact columns/WHERE).

`src/lib/db/schema/activities.ts:52-59` — status, due_date, assignee, associate indexes; **no** `idx_activities_open_updated` or title trgm.

`src/lib/db/schema/audit.ts:36-40` — entity, performed_by, created_at; **no** `idx_audit_entity_created` or action trgm.

Legal consultations schema similarly missing trgm indexes.

`schema.integration.test.ts` around lines 670-704 already expects the 0034 names (confirm with grep).

**Conventions**

- Drizzle 0.45 `index('name').on(...)`, `uniqueIndex`, `.where(sql\`...\`)` for partial indexes, `using('gin', ...)` for trigram. Copy a GIN example from `src/lib/db/schema/associates.ts` if one exists (`rg gin_trgm src/lib/db/schema`).
- Do **not** create a new SQL migration if the indexes already exist in 0034/0029. Schema-only change.
- `CREATE INDEX CONCURRENTLY` remains a manual prod path (`drizzle/postgres/manual/`). Do not put CONCURRENTLY in `db:migrate` SQL.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Generate dry-run | `npx drizzle-kit generate --out /tmp/drizzle-check` is too invasive. Instead: `rg idx_activities_open_updated src/lib/db/schema` after edits | matches |
| Contract | `npm run test:db` | pass if local env; else skip and say so |
| Unit | `npx vitest run src/lib/db/schema.integration.test.ts` will fail without DB — don't. Run `npm run typecheck` | exit 0 |

If you run `npm run db:generate` against this repo’s configured out dir, **read the generated SQL before keeping it**. If it contains `DROP INDEX`, delete the generated file and STOP.

## Scope

**In scope**:
- `src/lib/db/schema/activities.ts`
- `src/lib/db/schema/audit.ts`
- `src/lib/db/schema/legal-consultations.ts`
- `src/lib/db/schema` file that owns `legal_notes` (grep `legal_notes` / `legalNotes`)
- `src/lib/db/schema/associates.ts` — only to add `idx_associates_paginated_list` if 0029 defined it and schema lacks it
- `src/lib/db/schema.integration.test.ts` only if a name was missing (should already list 0034)

**Out of scope**:
- Email-triage trigram (UI hidden; do not add unless 0034 already has it).
- New production indexes.
- Identity unique hashes (0033) — already in schema.

## Git workflow

- Branch: `chore/issue-<N>-drizzle-performance-indexes`
- Commit: `chore(db): espelhar índices 0034/0029 no schema Drizzle`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Read the SQL, list names

Open `0034` and `0029`. For each index, find the Drizzle table file. Add the matching `index(...)` with the same name (required so Drizzle does not rename).

Partial `idx_activities_open_updated`:

```ts
index('idx_activities_open_updated')
  .on(table.updatedAt.desc(), table.id.desc())
  .where(sql`${table.status} <> 'concluido'`),
```

GIN: follow associates trigram if present (`using('gin', sql\`${table.title} gin_trgm_ops\`)` or the Drizzle 0.45 equivalent in this repo). If you cannot express GIN in Drizzle without a new dependency, STOP and report — do not omit the name; a wrong btree declaration is worse (generate would change the index).

### Step 2: typecheck

`npm run typecheck`. Fix import of `sql` from `drizzle-orm`.

### Step 3: Do not generate a drop migration

Do not commit any new file under `drizzle/postgres/` unless it is empty/no-op. If generate created a drop, delete it.

## Test plan

- `test:db` expectedIndexes already contains these names — it should still pass (schema + DB still aligned).
- No behaviour tests.

## Done criteria

- [ ] Every index name in 0034 and `idx_associates_paginated_list` appears in `src/lib/db/schema`
- [ ] No new `DROP INDEX` SQL committed
- [ ] `npm run typecheck` exits 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- Drizzle cannot declare `gin_trgm_ops` in this version. STOP; do not emit a btree with the GIN name.
- `db:generate` produces DROP INDEX. Delete it, STOP, paste the generated SQL in the report.

## Maintenance notes

- Reviewer: names must match SQL exactly (`idx_activities_open_updated` etc.).
- Future generate: expect zero statements. If not, the schema still drifted.
