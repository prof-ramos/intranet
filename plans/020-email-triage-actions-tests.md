# Plan 020: Add unit tests for email-triage server actions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 93ab643..HEAD -- src/app/app/email-triage/actions.ts`
> If the source file changed, re-read it before writing tests.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

`src/app/app/email-triage/actions.ts` exports three server actions that mutate
triage records (`updateTriageStatusFromForm`, `addTriageObservacaoFromForm`,
`updateTriageDeadlineFromForm`). Despite the email-triage module having extensive
library-level tests, the server-action layer — which enforces the `'admin'`-only
auth gate, parses Zod schemas, and calls repository mutations — has zero test
coverage. A regression in role enforcement is invisible without tests.

## Current state

`src/app/app/email-triage/actions.ts`:

```ts
export const updateTriageStatusFromForm = defineFormAction({
  auth: ['admin'],
  schema: updateTriageStatusSchema,
  service: async (data, user) => {
    await updateTriageStatus(data.id, data.status, user.userId, data.observacoes);
  },
  revalidate: { path: ['/app/email-triage'] },
  rateLimit: { key: 'triage_action', windowMs: 60_000, maxRequests: 30 },
});

export const addTriageObservacaoFromForm = defineFormAction({
  auth: ['admin'],
  schema: addTriageObservacaoSchema,
  service: async (data, user) => {
    await addTriageObservacao(data.id, data.observacoes, user.userId);
  },
  revalidate: { path: ['/app/email-triage'] },
  rateLimit: { key: 'triage_action', windowMs: 60_000, maxRequests: 30 },
});

export const updateTriageDeadlineFromForm = defineFormAction({
  auth: ['admin'],
  schema: updateTriageDeadlineSchema,
  service: async (data) => {
    await updateTriageDeadline(data.id, data.prazoData, data.prazoHora);
  },
  revalidate: { path: ['/app/email-triage'] },
  rateLimit: { key: 'triage_action', windowMs: 60_000, maxRequests: 30 },
});
```

All three use `defineFormAction` from `@/lib/server-actions/define-form-action`.
The auth gate `auth: ['admin']` means only `requireRole('admin')` passes — not
`'diretoria'` or `'secretaria'`.

The schemas are in `src/lib/validation/schemas.ts`:
- `updateTriageStatusSchema`: has `id`, `status`, and optional `observacoes`
- `addTriageObservacaoSchema`: has `id`, `observacoes`
- `updateTriageDeadlineSchema`: has `id`, optional `prazoData`, optional `prazoHora`

Read these schemas from the live file before writing assertions.

## Structural pattern to follow

`src/app/app/juridico/actions.test.ts` — uses `defineFormAction` actions with
`auth: ['admin']`. This is the closest pattern to follow. Alternatively, use
`src/app/app/config/lotacoes/actions.test.ts` which is also well-structured.

Key difference: `defineFormAction` (used here) wraps server actions differently
from `defineFormStateAction` (used in lotacoes). Check
`src/lib/server-actions/define-form-action.ts` to understand the call signature
the test should use to invoke these actions.

## Commands you will need

| Purpose       | Command                                                                 | Expected on success |
|---------------|-------------------------------------------------------------------------|---------------------|
| Typecheck     | `npm run typecheck`                                                     | exit 0              |
| Test (scoped) | `npm run test -- src/app/app/email-triage/actions.test.ts`              | all pass            |
| Lint          | `npm run lint`                                                          | exit 0              |

## Scope

**In scope** (create only):
- `src/app/app/email-triage/actions.test.ts`

**Out of scope** (do NOT touch):
- `src/app/app/email-triage/actions.ts`
- Any library-level email-triage tests

## Git workflow

- Branch: `advisor/020-email-triage-actions-tests`
- Single commit; message: `test(email-triage): add unit tests for server action layer — auth gate, schema validation, repository calls`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Read the supporting files before writing

Read these files to get exact field names and call signatures:
- `src/lib/server-actions/define-form-action.ts` — understand how the returned
  action is called in tests (check existing test files for this pattern)
- `src/lib/validation/schemas.ts` — find `updateTriageStatusSchema`,
  `addTriageObservacaoSchema`, `updateTriageDeadlineSchema`
- `src/app/app/juridico/actions.test.ts` — use as the structural template

### Step 2: Create the test file scaffold

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  updateTriageStatusFromForm,
  addTriageObservacaoFromForm,
  updateTriageDeadlineFromForm,
} from './actions';

