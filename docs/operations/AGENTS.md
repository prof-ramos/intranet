<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# Operations

## Purpose

Focused operational procedures and follow-up plans for production data hygiene, identity reconciliation, secret handling and smoke observation.

## Key Files

| File | Description |
|---|---|
| `associate-identity-reconciliation.md` | Diagnosis and controlled handling of duplicate official identities |
| `pii-plaintext-sunset.md` | Plan for retiring accepted legacy plaintext PII |
| `secrets-hygiene.md` | Secret inventory, handling and remediation guidance |
| `post-merge-smoke-observation.md` | Production smoke observation after merge/deploy |
| `archive/` | Historical analysis retained for context, not current procedure |

## For AI Agents

### Working In This Directory

- Treat `docs/runbook.md` and `docs/environments.md` as higher-level operational authorities.
- Clearly distinguish read-only diagnosis, reversible remediation and destructive production action.
- Never include connection strings, credentials, plaintext PII or OAuth callback codes.
- Archived material is historical evidence; do not present it as current instructions without verification.

### Validation Requirements

- Check every command, path and workflow name against the repository.
- Run `node scripts/check-docs.mjs` after changing executable snippets or links.

## Dependencies

- `../runbook.md` — deployment, migration, incident and rollback runbook
- `../environments.md` — official database/environment matrix
- `../adr/` — decisions governing production operations
- `.github/workflows/` and `scripts/` — controlled implementations referenced by these procedures

<!-- MANUAL: -->
