<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-26 | Updated: 2026-05-26 -->

# docs

## Purpose
Documentation directory covering architecture decisions, design guidelines, compliance checklists, development runbooks, user journeys, and operational procedures for the ASOF intranet.

## Key Files
| File | Description |
|------|-------------|
| `runbook.md` | Operations runbook — deployment, monitoring, troubleshooting, and rollback procedures |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `adr/` | Architecture Decision Records — 12 ADRs covering auth, DB, RLS, PII, notifications, kanban, LGPD, go-live, rollback, incident ownership, and DMS/Papra (see `adr/AGENTS.md`) |
| `agents/` | Agent-facing domain documentation — associates, issue-tracker, triage-labels (see `agents/AGENTS.md`) |
| `compliance/` | LGPD compliance checklist and data handling policies (see `compliance/AGENTS.md`) |
| `design/` | Design system — theme tokens, oficios padrao templates, UI screenshots (see `design/AGENTS.md`) |
| `development/` | Dev environment docs — Codex guardrails, FABRICA process, test-metrics (see `development/AGENTS.md`) |
| `jornadas/` | User journey maps — financeiro personas and monthly payment flows (see `jornadas/AGENTS.md`) |
| `lotacao/` | Geographic assignment docs — posteiros exterior posts and SERE (see `lotacao/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- ADRs in `adr/` are the authoritative source for architectural decisions. Before making significant infrastructure changes, check existing ADRs.
- LGPD compliance docs in `compliance/` must be consulted before any work involving PII (CPF, SIAPE, email, address, functional data).
- `runbook.md` is the primary reference for deployment, rollback, and incident response.

### Testing Requirements
- Docs changes do not require tests, but validate links and formatting before committing.
- If adding new ADR, follow the naming convention in `adr/` (e.g., `013-*.md`).

### Common Patterns
- ADRs use a title line followed by Status, Context, Decision, Consequences.
- Screenshots in `design/screenshots/` are named `[page]-[state].png`.
- FABRICA process docs outline the feature delivery workflow with review gates.

## Dependencies

### Internal
- `../AGENTS.md` — Root project AGENTS with stack, database, and auth context
- `../CLAUDE.md` — Project instructions (read FIRST)

### External
- No external package dependencies; documentation only

<!-- MANUAL: -->
