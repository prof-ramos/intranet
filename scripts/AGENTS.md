<!-- Parent: ../AGENTS.md -->

# Scripts

Purpose: Operational scripts — database, migrations, seed, PII, and dev utilities.

## Key Files

| File                                  | Purpose                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `guarded-migrate.ts`                  | Migration script with safety guards (+ test)                                                     |
| `seed-admin.ts`                       | Admin user seeding                                                                               |
| `seed-admin-config.ts`                | Admin seed config (+ test)                                                                       |
| `seed-dev.ts`                         | Synthetic local seed for oficiais, mensalidades, atividades, jurídico e ofícios                  |
| `dev-admin.ts`                        | Provisiona de forma fail-closed a identidade técnica usada por `SKIP_AUTH` no seed de desenvolvimento |
| `dev-admin-store.ts`                  | Adapter PostgreSQL do provisionamento técnico, incluindo realinhamento da identity               |
| `seed-e2e.ts`                         | E2E test data seeding                                                                            |
| `backup-neon-level1.sh`               | Backup Nível 1 (`pg_dump`) do Neon                                                               |
| `reconcile-associate-identities.ts`   | Reconciliação fail-closed de identidades duplicadas (Plano 064)                                  |
| `check-docs.mjs`                      | Valida scripts npm, links Markdown e paths em fences shell                                       |
| `check-pr-ready.sh`                   | PR readiness check                                                                               |
| `check-scope.sh`                      | Scope validation                                                                                 |
| `audit-jules.mjs`                     | Read-only audit of Jules sessions and pull requests                                              |
| `run-dev-60s.sh`                      | Controlled 60s dev server test                                                                   |

## For AI Agents

Scripts run against local dev DB (`asof_intranet`) or Neon for production. Use `npm run db:migrate` for safe migrations. Never run raw SQL against production.
