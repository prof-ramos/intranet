# Plan 017: Migrate z.preprocess to Zod v4 idiomatic transforms in env.ts and schemas.ts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 93ab643..HEAD -- src/lib/env.ts src/lib/validation/schemas.ts`
> If either file changed since this plan was written, re-read them before
> proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: deps
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

`z.preprocess` is soft-deprecated in Zod v4: the function still ships but its type
inference is less precise than in v3, and the Zod v4 docs recommend `.transform()`
or `.pipe()` instead. The project uses `z.preprocess` in 7 places in `src/lib/env.ts`
and once in `src/lib/validation/schemas.ts`. Because `src/lib/env.ts` is the startup
validation boundary for all environment variables, a silent type-narrowing regression
in a future Zod minor bump could cause the app to boot with misconfigured env vars
without a typecheck error.

The migration is mechanical: `z.preprocess(f, schema)` → `schema.transform(...)` or
`z.string().optional().transform(v => v === '' ? undefined : v)` depending on the
use case.

Risk is MED because `env.ts` failures are startup-fatal. Every step below must verify
the test suite before continuing.

## Current state

`src/lib/env.ts` lines 1–11:

```ts
import { z } from 'zod';

const emptyStringToUndefined = (value: unknown) => (value === '' ? undefined : value);
const optionalString         = z.preprocess(emptyStringToUndefined, z.string().optional());
const optionalNonEmptyString = z.preprocess(emptyStringToUndefined, z.string().min(1).optional());
const optionalSecretString   = z.preprocess(emptyStringToUndefined, z.string().min(32).optional());
const optionalUrl            = z.preprocess(emptyStringToUndefined, z.string().url().optional());
const optionalBooleanString  = z.preprocess(
  emptyStringToUndefined,
  z.enum(['true', 'false']).optional(),
);
// line 70:
TRUSTED_PROXY_COUNT: z.preprocess(coerceToNumber, z.number().int().positive().optional()),
```

`src/lib/validation/schemas.ts` line 359:
```ts
associateId: z.preprocess(
  (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
  z.number().int().positive(),
),
```

## Commands you will need

| Purpose       | Command                            | Expected on success          |
|---------------|------------------------------------|------------------------------|
| Typecheck     | `npm run typecheck`                | exit 0                       |
| Test (env)    | `npm run test -- src/lib/env.test.ts` | all pass                  |
| Test (schemas)| `npm run test -- src/lib/validation/schemas.test.ts` | all pass    |
| Lint          | `npm run lint`                     | exit 0                       |

## Scope

**In scope**:
- `src/lib/env.ts`
- `src/lib/validation/schemas.ts`

**Out of scope** (do NOT touch):
- Any file that imports from `src/lib/env.ts` or `src/lib/validation/schemas.ts` —
  the runtime behaviour and exported types must remain identical

## Git workflow

- Branch: `advisor/017-zod-preprocess-migration`
- Single commit; message: `refactor(deps): replace z.preprocess with Zod v4 idiomatic transforms`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Migrate `src/lib/env.ts` — empty-string helpers

Replace the five `z.preprocess(emptyStringToUndefined, ...)` constants (lines 4–11)
with Zod v4 idiomatic equivalents:

```ts
// Zod v4 idiomatic: chain .optional() then .transform()
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalNonEmptyString = z
  .string()
  .min(1)
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalSecretString = z
  .string()
  .min(32)
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalUrl = z
  .string()
  .url()
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalBooleanString = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === '' ? undefined : v));
```

Remove the `emptyStringToUndefined` function if it is no longer used elsewhere in
the file after this change.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Migrate `TRUSTED_PROXY_COUNT` in `src/lib/env.ts`

Find the `TRUSTED_PROXY_COUNT` entry (~line 70) and replace:

```ts
TRUSTED_PROXY_COUNT: z.preprocess(coerceToNumber, z.number().int().positive().optional()),
```

With:

```ts
TRUSTED_PROXY_COUNT: z.string().optional().transform((v) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}).pipe(z.number().int().positive().optional()),
```

Or, if `z.coerce.number()` already handles the coercion correctly:

```ts
TRUSTED_PROXY_COUNT: z.coerce.number().int().positive().optional(),
```

Check whether `z.coerce.number()` is already used for other numeric env vars in the
file (e.g. `DB_CONNECT_TIMEOUT_SECONDS: z.coerce.number()...`) — if so, use the
`z.coerce` form for consistency.

**Verify**: `npm run typecheck` → exit 0. `npm run test -- src/lib/env.test.ts` → all pass.

### Step 3: Migrate `src/lib/validation/schemas.ts` — associateId

Find the `associateId` field (~line 359) and replace:

```ts
associateId: z.preprocess(
  (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
  z.number().int().positive(),
),
```

With:

```ts
associateId: z.coerce.number().int().positive(),
```

`z.coerce.number()` calls `Number(value)` which handles the string-to-number case
and rejects non-numeric strings (NaN → fails `.int().positive()`).

**Verify**: `npm run typecheck` → exit 0. `npm run test -- src/lib/validation/schemas.test.ts` → all pass.

### Step 4: Run full env test

**Verify**: `npm run test -- src/lib/env.test.ts` → all pass.

## Test plan

No new tests needed — existing tests in `src/lib/env.test.ts` and
`src/lib/validation/schemas.test.ts` already exercise these schema definitions.
The migration is behaviour-preserving: empty strings still become `undefined`,
integers still coerce from strings.

If any existing test explicitly tests a `z.preprocess` error path and the new
formulation changes the error message, update only that assertion.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test -- src/lib/env.test.ts` passes
- [ ] `npm run test -- src/lib/validation/schemas.test.ts` passes
- [ ] `npm run lint` exits 0
- [ ] `grep "z\.preprocess" src/lib/env.ts src/lib/validation/schemas.ts` returns no matches
- [ ] Only `src/lib/env.ts` and `src/lib/validation/schemas.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- Any env test fails after Step 1 — `z.string().optional().transform(...)` may not
  accept raw `undefined` the same way `z.preprocess` did (Zod v4 handles
  `undefined` differently before `.optional()`); if so, use
  `z.string().transform(v => v === '' ? undefined : v).optional()` (transform first,
  then optional) and re-run tests.
- `z.coerce.number()` in Step 2 or 3 changes the error message for invalid input in
  a way that breaks existing tests — update the assertion, not the logic.
- The `emptyStringToUndefined` helper is used outside `env.ts` — do not remove it
  until all usages are migrated.

## Maintenance notes

- After this migration, `env.ts` is Zod v4 idiomatic throughout. Future env vars
  should follow the same `.optional().transform(...)` pattern, not `z.preprocess`.
- `z.coerce.number()` for numeric env vars is already used in the file for several
  fields (e.g. `DB_CONNECT_TIMEOUT_SECONDS`). Use it as the standard for all numeric
  env vars.
