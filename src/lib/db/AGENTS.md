<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# Database

## Purpose

Drizzle/PostgreSQL connection layer, retry/query helpers, schema definitions and live schema-contract tests.

## Key Files

| File                         | Description                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `index.ts`                   | Shared Drizzle client and PostgreSQL pool configuration                      |
| `retry.ts`                   | Narrow retry policy for transient database failures                          |
| `like-pattern.ts`            | Safe escaping for SQL LIKE patterns                                          |
| `schema.integration.test.ts` | Live contract for tables, columns, enums, indexes, extensions and migrations |
| `schema/index.ts`            | Schema barrel imported by Drizzle and application code                       |
| `schema/enums.ts`            | Shared PostgreSQL enums                                                      |

## Subdirectories

| Directory | Purpose                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `schema/` | One typed Drizzle schema module per domain, including auth, activities, associates, finance, legal, integrations and documents |

## For AI Agents

### Working In This Directory

- Multi-table writes must use `db.transaction()`.
- Bounded status/type fields use PostgreSQL enums; keep Portuguese enum values aligned with the contract test.
- Pooled `DATABASE_URL` is for runtime; direct `DATABASE_MIGRATION_URL` is for migration tooling.
- Preserve pool limits, statement timeout and application name unless an evidence-backed performance change requires otherwise.
- New protected PII write paths should use encryption plus blind indexes where the domain supports them.

### Testing Requirements

- Run focused unit tests for helper changes.
- For any schema or migration change, update `schema.integration.test.ts`, generate a migration, then run gates in order: `npm run test`, `npm run test:db`, `npm run build`.
- Integration tests require the dedicated local database configured by `.env.test.local`.

### Common Patterns

- Schema definitions use typed Drizzle columns, constraints and indexes.
- Repository modules are colocated under `src/lib/<domain>/`, not in this directory.
- Do not use transaction-pooler URLs for migrations.

## Dependencies

- `drizzle/postgres/` — generated and reviewed SQL migrations
- `drizzle.config.ts` — migration generation configuration
- `postgres` and `drizzle-orm` — database driver and ORM

<!-- MANUAL: -->
