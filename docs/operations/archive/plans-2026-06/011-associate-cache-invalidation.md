# Plan 011: Invalidate 'associates' and 'dashboard' cache tags on associate mutations

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 93ab643..HEAD -- src/app/app/associados/actions.ts src/app/app/associados/\[id\]/actions.ts`
> If either file changed since this plan was written, compare the "Current state"
> excerpts before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/010-revalidatetag-arity.md (establishes correct `revalidateTag` arity)
- **Category**: perf / bug
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

The dashboard reads counts of active, in-debt, and contribution-ok associates from
`withCache`-wrapped queries tagged `'associates'` and `'dashboard'` (TTL 120–300s).
When an associate is created, updated, activated, or deactivated via the associate
server actions, none of those mutations call `revalidateTag` — only `revalidatePath`
is called. This means the dashboard KPI cards can show stale counts for up to 5
minutes after any associate change. Operators see misleading numbers immediately
after any CRUD operation.

The fix pattern is already established: `src/app/app/config/lotacoes/actions.ts`
(Plan 010) calls `revalidateTag('associates', 'max')` and `revalidateTag('dashboard', 'max')`
after every mutation.

## Current state

`src/app/app/associados/actions.ts` — single `updateAssociate` action; invalidates
paths but never cache tags:

```ts
// src/app/app/associados/actions.ts:3, 64-65
import { revalidatePath } from 'next/cache';
// ...
revalidatePath('/app/associados');
revalidatePath(`/app/associados/${data.id}`);
```

`src/app/app/associados/[id]/actions.ts` — six actions (addDependentAction,
editDependentAction, removeDependentAction, addHealthAgreementAction,
editHealthAgreementAction, removeHealthAgreementAction); each calls `revalidatePath`
but never `revalidateTag`:

```ts
// src/app/app/associados/[id]/actions.ts:3-4
import { revalidatePath } from 'next/cache';
// (no revalidateTag import)
```

The nine dashboard queries in `src/lib/dashboard/queries.ts` that are stale after
associate mutations use these cache tags:
- `countActiveAssociates` → tags: `['associates', 'dashboard']`
- `countContributionsOkAssociates` → tags: `['associates', 'dashboard']`
- `countInadimplentesAssociates` → tags: `['associates', 'dashboard']`
- `countActiveAssociatesByLocation` → tags: `['associates', 'dashboard']`
- `getTopRegions` → tags: `['associates', 'dashboard']`

Correct call pattern (from `src/app/app/config/lotacoes/actions.ts:32-33` after Plan 010):

```ts
revalidateTag('associates', 'max');
revalidateTag('dashboard', 'max');
```

## Commands you will need

| Purpose       | Command                            | Expected on success |
|---------------|------------------------------------|---------------------|
| Typecheck     | `npm run typecheck`                | exit 0              |
| Test (scoped) | `npm run test -- src/app/app/associados/` | all pass     |
| Lint          | `npm run lint`                     | exit 0              |

## Scope

**In scope**:
- `src/app/app/associados/actions.ts`
- `src/app/app/associados/[id]/actions.ts`
- `src/app/app/associados/actions.test.ts` (add assertions)

**Out of scope** (do NOT touch):
- `src/lib/dashboard/queries.ts` — no change needed there
- Any other associate sub-page action file

## Git workflow

- Branch: `advisor/011-associate-cache-invalidation`
- Single commit; message: `fix(associados): invalidate 'associates' and 'dashboard' cache tags on mutations`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Update `src/app/app/associados/actions.ts`

1. Add `revalidateTag` to the import at line 3:
   ```ts
   import { revalidatePath, revalidateTag } from 'next/cache';
   ```

2. After the two existing `revalidatePath` calls (lines 64–65), add:
   ```ts
   revalidateTag('associates', 'max');
   revalidateTag('dashboard', 'max');
   ```

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Update `src/app/app/associados/[id]/actions.ts`

1. Change line 3 import:
   ```ts
   import { revalidatePath, revalidateTag } from 'next/cache';
   ```

2. In each of the 6 action functions, add the two `revalidateTag` calls immediately
   after the existing `revalidatePath` block. The 6 functions are:
   `addDependentAction`, `editDependentAction`, `removeDependentAction`,
   `addHealthAgreementAction`, `editHealthAgreementAction`, `removeHealthAgreementAction`.

   Pattern to add at the end of each function's revalidation block:
   ```ts
   revalidateTag('associates', 'max');
   revalidateTag('dashboard', 'max');
   ```

   Note: `addDependentAction` and `addHealthAgreementAction` currently only call
   `revalidatePath` for two paths (not three like the edit/remove actions). Add the
   two `revalidateTag` calls after those as well.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Add assertions to `src/app/app/associados/actions.test.ts`

The existing test file (`src/app/app/associados/actions.test.ts`) mocks `revalidatePath`
but likely does not mock or assert `revalidateTag`. Following the pattern from
`src/app/app/config/lotacoes/actions.test.ts`:

1. In the `vi.hoisted()` block, add `revalidateTagMock: vi.fn()`.
2. In the `vi.mock('next/cache', ...)` block, add `revalidateTag: (...args) => revalidateTagMock(...args)`.
3. In the `beforeEach`, add `revalidateTagMock.mockReset()` (or rely on `vi.clearAllMocks()`).
4. In the success test(s), add:
   ```ts
   expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
   expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
   ```

**Verify**: `npm run test -- src/app/app/associados/actions.test.ts` → all pass.

## Test plan

- Modify `src/app/app/associados/actions.test.ts` as described in Step 3.
- No new test files needed.
- Pattern reference: `src/app/app/config/lotacoes/actions.test.ts` (especially the
  `revalidateTagMock` wiring in `vi.hoisted()`).

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test -- src/app/app/associados/` passes with new assertions
- [ ] `npm run lint` exits 0
- [ ] Both `src/app/app/associados/actions.ts` and `src/app/app/associados/[id]/actions.ts` import and call `revalidateTag`
- [ ] `grep -n "revalidateTag" src/app/app/associados/actions.ts src/app/app/associados/\[id\]/actions.ts` shows calls in both files
- [ ] `plans/README.md` status row updated

## STOP conditions

- After Step 1, typecheck reports new errors unrelated to this change.
- `src/app/app/associados/actions.test.ts` doesn't exist or has a very different structure than described (check the mock pattern before making changes).
- Any existing associate test fails after this change.

## Maintenance notes

- Plan 014 (revalidateAssociatePaths helper) refactors the repeated `revalidatePath`
  blocks in `[id]/actions.ts`. After that plan lands, the `revalidateTag` calls added
  here can be folded into the helper. Execute Plan 014 after this one to avoid conflict.
- The dashboard TTL for `'associates'`-tagged caches is 300s (5 min). After this
  plan, any associate mutation immediately invalidates those entries.
