<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# Architecture Decision Records

## Purpose

Authoritative record of significant architectural and operational decisions, including their context, chosen approach and consequences.

## Coverage

The numbered ADRs cover RLS/auth boundaries, production readiness and rollback, password reset, LGPD retention/export, database and environment governance, ofícios/Assinafy, event outbox, storage evaluation and WebMCP.

## For AI Agents

### Working In This Directory

- Read relevant existing ADRs before proposing a conflicting architecture or production procedure.
- Add a new zero-padded numbered ADR for a new durable decision; do not silently rewrite accepted history.
- If a decision changes, mark the old ADR superseded and link both directions.
- Keep environment/database claims aligned with `docs/environments.md`, the canonical matrix.

### Validation Requirements

- Validate internal links, referenced paths and numbering.
- Run `node scripts/check-docs.mjs` for documentation changes that alter commands or paths.

### Common Pattern

- ADRs state title, status, context, decision and consequences; operationally sensitive decisions also link to the runbook.

## Dependencies

- `../environments.md` — canonical environment and data matrix
- `../runbook.md` — executable operational procedures
- `../../ARCHITECTURE.md` and `../../DATABASE.md` — derived architecture/schema references

<!-- MANUAL: -->
