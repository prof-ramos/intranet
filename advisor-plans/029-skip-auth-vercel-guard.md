# Plan 029: Guard SKIP_AUTH in production

> **Executor instructions**: Follow this plan step by step.
>
> **Drift check**: `git diff --stat 257b5cc..HEAD -- src/lib/auth/config.ts`

## Status

- **Priority**: P1 (security)
- **Effort**: S (15 min)
- **Risk**: LOW
- **Category**: security

## Why

`isSkipAuthEnabled()` only checks `NODE_ENV !== 'production'`. If `NODE_ENV`
is unset in a misconfigured production deployment, auth is bypassed exposing
all PII. Adding `VERCEL_ENV` guard provides defense-in-depth.

## Steps

### Step 1: Modify isSkipAuthEnabled

In `src/lib/auth/config.ts`, change:

```typescript
export function isSkipAuthEnabled(env: AuthEnv = process.env): boolean {
  if (env.SKIP_AUTH !== 'true') return false;
  if (env.VERCEL_ENV === 'production') return false;
  if (env.NODE_ENV === 'production') return false;
  return true;
}
```

### Step 2: Update test

In `src/lib/auth/config.test.ts`, add a test for `VERCEL_ENV` guard:

```typescript
it('ignores auth bypass in production (VERCEL_ENV)', () => {
  expect(isSkipAuthEnabled({ SKIP_AUTH: 'true', VERCEL_ENV: 'production' })).toBe(false);
});
```

**Verify**: `npx vitest run src/lib/auth/config.test.ts` → 6 tests pass

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npx vitest run src/lib/auth/config.test.ts` — 6 tests pass
- [ ] No files outside `src/lib/auth/config.ts` and `src/lib/auth/config.test.ts` are modified
