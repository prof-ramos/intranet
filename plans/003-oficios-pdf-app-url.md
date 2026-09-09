# Plan 003: Load ofício PDF fonts and logo from `ASOF_INTRANET_URL`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/oficios/pdf.ts src/lib/env.ts .env.example`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/468

## Why this matters

Ofício PDFs try `fs.readFileSync` on `public/fonts/carlito` and `public/logo.png`. On Vercel that often fails; the fallback `fetch`es `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'`. Production already **requires** `ASOF_INTRANET_URL` (`src/lib/env.ts` refine). If `NEXT_PUBLIC_APP_URL` is unset, serverless fetches localhost, caches the miss (`carlitoFontsUnavailable = true`), and the PDF falls back to standard fonts — breaking the Carlito/ABNT look in production. One public app URL is enough.

## Current state

- `src/lib/oficios/pdf.ts:67` and `:98` — `const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';`
- `src/lib/env.ts:32,141-150` — `ASOF_INTRANET_URL` is a Zod URL, required when `VERCEL_ENV === 'production'`.
- Password-reset already uses it: `src/lib/auth/password-reset.ts` `env.ASOF_INTRANET_URL || 'http://localhost:3000'`.
- `.env.example:119-121` documents `NEXT_PUBLIC_APP_URL` as “URL pública do app (PDFs/ofícios)”.

**Conventions**

- Import `env` from `@/lib/env` (server-only). `pdf.ts` already runs on the server (pdf-lib). Do not add `NEXT_PUBLIC_*` for this.
- Local default remains `http://localhost:3000` when `ASOF_INTRANET_URL` is unset (dev).
- Negative cache of missing fonts stays; tests use `resetOficioPdfAssetCacheForTests()`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/lib/oficios` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/lib/oficios/pdf.ts`
- ofício PDF tests that assert the fetch URL (extend if present; create a focused test if the fetch path is untested)
- `.env.example` (replace `NEXT_PUBLIC_APP_URL` with `ASOF_INTRANET_URL` in the PDF section)
- `DEPENDENCIES.md` / `ARCHITECTURE.md` only if they mention `NEXT_PUBLIC_APP_URL` for PDFs (grep first; skip if absent)

**Out of scope**:
- PDF layout, margins, Carlito embedding logic.
- Assinafy upload (plan 004).
- Making `ASOF_INTRANET_URL` required outside production.

## Git workflow

- Branch: `fix/issue-<N>-oficios-pdf-app-url`
- Commit: `fix(oficios): usar ASOF_INTRANET_URL no fallback de fontes do PDF`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Switch the fallback base URL

In both `getCarlitoFontBytes` and `loadLogoBytes` catch blocks:

```ts
const baseUrl = env.ASOF_INTRANET_URL ?? 'http://localhost:3000';
```

Import `{ env } from '@/lib/env'`. Remove `process.env.NEXT_PUBLIC_APP_URL`.

**Verify**: `rg -n "NEXT_PUBLIC_APP_URL" src/lib/oficios` is empty.

### Step 2: Example env and tests

- `.env.example`: in the “URL pública do app (PDFs/ofícios)” block, point to `ASOF_INTRANET_URL` (the variable is likely already listed elsewhere — do not duplicate conflicting comments).
- If `pdf.ts` tests mock `fetch`, assert the URL starts with the env value. If they only cover `fs` success, add one test that forces `readFileSync` to throw (mock `fs`) and spies `fetch` with `ASOF_INTRANET_URL` set via the env mock used elsewhere (`src/lib/env.ts` is typically imported as a live object — follow the existing oficios test mock style; if env cannot be mocked, test a tiny exported `function oficioPublicAssetBaseUrl()` used by both fallbacks).

Prefer extracting:

```ts
export function oficioPublicAssetBaseUrl(): string {
  return env.ASOF_INTRANET_URL ?? 'http://localhost:3000';
}
```

and unit-test that function by mocking `@/lib/env`.

**Verify**: `npx vitest run src/lib/oficios` passes.

## Test plan

- New or extended test: `oficioPublicAssetBaseUrl()` returns `ASOF_INTRANET_URL` when set, else localhost.
- Do not fetch the real network.

## Done criteria

- [ ] `rg -n "NEXT_PUBLIC_APP_URL" src/lib/oficios` empty
- [ ] Fallback uses `env.ASOF_INTRANET_URL`
- [ ] Unit tests for the base URL helper pass
- [ ] `npm run lint` and `npm run typecheck` exit 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- `pdf.ts` already uses `ASOF_INTRANET_URL` — REJECTED.
- Importing `@/lib/env` from `pdf.ts` creates a circular import or pulls `server-only` into a client bundle. STOP; ofício PDF must stay server-only.

## Maintenance notes

- Reviewer: two call sites (fonts + logo) must share one helper so they cannot drift again.
- Other absolute URLs (reset links) already use `ASOF_INTRANET_URL`; keep it that way.
