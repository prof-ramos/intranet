# Plan 018: Spike WebMCP tools for Atividades (do not build a chat UI)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/webmcp docs/adr/021-webmcp-secretaria.md src/app/app/atividades/actions.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/483

## Why this matters

CONTEXT.md: the daily CRM flow is Atividades (“atualizar endereço”) → cadastro → complete the task. ADR 021 exposed Secretaria tools (oficiais, ofícios, mala direta, dependentes) via `document.modelContext` and **explicitly deferred** atividades/jurídico pending a new tool-budget/role decision. The registry already mounts on the authenticated layout (`WebMcpRegistryWrapper`). This plan is a **spike that may land a small catalog**, not a chat product and not MCP server (#432). Cap: 4–6 tools that wrap **existing** server actions / navigation.

## Current state

- Catalog: `src/lib/webmcp/catalog.ts` — no activity tools.
- ADR 021: tools register in client components; `execute` calls the same server action as the UI or `router.push` for long forms; Playwright does not cover native WebMCP; Origin Trial is optional.
- Activity actions: `src/app/app/atividades/actions.ts` (`createActivity`, plus other exports — grep `export const`).
- Roles: `admin` | `diretoria` | `secretaria` all use the board (confirm with `e2e/tests/atividades.spec.ts` / `requireRole` on actions).

**Conventions**

- Reuse `defineFormAction` / `defineServerAction` already on atividades. Do not add a parallel API.
- PII: `assigneeName` / `associateName` are optimistic UI fallbacks (`CONTEXT.md` / AGENTS); canonical names come from `peopleById`. Serializers must not log PII (`sanitizePii`).
- No `Permissions-Policy: tools=()` (ADR 021).
- Portuguese tool descriptions for operators.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/lib/webmcp src/components/webmcp` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/lib/webmcp/catalog.ts` and related register/execute modules (grep `WEBMCP_CATALOG` / `registerTool`)
- Thin wrappers that call existing atividade server actions or `router.push('/app/atividades/...')`
- Tests following `src/components/webmcp/WebMcpRegistry.test.tsx`
- Short amendment to ADR 021 “Consequências / Follow-ups” listing the new tools

**Out of scope**:
- Chat UI, MCP HTTP server, jurídico tools.
- Playwright native WebMCP.
- Changing kanban DnD / board queries.
- Origin Trial production token (ops).

## Git workflow

- Branch: `feat/issue-<N>-webmcp-atividades`
- Commit: `feat(webmcp): tools de listar/criar/concluir atividades`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Inventory actions vs tools (write the list in the PR)

Allowed tools (pick ≤6; default set):

1. `open-activities` — `router.push('/app/atividades')` (any authenticated role).
2. `list-activities` — if a read server action or loader exists that returns a bounded list; otherwise skip and only navigate. Do **not** add a new unbounded `select()` from a tool.
3. `start-create-activity` — navigate to the create form (`start-*` pattern in ADR 021), do not POST the full form from the tool unless `createActivity` is already a compact action.
4. `complete-activity` — call the existing status-update action with `concluido` if one exists (grep `updateActivity` / `status`).
5. `assign-activity` — only if an existing action sets `assigneeId`.
6. `open-activity` — navigate to `/app/atividades/[id]` if that route exists; else skip.

If `complete-activity` would require a new service method, **do not invent one**; use `start-*` navigation only and document the gap in ADR 021.

### Step 2: Implement catalog + register

Follow an existing ofício tool as the template (open the file that registers `list-official-letters`). Same role filter: activities are for all `/app` roles unless actions are admin-only — **match the action’s `auth` array**, never widen.

### Step 3: Tests

Mock `document.modelContext`. Assert catalog entries appear for `secretaria` on `/app/atividades` (or app-wide like other `scope: 'app'` tools). Assert `diretoria` cannot call a tool if the underlying action forbids it.

**Verify**: `npx vitest run src/lib/webmcp src/components/webmcp`

### Step 4: ADR 021 note

One paragraph: atividades tools added; jurídico still deferred; still no chat.

## Test plan

- Pattern: `WebMcpRegistry.test.tsx`.
- No e2e native WebMCP (ADR 021).

## Done criteria

- [ ] ≤6 activity tools in `WEBMCP_CATALOG`, each mapped to an existing action or `router.push`
- [ ] No new write path that bypasses `defineFormAction` / `requireRole`
- [ ] Unit tests for catalog/role
- [ ] ADR 021 follow-up updated
- [ ] lint + typecheck pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- Completing/assigning requires a new service API. Ship only `open-activities` + `start-create-activity` and STOP after documenting the gap — that is an acceptable reduced COMPLETE, note it in the index.
- Tool execute would need the full board in memory. Do not load the unbounded board in a tool (board is already `.limit()`’d in the repo; still do not add a second query).
- Request to add jurídico in the same PR. Refuse.

## Maintenance notes

- Reviewer: role must equal the server action `auth` field.
- Native E2E remains a manual Chrome Origin Trial checklist, not Playwright.
- MCP operator server (#432) is a different surface.
