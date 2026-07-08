# Plan 031: Sanitize production config warnings

> **Executor instructions**: Follow this plan step by step.
>
> **Drift check**: `git diff --stat 257b5cc..HEAD -- next.config.ts`

## Status

- **Priority**: P2 (correctness)
- **Effort**: S (15 min)
- **Risk**: LOW
- **Category**: correctness

## Why

`next.config.ts` logs a `console.warn` when DB env vars are missing. In
production, this reveals which DB URL patterns the app accepts, aiding
reconnaissance. Guard with `VERCEL_ENV !== 'production'`.

## Steps

### Step 1: Guard the warning

In `next.config.ts`, add `VERCEL_ENV` check:

```typescript
if ((!process.env.DATABASE_URL || !hasMigrationUrl) && process.env.VERCEL_ENV !== 'production') {
  // ... existing warning logic
}
```

**Verify**: `npm run typecheck` → exit 0; `npm run lint` → exit 0

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] No files outside `next.config.ts` are modified
