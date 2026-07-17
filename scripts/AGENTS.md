<!-- Parent: ../AGENTS.md -->

# Scripts

Purpose: Operational scripts — database, migrations, seed, PII, and dev utilities.

## Key Files

| File                             | Purpose                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check-db.ts`                    | Database health check                                                                                                                              |
| `guarded-migrate.ts`             | Migration script with safety guards (+ test)                                                                                                       |
| `seed-admin.ts`                  | Admin user seeding                                                                                                                                 |
| `seed-admin-config.ts`           | Admin seed config (+ test)                                                                                                                         |
| `seed-e2e.ts`                    | E2E test data seeding                                                                                                                              |
| `backfill-pii-encryption.ts`     | PII encryption backfill                                                                                                                            |
| `import-asof-associados-json.ts` | Importa associados de JSON (array flat, `asof_merged.json`). Uso: `npx tsx scripts/import-asof-associados-json.ts <arquivo> [--apply] [--replace]` |
| `codex-pre-tool-use-policy.mjs`  | Codex hook for Bash command policy                                                                                                                 |
| `check-pr-ready.sh`              | PR readiness check                                                                                                                                 |
| `check-scope.sh`                 | Scope validation                                                                                                                                   |
| `audit-jules.mjs`                | Read-only audit of Jules sessions and pull requests                                                                                                |
| `memlab-scenario.js`             | MemLab browser scenario                                                                                                                            |
| `setup-production-env.sh`        | Production env setup                                                                                                                               |
| `run-dev-60s.sh`                 | Controlled 60s dev server test                                                                                                                     |

## For AI Agents

Scripts run against local dev DB (`asof_intranet`) or Neon for production. Use `npm run db:migrate` for safe migrations. Never run raw SQL against production.
