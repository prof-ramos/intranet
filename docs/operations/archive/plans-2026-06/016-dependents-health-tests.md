# Plan 016: Add unit tests for associate dependent and health-agreement actions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 93ab643..HEAD -- src/app/app/associados/\[id\]/actions.ts`
> If the source file changed, re-read it before writing tests; the test must
> reflect the live function signatures, not the excerpts here.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/011-associate-cache-invalidation.md, plans/014-associate-revalidate-helper.md
- **Category**: tests
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

`src/app/app/associados/[id]/actions.ts` exports six server actions that create,
update, and delete dependents and health agreements for associates. These mutations
touch PII-adjacent data (dependent names, relationships, health provider) and trigger
Next.js cache invalidation. There are currently zero unit tests for this file. A
regression in input validation, ownership guard, or revalidation logic would be
invisible to the test suite. This is a high-risk gap given the LGPD sensitivity of
the data.

## Current state

`src/app/app/associados/[id]/actions.ts` — six exported async functions, no test file:

```ts
// src/app/app/associados/[id]/actions.ts — structure after Plans 011 & 014 land

export async function addDependentAction(formData: FormData)
export async function editDependentAction(formData: FormData)
export async function removeDependentAction(formData: FormData)
export async function addHealthAgreementAction(formData: FormData)
export async function editHealthAgreementAction(formData: FormData)
export async function removeHealthAgreementAction(formData: FormData)
```

Each function:
1. Calls `requireAuth()` from `@/lib/auth/require-auth`
2. Calls `checkRole(user.role)` — only `['admin', 'diretoria', 'secretaria']` pass
3. Parses `formData` via a Zod schema from `@/lib/validation/schemas`
4. Calls a repository function from `@/lib/associates/repository`
5. Calls `revalidateAssociatePaths(associateId)` (after Plan 014)

The Zod schemas used:
- `createDependentSchema` — fields: `associateId`, `name`, `relationship`
- `updateDependentSchema` — fields: `id`, `associateId`, `name?`, `relationship?`
- `deleteDependentSchema` — fields: `id`, `associateId`
- `createHealthAgreementSchema` — fields: `associateId`, `provider`, `startDate?`, `endDate?`
- `updateHealthAgreementSchema` — fields: `id`, `associateId`, `provider?`, `startDate?`, `endDate?`
- `deleteHealthAgreementSchema` — fields: `id`, `associateId`

## Structural pattern to follow

`src/app/app/config/lotacoes/actions.test.ts` is the closest structural match:
- Uses `vi.hoisted()` for all mock variables
- Mocks `@/lib/auth/authorization` (for `requireRole`) — here mock `@/lib/auth/require-auth` (for `requireAuth`)
- Mocks `next/cache` with `revalidatePath` and `revalidateTag`
- Uses a mock database object with a chainable query API

For this file, the mocks are simpler because the actions call repository functions
directly, not a service layer with transactions. Mock `@/lib/associates/repository`
with `vi.fn()` for each of the 6 repository functions.

## Commands you will need

| Purpose       | Command                                                                  | Expected on success |
|---------------|--------------------------------------------------------------------------|---------------------|
| Typecheck     | `npm run typecheck`                                                      | exit 0              |
| Test (scoped) | `npm run test -- src/app/app/associados/\[id\]/actions.test.ts`          | all pass            |
| Lint          | `npm run lint`                                                           | exit 0              |

## Scope

**In scope** (the only new file to create):
- `src/app/app/associados/[id]/actions.test.ts`

**Out of scope** (do NOT touch):
- `src/app/app/associados/[id]/actions.ts` — must not be modified to make tests pass
- Any other file

## Git workflow

- Branch: `advisor/016-dependents-health-tests`
- Single commit; message: `test(associados): add unit tests for dependent and health-agreement server actions`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Create the test file scaffold

Create `src/app/app/associados/[id]/actions.test.ts` with this structure:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDependentAction,
  editDependentAction,
  removeDependentAction,
  addHealthAgreementAction,
  editHealthAgreementAction,
  removeHealthAgreementAction,
} from './actions';

const {
  requireAuthMock,
  revalidatePathMock,
  revalidateTagMock,
  createDependentMock,
  updateDependentByIdMock,
  deleteDependentByIdMock,
  createHealthAgreementMock,
  updateHealthAgreementByIdMock,
  deleteHealthAgreementByIdMock,
} = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
  createDependentMock: vi.fn(),
  updateDependentByIdMock: vi.fn(),
  deleteDependentByIdMock: vi.fn(),
  createHealthAgreementMock: vi.fn(),
  updateHealthAgreementByIdMock: vi.fn(),
  deleteHealthAgreementByIdMock: vi.fn(),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: () => requireAuthMock(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag:  (...args: unknown[]) => revalidateTagMock(...args),
}));

