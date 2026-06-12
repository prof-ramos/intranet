# Plan 012: Fix cookie Secure flag for Vercel Preview deploys

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 123f019..HEAD -- src/lib/auth/session.ts src/lib/env.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `123f019`, 2026-06-12
- **Issue**: none yet

## Why this matters

The session cookie's `Secure` flag is set to `env.NODE_ENV === 'production'`. On Vercel Preview deploys, `NODE_ENV` is `production` but the URL uses `https://` (Vercel always serves over HTTPS). However, on **local development** with `NODE_ENV=development`, the flag is `false`, which is correct. The real problem is: if someone runs the app locally with `NODE_ENV=production` (e.g., `npm run build && npm run start`), the cookie will be `Secure`-only but the local server uses `http://localhost:3000` — the browser silently drops the cookie, causing a login loop.

The correct heuristic is: set `Secure` when the request URL uses HTTPS, not based on `NODE_ENV`. However, since Next.js `cookies()` API doesn't expose the request protocol directly, and the app is always behind HTTPS in production/preview, the pragmatic fix is to check `VERCEL_ENV` (which is `production` or `preview` on Vercel, `undefined` locally) OR keep `NODE_ENV` but also handle the `VERCEL_ENV` case explicitly. The simplest safe approach: `secure: env.NODE_ENV === 'production' || !!env.VERCEL_ENV`.

## Current state

- `src/lib/auth/session.ts:136` — cookie set with:
  ```ts
  secure: env.NODE_ENV === 'production',
  ```
- `src/lib/env.ts` — validates env vars. Currently does NOT expose `VERCEL_ENV`.

## Commands you will need

| Purpose   | Command                              | Expected on success          |
|-----------|--------------------------------------|------------------------------|
| Typecheck | `npm run typecheck`                  | exit 0, no errors            |
| Lint      | `npm run lint`                       | exit 0                       |
| Tests     | `npm run test`                       | all pass                     |

## Scope

**In scope** (the only files you should modify):
- `src/lib/auth/session.ts` (one line change)
- `src/lib/env.ts` (add VERCEL_ENV to env schema if not present)

**Out of scope**:
- Other cookies in the app
- The session creation/signing logic
- Proxy/auth middleware changes

## Git workflow

- Branch: `advisor/012-fix-cookie-secure-flag`
- Commit message: `fix(security): set Secure flag based on VERCEL_ENV for Preview deploys`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add VERCEL_ENV to the env schema

In `src/lib/env.ts`, find the Zod schema object (usually `const envSchema = z.object({...})`) and add:

```ts
VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
```

This makes `env.VERCEL_ENV` available as `'production' | 'preview' | 'development' | undefined`.

**Verify**: `npm run typecheck` → exit 0

### Step 2: Update the Secure flag in session.ts

In `src/lib/auth/session.ts:136`, change:
```ts
secure: env.NODE_ENV === 'production',
```

To:
```ts
secure: env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview',
```

**Verify**: `npm run typecheck` → exit 0

### Step 3: Run quality gates

```bash
npm run lint        # → exit 0
npm run typecheck   # → exit 0
npm run test        # → all pass
```

## Test plan

- Existing auth tests should still pass.
- Verify manually: when `VERCEL_ENV` is not set (local dev), `secure` is `false`. When `VERCEL_ENV=preview` or `VERCEL_ENV=production`, `secure` is `true`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test` exits 0
- [ ] `grep -n "secure:" src/lib/auth/session.ts` shows the updated condition
- [ ] `grep -n "VERCEL_ENV" src/lib/env.ts` shows the new env var

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- `VERCEL_ENV` is already defined in the env schema.

## Maintenance notes

- Vercel automatically sets `VERCEL_ENV` to `production`, `preview`, or leaves it undefined for local dev. No manual configuration needed.
- If the app moves to a non-Vercel deployment, this check still works: `NODE_ENV=production` covers non-Vercel production, and the absence of `VERCEL_ENV` means local dev.
