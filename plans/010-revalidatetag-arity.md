# Plan 010: Fix revalidateTag arity — restore CI typecheck and cache invalidation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 93ab643..HEAD -- src/app/app/config/lotacoes/actions.ts`
> If the file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx / bug
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

`npx tsc --noEmit` exits non-zero with two errors in `src/app/app/config/lotacoes/actions.ts`
because `revalidateTag` is called with 1 argument but the Next.js 16.2.6 type signature
requires 2 arguments. This breaks the CI "Lint/Typecheck/Test" job. Additionally, if
Next.js honours the type change at runtime (some builds tree-shake differently), the
`'associates'` and `'dashboard'` cache tags may silently not be invalidated after
lotação mutations, causing stale dashboard KPI cards in production.

## Current state

- `src/app/app/config/lotacoes/actions.ts` — server actions for lotação CRUD; contains
  the broken `revalidateAssignments()` helper at lines 31–35:

```ts
// src/app/app/config/lotacoes/actions.ts:31-35
function revalidateAssignments() {
  revalidateTag('associates');   // ← TS2554: Expected 2 arguments, but got 1
  revalidateTag('dashboard');    // ← TS2554: Expected 2 arguments, but got 1
  revalidatePath('/app/config/lotacoes');
}
```

The correct 2-argument pattern used throughout this codebase:

```ts
// src/app/app/financeiro/mensalidades/actions.ts:49
revalidateTag(`finance-monthly-${payment.year}-${payment.month}`, 'max');

// src/app/app/notifications/actions.ts:18
revalidateTag('notifications', 'max');

// src/lib/server-actions/define-form-action.ts:70
revalidateTag(t, 'max');
```

The second argument `'max'` means "revalidate as aggressively as possible" (Next.js
interprets it as the `type` option). All existing callers in this codebase use `'max'`.

## Commands you will need

| Purpose       | Command                        | Expected on success        |
|---------------|--------------------------------|----------------------------|
| Typecheck     | `npm run typecheck`            | exit 0, 0 errors           |
| Test (scoped) | `npm run test -- src/app/app/config/lotacoes/` | all pass   |
| Lint          | `npm run lint`                 | exit 0                     |

## Scope

**In scope** (the only file to modify):
- `src/app/app/config/lotacoes/actions.ts`

**Out of scope** (do NOT touch):
- Any test file — the mock already stubs `revalidateTag` correctly.
- Any other action file — they already use the correct arity.

## Git workflow

- Branch: `advisor/010-revalidatetag-arity`
- Single commit; message style: `fix(lotacoes): pass second arg to revalidateTag — fix TS2554 and restore cache invalidation`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Apply the two-character fix

Edit `src/app/app/config/lotacoes/actions.ts`, function `revalidateAssignments` (lines 31–35).
Change:

```ts
function revalidateAssignments() {
  revalidateTag('associates');
  revalidateTag('dashboard');
  revalidatePath('/app/config/lotacoes');
}
```

To:

```ts
function revalidateAssignments() {
  revalidateTag('associates', 'max');
  revalidateTag('dashboard', 'max');
  revalidatePath('/app/config/lotacoes');
}
```

**Verify**: `npm run typecheck` → exit 0, zero errors.

### Step 2: Run the scoped test suite

**Verify**: `npm run test -- src/app/app/config/lotacoes/` → all tests pass (the mock
already stubs `revalidateTag` and asserts `toHaveBeenCalledWith('associates')` and
`toHaveBeenCalledWith('dashboard')` — the mock ignores extra args, so no test changes
are needed).

## Test plan

No new tests needed — existing tests in `src/app/app/config/lotacoes/actions.test.ts`
already assert `revalidateTagMock.toHaveBeenCalledWith('associates')` and
`toHaveBeenCalledWith('dashboard')`; the mock accepts any arguments so the passing arity
does not break them.

## Done criteria

- [ ] `npm run typecheck` exits 0 with zero errors
- [ ] `npm run test -- src/app/app/config/lotacoes/` passes
- [ ] `npm run lint` exits 0
- [ ] Only `src/app/app/config/lotacoes/actions.ts` is modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The file content at lines 31–35 does not match the excerpt above (codebase drifted).
- After the fix, typecheck still reports errors in this file.
- Any test fails that was passing before this change.

## Maintenance notes

- If a future mutation adds a new `revalidateTag` call to this file, use the same
  `'max'` second argument to match the codebase convention.
- The root cause was that `93ab643` introduced `revalidateAssignments()` without
  checking the existing arity convention; a pre-commit typecheck hook (Plan 015) will
  catch this class of regression automatically going forward.
