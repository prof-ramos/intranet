# Branch Naming Convention — ASOF Intranet

**Status:** Recommended (2026-05-29)

## Goal

Consistent, discoverable branch names that map 1:1 to GitHub Issues and make it obvious what type of change and which domain is affected.

## Convention

```
<type>/issue-<number>-<kebab-case-short-description>
```

### Components

- **`<type>`** (required, lowercase, conventional-commit style):
  - `feat/` — New user-facing functionality or major capability
  - `fix/` — Bug fix, small correction, or alignment change
  - `refactor/` — Internal restructuring, service extraction, module split, no user-visible behavior change
  - `docs/` — Documentation, ADRs, runbooks, decision records
  - `test/` — Test-only changes (when not bundled with feat/fix)
  - `chore/` — Tooling, dependencies, non-production config, CI

- **`issue-<number>`** (required when tied to an issue):
  - Always use the GitHub issue number
  - Enables easy cross-referencing (`Closes #123`)

- **`<kebab-case-short-description>`**:
  - 3–8 words max
  - Focus on the *what* (e.g. `lgpd-retention`, `documents-service`, `auth-service`)
  - Avoid implementation details (`extract-foo-from-bar` is ok only if that's the core of the PR title)

## Examples (Current Good Practice)

```bash
feat/issue-72-lgpd-retention
refactor/issue-97-associates-profile
fix/issue-73-lgpd-button-label
docs/issue-93-papra-dms-evaluation
refactor/issue-101-documents-service
refactor/issue-102-split-integrations-auth
```

## Legacy / Acceptable (Minimize New Usage)

- `feature/issue-98-auth-service` — older style, still present in some open PRs
- `Pimaco` — anti-pattern (no type, no issue number, misleading name)

## Workflow Rules

1. **Always create from `main`** (or the intended base branch).
2. **One branch per issue** (or per tightly-coupled group of issues).
3. **Never reuse a branch name** after force-push for a different purpose.
4. When a branch name is poor (e.g. `Pimaco` for auth cron work), create a properly named branch and open a new PR; close the old one.
5. Delete remote branches after the associated PR is merged or closed (keep history via the PR).
6. For large initiatives not mapped to a single issue, use `feature/<initiative-slug>` sparingly and document the scope in the PR description.

## Enforcement

- No automated enforcement today (pre-commit or branch protection).
- During code review, reviewers should flag branches that violate this convention.
- When cleaning up (as in May 2026 post-Go-Live), prefer the `refactor/` / `feat/` variants over older `fix/` or `feature/` duplicates.

## Related

- [GitHub Issue Tracker guidance](../../agents/issue-tracker.md)
- [Development guardrails](./codex-development-guardrails.md)
- [Worktree usage](./codex-worktrees-and-automations.md)
