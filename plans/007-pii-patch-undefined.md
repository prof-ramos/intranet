# Plan 007: Prevent PII patch from setting columns to undefined

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7178dd5..HEAD -- src/lib/associates/pii-mapping.ts src/lib/associates/repository.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MEDIUM
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `7178dd5`, 2026-06-10
- **Issue**: https://github.com/prof-ramos/intranet/issues/160

## Why this matters

`buildPiiPatch()` sets PII columns to `undefined` when a field is not present in the input (lines 102-106 of `pii-mapping.ts`). The `Record<string, string | null | undefined>` patch is then cast to `UpdateAssociateValues` via `as`. Depending on how the repository applies the patch, Drizzle/Kysely may interpret `undefined` as `SET col = NULL` rather than ignoring the column. This would silently overwrite encrypted PII values (CPF, SIAPE, email, phone, address) with nulls.

The repository layer likely destructures the patch and only spreads defined keys, but the type-unsafe `as` cast makes this invisible to the type system. This plan adds a runtime filter to strip `undefined` values before returning the patch, making the behavior correct regardless of the caller.

## Current state

- `src/lib/associates/pii-mapping.ts` — Lines 96-123, `buildPiiPatch`:

```typescript
  const patch: Record<string, string | null | undefined> = {};

  for (const field of PII_FIELDS) {
    const value = input[field.name];

    if (value === undefined) {
      // Field not present in input — set columns to undefined so the repository layer ignores them
      patch[field.plaintextCol] = undefined;   // ← line 103
      patch[field.ciphertextCol] = undefined;  // ← line 104
      patch[field.hashCol] = undefined;        // ← line 105
      continue;
    }
    // ...
  }

  return patch as ReturnType<typeof buildPiiPatch>;  // ← line 123: unsound cast
```

- `src/lib/associates/repository.ts` — consumes `UpdateAssociateValues` type; the patch is spread into the Drizzle update call. Whether Drizzle/Kysely filters out `undefined` depends on internal implementation.

- Repo conventions: No other patching function in the codebase relies on `undefined` to signal "skip this column". The pattern is fragile.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Lint      | `npm run lint`           | exit 0              |
| Tests     | `npm run test`           | all pass            |

## Scope

**In scope**:
- `src/lib/associates/pii-mapping.ts`

**Out of scope**:
- `src/lib/associates/repository.ts` — only if type changes require signature update.
- Other callers of `buildPiiPatch`.

## Git workflow

- Branch: `advisor/007-pii-patch-undefined`
- Message style: `fix(associates): filter undefined keys from buildPiiPatch to prevent null PII columns`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Strip undefined values before returning

Replace the final `return patch as ...` in `buildPiiPatch` with a filtered result that excludes `undefined` values:

```typescript
  return Object.fromEntries(
    Object.entries(patch).filter(([_, v]) => v !== undefined),
  ) as ReturnType<typeof buildPiiPatch>;
```

This removes all keys with `undefined` values from the patch object, so the caller never sees `undefined` for any column. The return type remains compatible because `UpdateAssociateValues` already uses optional properties for these fields.

**Verify**: `npm run typecheck` → exit 0

### Step 2: Update the comment

Remove or rephrase the misleading comment on lines 101-106:

Change:
```
// Field not present in input — set columns to undefined so the repository layer ignores them
patch[field.plaintextCol] = undefined;
patch[field.ciphertextCol] = undefined;
patch[field.hashCol] = undefined;
```

To:
```
// Field not present in input — skip columns entirely (filtered below)
// No-op: the filter at the end removes undefined values from the patch.
```

(Or simply delete the three `patch[...] = undefined;` lines — they're no-ops since `patch[key] = undefined` is equivalent to not setting the key when filtered out later.)

**Verify**: `npm run typecheck` → exit 0

### Step 3: Verify existing tests pass

**Verify**: `npm run test` → all pass

## Test plan

- Run all unit tests: `npm run test`
- The type cast change should not break any compilation.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0
- [ ] No `undefined` values leak from `buildPiiPatch` — `Object.fromEntries` filter in place
- [ ] The misleading comment is removed or corrected
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
- `buildPiiPatch` return type changes upstream (e.g. `UpdateAssociateValues` was refactored)
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- The `as` cast at line 123 is still technically unsound (cast from `Record<string, ...>` to a named type). The `Object.fromEntries` approach is a runtime fix only. A proper type-safe refactor would use a Map or `Partial<UpdateAssociateValues>` with explicit key construction.