vi.mock('@/lib/associates/repository', () => ({
  createDependent:             (...args: unknown[]) => createDependentMock(...args),
  updateDependentById:         (...args: unknown[]) => updateDependentByIdMock(...args),
  deleteDependentById:         (...args: unknown[]) => deleteDependentByIdMock(...args),
  createHealthAgreement:       (...args: unknown[]) => createHealthAgreementMock(...args),
  updateHealthAgreementById:   (...args: unknown[]) => updateHealthAgreementByIdMock(...args),
  deleteHealthAgreementById:   (...args: unknown[]) => deleteHealthAgreementByIdMock(...args),
}));
```

**Verify**: `npm run typecheck` → exit 0 (imports resolve).

### Step 2: Add beforeEach and auth-rejection tests

```ts
describe('associate [id] actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: 5, role: 'admin' });
  });

  it('throws when caller lacks required role', async () => {
    requireAuthMock.mockResolvedValue({ userId: 9, role: 'secretaria_invalida' });
    const fd = new FormData();
    fd.set('associateId', '1');
    fd.set('name', 'Filho');
    fd.set('relationship', 'filho');
    await expect(addDependentAction(fd)).rejects.toThrow('Permissão insuficiente.');
  });
```

### Step 3: Add success + revalidation tests for each action

For each of the six actions, add at minimum:
1. A happy-path test that confirms the repository mock was called with correct data
   AND that `revalidatePathMock` and `revalidateTagMock` were called.
2. A validation-error test that confirms Zod rejects bad input (e.g. missing required
   field, wrong type).

Example for `addDependentAction`:

```ts
  it('creates a dependent and revalidates', async () => {
    const fd = new FormData();
    fd.set('associateId', '42');
    fd.set('name', 'Maria Silva');
    fd.set('relationship', 'conjuge');

    await addDependentAction(fd);

    expect(createDependentMock).toHaveBeenCalledWith({
      associateId: 42,
      name: 'Maria Silva',
      relationship: 'conjuge',
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados/42');
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('throws on Zod parse failure for addDependentAction', async () => {
    const fd = new FormData();
    // missing name and relationship
    fd.set('associateId', '42');
    await expect(addDependentAction(fd)).rejects.toThrow();
  });
```

Apply the same pattern to the remaining five actions, adjusting field names to match
their respective Zod schemas (check the live schemas in `src/lib/validation/schemas.ts`
before writing — the field names must match exactly).

For `editDependentAction` and `editHealthAgreementAction`, also test the early-return
path when no updatable fields are provided (the body has `if (Object.keys(values).length === 0) return;`).

**Verify**: `npm run test -- src/app/app/associados/\[id\]/actions.test.ts` → all pass.

## Test plan

Minimum tests per action (18 total):
- `addDependentAction`: happy path (revalidation), Zod validation failure
- `editDependentAction`: happy path (revalidation), early-return on empty update, Zod failure
- `removeDependentAction`: happy path (revalidation), Zod failure
- `addHealthAgreementAction`: happy path (revalidation), Zod failure
- `editHealthAgreementAction`: happy path (revalidation), early-return on empty update, Zod failure
- `removeHealthAgreementAction`: happy path (revalidation), Zod failure
- Plus: 1 shared auth-rejection test

Pattern reference: `src/app/app/config/lotacoes/actions.test.ts`

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test -- src/app/app/associados/\[id\]/actions.test.ts` passes with ≥15 tests
- [ ] `npm run lint` exits 0
- [ ] Each of the 6 actions has at least one test asserting `revalidateTagMock.toHaveBeenCalledWith('associates', 'max')`
- [ ] Only `src/app/app/associados/[id]/actions.test.ts` is created (no source file changes)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Plans 011 and 014 have not landed — the test assertions for `revalidateTag` will
  fail if those calls don't exist yet in the source; wait for those plans first.
- The Zod schemas in `src/lib/validation/schemas.ts` have different field names or
  types than expected — read the live schema before writing parse assertions.
- `vi.mock('@/lib/associates/repository', ...)` does not work because the repository
  uses a default export or non-named exports — inspect the live file first.

## Maintenance notes

- When a new server action is added to this file (e.g. for a new associate sub-entity),
  add a corresponding test block following the same pattern.
- The `checkRole` function (defined inline in the source) is the gate; tests confirm
  it throws. If `checkRole` is ever extracted to a shared helper, update the mock.
