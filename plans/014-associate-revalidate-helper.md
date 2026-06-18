# Plan 014: Extract revalidateAssociatePaths helper in [id]/actions.ts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 93ab643..HEAD -- src/app/app/associados/\[id\]/actions.ts`
> If the file changed since this plan was written, compare the "Current state"
> excerpts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/011-associate-cache-invalidation.md (adds revalidateTag calls that this plan will fold into the helper)
- **Category**: tech-debt
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

`src/app/app/associados/[id]/actions.ts` repeats the same revalidation block in six
consecutive action functions (addDependent, editDependent, removeDependent,
addHealthAgreement, editHealthAgreement, removeHealthAgreement). Each block calls
`revalidatePath` 2–3 times. This means adding a new associate sub-route (e.g.
`/historico`) requires editing six separate functions. Plan 011 adds `revalidateTag`
calls to all six — folding them into a named helper ensures any future additions
only need one change.

## Current state (after Plan 011 lands)

After Plan 011 executes, `src/app/app/associados/[id]/actions.ts` will have a
revalidation block in each of the six functions that looks like:

```ts
// repeated at ~lines 44-45, 64-66, 80-82, 100-101, 121-123, 137-139
revalidatePath('/app/associados');              // (only in edit/remove variants)
revalidatePath(`/app/associados/${associateId}`);
revalidatePath(`/app/associados/${associateId}/editar`);
revalidateTag('associates', 'max');
revalidateTag('dashboard', 'max');
```

Note: `addDependentAction` and `addHealthAgreementAction` currently call only 2
`revalidatePath` (not 3). After this plan, all 6 functions will call the same helper
which always calls all 3 paths for consistency.

## Commands you will need

| Purpose       | Command                                                          | Expected on success |
|---------------|------------------------------------------------------------------|---------------------|
| Typecheck     | `npm run typecheck`                                              | exit 0              |
| Test (scoped) | `npm run test -- src/app/app/associados/`                        | all pass            |
| Lint          | `npm run lint`                                                   | exit 0              |

## Scope

**In scope**:
- `src/app/app/associados/[id]/actions.ts`

**Out of scope** (do NOT touch):
- `src/app/app/associados/actions.ts` — separate file, separate pattern
- Any test files

## Git workflow

- Branch: `advisor/014-associate-revalidate-helper`
- Single commit; message: `refactor(associados): extract revalidateAssociatePaths helper to eliminate 6× revalidation boilerplate`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add the helper function

At the top of the file, directly after the imports, add:

```ts
function revalidateAssociatePaths(associateId: number) {
  revalidatePath('/app/associados');
  revalidatePath(`/app/associados/${associateId}`);
  revalidatePath(`/app/associados/${associateId}/editar`);
  revalidateTag('associates', 'max');
  revalidateTag('dashboard', 'max');
}
```

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Replace the 6 inline revalidation blocks

In each of the six action functions, replace the inline `revalidatePath` +
`revalidateTag` calls with a single call to `revalidateAssociatePaths(associateId)`
or `revalidateAssociatePaths(data.associateId)`, matching the variable name used
in each function.

Function-by-function:
- `addDependentAction`: replace with `revalidateAssociatePaths(data.associateId)`
- `editDependentAction`: replace with `revalidateAssociatePaths(associateId)`
- `removeDependentAction`: replace with `revalidateAssociatePaths(data.associateId)`
- `addHealthAgreementAction`: replace with `revalidateAssociatePaths(data.associateId)`
- `editHealthAgreementAction`: replace with `revalidateAssociatePaths(associateId)`
- `removeHealthAgreementAction`: replace with `revalidateAssociatePaths(data.associateId)`

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Verify tests

**Verify**: `npm run test -- src/app/app/associados/` → all pass.

## Test plan

No new tests needed — this is a pure refactor. The test suite for
`src/app/app/associados/[id]/actions.ts` does not currently exist (it is created by
Plan 016). After Plan 016 lands and tests are added, the helper will be exercised.
If a test file exists by the time this plan runs, ensure its assertions for
`revalidatePath` and `revalidateTag` continue to pass.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test -- src/app/app/associados/` passes
- [ ] `npm run lint` exits 0
- [ ] `grep -c "revalidatePath\|revalidateTag" src/app/app/associados/\[id\]/actions.ts` count is lower than before (confirms consolidation)
- [ ] `grep "revalidateAssociatePaths" src/app/app/associados/\[id\]/actions.ts` returns 6 call sites + 1 definition
- [ ] Only `src/app/app/associados/[id]/actions.ts` is modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- Plan 011 has not landed yet — the `revalidateTag` calls may not be present in the
  file; check before proceeding.
- The six functions use different `associateId` variable names than described —
  adapt to whatever the live code uses.
- Any test that was passing before this plan now fails.

## Maintenance notes

- When adding a new associate sub-route (e.g. `/app/associados/${id}/historico`),
  add only one `revalidatePath` call to `revalidateAssociatePaths` — no need to
  hunt through 6 functions.
- The pattern mirrors `revalidateAssignments()` in `src/app/app/config/lotacoes/actions.ts`
  (introduced in commit `93ab643`).
