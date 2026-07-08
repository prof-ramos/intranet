# Plan 028: Add size limits to request body cloning

> **Executor instructions**: Follow this plan step by step.
>
> **Drift check**: `git diff --stat 257b5cc..HEAD -- src/lib/integrations/verify-request.ts`

## Status

- **Priority**: P1 (security)
- **Effort**: M (hours)
- **Risk**: LOW
- **Category**: security

## Why

`readRequestBody()` at `src/lib/integrations/verify-request.ts:44-50` clones
the entire request body without size limits. A malicious actor could send
oversized payloads to exhaust memory, causing DoS.

## Steps

### Step 1: Add MAX_BODY_BYTES constant and guard

In `src/lib/integrations/verify-request.ts`, add:

```typescript
const MAX_BODY_BYTES = 10 * 1024 * 1024;

async function readRequestBody(request: Request): Promise<string> {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return '';
  }
  try {
    return await request.clone().text();
  } catch {
    return '';
  }
}
```

**Verify**: `npm run typecheck` → exit 0

### Step 2: Run existing tests

**Verify**: `npx vitest run src/lib/integrations/verify-request.test.ts` → all 18 tests pass

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npx vitest run src/lib/integrations/verify-request.test.ts` — all pass
- [ ] No files outside `src/lib/integrations/verify-request.ts` are modified
