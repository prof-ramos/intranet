<!-- Parent: ../AGENTS.md -->

# GitHub

Purpose: GitHub workflows and project configuration.

## Key Files

| File | Purpose |
|------|---------|
| `workflows/ci.yml` | CI pipeline (lint, typecheck, test, e2e) |
| `workflows/migrate-staging.yml` | Staging migration workflow |
| `BRANCH_RULES.md` | Branch protection rules |
| `pull_request_template.md` | PR template |

## For AI Agents

CI runs on pushes/PRs to `main`. PRs require all checks passing. Migration workflow is manual trigger only and must follow `docs/environments.md`; staging requires its own database/secrets and must never point at production.