const {
  requireRoleMock,
  revalidatePathMock,
  updateTriageStatusMock,
  addTriageObservacaoMock,
  updateTriageDeadlineMock,
  rateLimitMock,
} = vi.hoisted(() => ({
  requireRoleMock:         vi.fn(),
  revalidatePathMock:      vi.fn(),
  updateTriageStatusMock:  vi.fn(),
  addTriageObservacaoMock: vi.fn(),
  updateTriageDeadlineMock:vi.fn(),
  rateLimitMock:           vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag:  vi.fn(),
}));

vi.mock('@/lib/email-triage/repository', () => ({
  updateTriageStatus:   (...args: unknown[]) => updateTriageStatusMock(...args),
  addTriageObservacao:  (...args: unknown[]) => addTriageObservacaoMock(...args),
  updateTriageDeadline: (...args: unknown[]) => updateTriageDeadlineMock(...args),
}));

// Mock rate-limit so it doesn't hit DB in unit tests
vi.mock('@/lib/integrations/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));
```

**Verify**: `npm run typecheck` → exit 0 (imports resolve).

### Step 3: Add tests

```ts
describe('email-triage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 3, role: 'admin' });
  });

  describe('updateTriageStatusFromForm', () => {
    it('rejects non-admin roles', async () => {
      requireRoleMock.mockRejectedValue(new Error('Permissão insuficiente.'));
      const fd = makeFormData({ id: '1', status: 'respondido' });
      await expect(updateTriageStatusFromForm(fd)).rejects.toThrow();
    });

    it('calls updateTriageStatus with correct args and revalidates', async () => {
      const fd = makeFormData({ id: '7', status: 'respondido', observacoes: 'ok' });
      await updateTriageStatusFromForm(fd);
      expect(updateTriageStatusMock).toHaveBeenCalledWith(
        7, 'respondido', 3, 'ok',
      );
      expect(revalidatePathMock).toHaveBeenCalledWith('/app/email-triage');
    });
  });

  describe('addTriageObservacaoFromForm', () => {
    it('calls addTriageObservacao with correct args and revalidates', async () => {
      const fd = makeFormData({ id: '5', observacoes: 'Nota importante' });
      await addTriageObservacaoFromForm(fd);
      expect(addTriageObservacaoMock).toHaveBeenCalledWith(5, 'Nota importante', 3);
      expect(revalidatePathMock).toHaveBeenCalledWith('/app/email-triage');
    });
  });

  describe('updateTriageDeadlineFromForm', () => {
    it('calls updateTriageDeadline with correct args and revalidates', async () => {
      const fd = makeFormData({ id: '2', prazoData: '2026-07-01', prazoHora: '09:00' });
      await updateTriageDeadlineFromForm(fd);
      expect(updateTriageDeadlineMock).toHaveBeenCalledWith(2, '2026-07-01', '09:00');
      expect(revalidatePathMock).toHaveBeenCalledWith('/app/email-triage');
    });
  });
});

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
```

Adjust the exact argument order for each mock assertion to match the live
repository function signatures (read `src/lib/email-triage/repository.ts`
for the correct parameter order of `updateTriageStatus`, `addTriageObservacao`,
and `updateTriageDeadline`).

**Verify**: `npm run test -- src/app/app/email-triage/actions.test.ts` → all pass.

## Test plan

Minimum tests (7):
1. `updateTriageStatusFromForm`: non-admin rejection, happy path with revalidation
2. `addTriageObservacaoFromForm`: happy path with revalidation
3. `updateTriageDeadlineFromForm`: happy path with revalidation
4. One Zod validation failure test (e.g. invalid `id` type or missing required field)

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test -- src/app/app/email-triage/actions.test.ts` passes with ≥7 tests
- [ ] `npm run lint` exits 0
- [ ] Each action has at least one test asserting `revalidatePathMock.toHaveBeenCalledWith('/app/email-triage')`
- [ ] Auth-rejection test exists (admin-only gate verified)
- [ ] Only `src/app/app/email-triage/actions.test.ts` is created
- [ ] `plans/README.md` status row updated

## STOP conditions

- `defineFormAction` in `src/lib/server-actions/define-form-action.ts` has a very
  different calling convention from what the test above assumes — read that file
  first and adapt the test structure accordingly (do not guess).
- The rate-limit mock path (`@/lib/integrations/rate-limit`) doesn't match — check
  what `defineFormAction` actually imports for rate limiting and mock that path.
- Repository function signatures differ from the test assertions — read the live
  repository file and adjust before writing assertions.

## Maintenance notes

- If a fourth triage action is added, add a corresponding describe block following
  the same pattern.
- The `auth: ['admin']` gate is load-bearing for LGPD compliance — always verify
  it is tested after any change to these actions.
