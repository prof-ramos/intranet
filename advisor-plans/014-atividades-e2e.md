# Plan 014: E2E spec for Atividades / Kanban DnD

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/app/app/atividades e2e/tests e2e/global-setup.ts`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P2 | **Effort**: M | **Risk**: LOW | **Depends on**: none
- **Category**: tests | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#252](https://github.com/prof-ramos/intranet/issues/252)

## Why this matters

The Atividades Kanban (`@hello-pangea/dnd`) is the primary UI of the module and has
zero automated browser coverage. The only existing check (`e2e/smoke-prod.spec.ts:125`)
creates an activity and loads the board but does not drag cards across status columns,
verify status-changed event persistence, or exercise reassignment notifications.
Smoke-prod runs only on `main` pushes and cannot gate PRs.

## Current state

- `e2e/tests/` — has `assinafy.spec.ts`, `associados.spec.ts`, `dashboard.spec.ts`,
  `financeiro.spec.ts`, `juridico.spec.ts`, `login.spec.ts`, `roles.spec.ts`,
  `secretaria.spec.ts`, `usuarios.spec.ts`. **No** `atividades.spec.ts`.
- `e2e/smoke-prod.spec.ts:125` — step 4 creates an activity, checks board loads.
- E2E runs at `http://127.0.0.1:3001` with `NEXT_E2E=1` (from CLAUDE.md); DB `asof_test`
  created by `e2e/global-setup.ts`.
- Local Node note (CLAUDE.md memory): prefix `PATH="/opt/homebrew/bin:$PATH"` to avoid
  Next.js native code-signing `dlopen` failures; kill port 3001 with
  `lsof -ti:3001 | xargs kill -9` between runs.
- `@hello-pangea/dnd` is the DnD library in `src/app/app/atividades/`.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| E2E (focused) | `npx playwright test e2e/tests/atividades.spec.ts` | pass |
| Full E2E | `npm run test:e2e` | pass |
| Local E2E (mac) | `PATH="/opt/homebrew/bin:$PATH" npm run test:e2e` | pass |

## Scope

**In scope**: `e2e/tests/atividades.spec.ts` (create), `e2e/global-setup.ts` (only if
fixtures need a seeded activity — extend, don't rewrite).
**Out of scope**: unit tests for the kanban component, `smoke-prod.spec.ts`.

## Steps

### Step 1: Spec skeleton + create-via-form test

Create `e2e/tests/atividades.spec.ts`. Add a test that logs in (model on
`login.spec.ts` / `associados.spec.ts`), navigates to `/app/atividades`, creates an
activity via the form, and asserts it appears on the board.

**Verify**: `npx playwright test e2e/tests/atividades.spec.ts --grep "create"` → pass.

### Step 2: DnD across status columns

Add a test that drags a card from `a_fazer` to `em_andamento` using Playwright's drag
API (see Context7 for `@hello-pangea/dnd` drag semantics — the library uses pointer
events; a `page.mouse` drag with the right selectors works). Assert the card lands in
the new column and a status-changed event persisted (reload the page and confirm).

**Verify**: `npx playwright test e2e/tests/atividades.spec.ts --grep "drag"` → pass.

### Step 3: Reassignment + optimistic-concurrency

Add a test that reassigns an activity to another user and asserts a notification
fires (poll the bell). Add a test that opens the same activity in two contexts,
edits in one, edits in the other, and asserts the second surfaces a
`CONCURRENCY_CONFLICT` error.

**Verify**: `npx playwright test e2e/tests/atividades.spec.ts` → all pass.

## Test plan

- New `atividades.spec.ts`: create, DnD status change, reassignment notification,
  optimistic-concurrency conflict.
- Pattern: `e2e/tests/associados.spec.ts` for auth + navigation; Context7 for
  `@hello-pangea/dnd` drag API.
- Verification: `npx playwright test e2e/tests/atividades.spec.ts` → all pass.

## Done criteria

- [ ] `e2e/tests/atividades.spec.ts` exists with create + DnD + reassignment + concurrency tests
- [ ] `npx playwright test e2e/tests/atividades.spec.ts` passes locally (with `PATH` prefix on mac)
- [ ] No changes outside `e2e/` (`git status`)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- Playwright's drag API does not move `@hello-pangea/dnd` cards (the library may need
  a `Keyboard` Space-to-grab sequence) — STOP; consult Context7 for the library's
  documented drag protocol and report the exact sequence needed.
- Optimistic-concurrency cannot be reproduced in E2E (timing) — STOP; report and
  cover it with a unit test in `activities/service.test.ts` instead (already covered
  there — confirm and drop the E2E variant).

## Maintenance notes

- Reviewer: confirm the DnD test actually moves the card (not just clicks it) — a
  flaky DnD test is worse than none; use `data-testid` attributes on the kanban
  columns/cards if selectors are brittle.
- Memory note: clean port 3001 between runs to avoid EADDRINUSE orphans.