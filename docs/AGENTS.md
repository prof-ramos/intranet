<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-26 | Updated: 2026-07-16 -->

# docs

## Purpose

Documentation directory covering architecture decisions, design guidelines, compliance checklists, development runbooks, user journeys, and operational procedures for the ASOF intranet.

## Key Files

| File                              | Description                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `runbook.md`                      | Operations runbook — deployment, monitoring, troubleshooting, and rollback procedures   |
| `environments.md`                 | Official source for environments, databases, data classes, migrations, and CI/CD        |
| `agents/jules-governance.md`      | Approval, publication, environment, audit, and incident controls for Google Jules       |
| `agents/coderabbit-governance.md` | OSS plan, opt-in review, security, quota, labels, and operating controls for CodeRabbit |

## Subdirectories

| Directory                        | Purpose                                                                                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`adr/`](./adr/)                 | Architecture Decision Records covering auth, DB, RLS, notifications, kanban, LGPD, go-live, rollback, environments and the MCP operator control plane (ADR 021) |
| [`agents/`](./agents/)           | Agent-facing documentation — issue tracker, triage labels and agent governance                                                                                  |
| [`compliance/`](./compliance/)   | LGPD compliance checklist and data handling policies                                                                                                            |
| [`design/`](./design/)           | Design system — theme tokens and oficios padrao templates                                                                                                       |
| [`development/`](./development/) | Development documentation — branch naming and the retired test-metrics schema note                                                                              |
| [`jornadas/`](./jornadas/)       | User journey maps — financeiro personas and monthly payment flows                                                                                               |
| [`lotacao/`](./lotacao/)         | Geographic assignment docs — postos no exterior and SERE                                                                                                        |

## For AI Agents

### Working In This Directory

- ADRs in `adr/` are the authoritative source for architectural decisions. Before making significant infrastructure changes, check existing ADRs.
- `environments.md` is the canonical environment matrix. Do not add a database, staging, preview, migration, or real-data workflow anywhere else without updating it.
- LGPD compliance docs in `compliance/` must be consulted before any work involving PII (CPF, SIAPE, email, address, functional data).
- `runbook.md` is the primary reference for deployment, rollback, and incident response.

### Testing Requirements

- Docs changes do not require tests, but validate links and formatting before committing.
- If adding new ADR, follow the naming convention in `adr/` (e.g., `013-*.md`).

### Common Patterns

- ADRs use a title line followed by Status, Context, Decision, Consequences.
- Screenshots in `design/screenshots/` are named `[page]-[state].png`.

## Dependencies

### Internal

- `../AGENTS.md` — Root project AGENTS with stack, database, and auth context
- `../CLAUDE.md` — Project instructions (read FIRST)

### External

- No external package dependencies; documentation only

<!-- MANUAL: -->
