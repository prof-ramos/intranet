<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# Scripts

Purpose: Operational scripts — database, migrations, seed, PII, and dev utilities.

## Key Files

| File                                     | Purpose                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `guarded-migrate.ts`                     | Migration script with safety guards (+ test)                                                          |
| `seed-admin.ts`                          | Admin user seeding                                                                                    |
| `seed-admin-config.ts`                   | Admin seed config (+ test)                                                                            |
| `seed-dev.ts`                            | Synthetic local seed for oficiais, mensalidades, atividades, jurídico e ofícios                       |
| `dev-admin.ts`                           | Provisiona de forma fail-closed a identidade técnica usada por `SKIP_AUTH` no seed de desenvolvimento |
| `dev-admin-store.ts`                     | Adapter PostgreSQL do provisionamento técnico, incluindo realinhamento da identity                    |
| `seed-e2e.ts`                            | E2E test data seeding                                                                                 |
| `backup-neon-level1.sh`                  | Backup Nível 1 (`pg_dump`) do Neon                                                                    |
| `reconcile-associate-identities.ts`      | Reconciliação fail-closed de identidades duplicadas (Plano 064)                                       |
| `check-associate-identity-duplicates.ts` | Diagnóstico read-only de identidades cadastrais duplicadas                                            |
| `clear-duplicate-identity-hashes.ts`     | Limpeza controlada de hashes duplicados, usada apenas pelo workflow autorizado                        |
| `migrate-legacy.ts`                      | Migração de dados legados com transformações testadas                                                 |
| `run-integration-tests.mjs`              | Runner protegido para testes de integração em banco dedicado                                          |
| `check-docs.mjs`                         | Valida scripts npm, links Markdown e paths em fences shell                                            |
| `check-pr-ready.sh`                      | PR readiness check                                                                                    |
| `check-scope.sh`                         | Scope validation                                                                                      |
| `audit-jules.mjs`                        | Read-only audit of Jules sessions and pull requests                                                   |
| `run-dev-60s.sh`                         | Controlled 60s dev server test                                                                        |

## Subdirectories

| Directory        | Purpose                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `manual/`        | Utilitários deliberadamente manuais para amostras e testes externos; leia o README antes de executar |
| `storage-spike/` | Evidências do spike de armazenamento R2 versus Garage associado ao ADR 020                           |

## For AI Agents

Scripts run against local dev DB (`asof_intranet`) or Neon only through guarded, documented production workflows. Use `npm run db:migrate` for safe migrations. Never run raw SQL against production. Preserve host guards and fail-closed defaults when editing operational scripts.

## Testing Requirements

- Run the colocated Vitest test for the changed script.
- For migration, seed or integration-runner changes, run `npm run typecheck` and the relevant guarded command in a local/test environment only.

<!-- MANUAL: -->
