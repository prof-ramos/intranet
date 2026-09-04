<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# Atividades

## Purpose

Authenticated kanban interface for creating, filtering, assigning and moving administrative activities.

## Key Files

| File | Description |
|---|---|
| `page.tsx` | Server entry that loads board data |
| `AtividadesBoard.tsx` | Main client board orchestration |
| `actions.ts` | Server Actions for activity mutations |
| `ReassignModal.tsx` | Assignee-change workflow |
| `_board/types.ts` | Board-specific view types |
| `_board/url-state.ts` | URL filter serialization and parsing |
| `_board/useBoardPreferences.ts` | Persisted board display preferences |
| `nova/NovaAtividadeForm.tsx` | Activity creation form |

## Subdirectories

| Directory | Purpose |
|---|---|
| `_board/` | Columns, cards, drawer, filters, quick-add, summaries and board helpers |
| `nova/` | New-activity form and associate/assignee/tag inputs |

## For AI Agents

### Working In This Directory

- `peopleById` is authoritative for names; `assigneeName` and `associateName` are optimistic rendering fallbacks and must not be removed as alleged PII duplication.
- Keep URL state, server-loaded filters and client board preferences compatible.
- Mutations belong in Server Actions and domain services; enforce authorization server-side.
- Preserve optimistic UI rollback behavior when changing drag, status or reassignment flows.

### Testing Requirements

- Run focused Vitest files in this directory and `src/lib/activities/`.
- Run `e2e/tests/atividades.spec.ts` for interaction or navigation changes.

### Common Patterns

- `_board/` contains presentation/view-state logic; canonical activity rules live in `src/lib/activities/`.
- Tests are colocated with actions, helpers, URL state, preferences and components.

## Dependencies

- `src/lib/activities/` — activity queries, repository, service and transformations
- `src/lib/auth/` — role and session enforcement
- `src/components/` — shared layout and feedback components

<!-- MANUAL: -->
