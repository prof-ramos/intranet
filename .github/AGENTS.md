<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# GitHub

Purpose: GitHub workflows and project configuration.

## Key Files

| File | Purpose |
|------|---------|
| `workflows/ci.yml` | CI pipeline (lint, typecheck, test, e2e) |
| `workflows/migrate-staging.yml` | Staging migration workflow |
| `workflows/migrate-production.yml` | Guarded manual production migration workflow |
| `workflows/cleanup-neon-branch.yml` | Deletes preview Neon branches when pull requests close |
| `workflows/reconcile-production-identities.yml` | Controlled production identity reconciliation |
| `workflows/clear-duplicate-identity-hashes.yml` | Emergency duplicate-hash cleanup workflow |
| `workflows/issue-triage-shadow.yml` | Read-only/shadow issue triage automation |
| `actionlint.yaml` | Local actionlint configuration |
| `BRANCH_RULES.md` | Branch protection rules |
| `pull_request_template.md` | PR template |

## For AI Agents

CI runs on pushes/PRs to `main`. PRs require all checks passing. Migration and production-maintenance workflows are manual/guarded and must follow `docs/environments.md` and `docs/runbook.md`; staging requires its own database/secrets and must never point at production. Keep third-party action SHAs pinned.

## Testing Requirements

- Validate workflow YAML with actionlint and run the unit contract test matching the changed workflow.
- Do not trigger workflows, edit secrets, or change branch protection as part of documentation/code maintenance without explicit authorization.

<!-- MANUAL: -->
