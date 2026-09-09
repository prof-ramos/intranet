# Plan 004: Require `ASSINAFY_BASE_URL` whenever Assinafy is configured; refuse sandbox in production

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/assinafy/client.ts src/lib/env.ts src/lib/env.test.ts src/lib/oficios/service.ts`
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
- **Issue**: https://github.com/prof-ramos/intranet/issues/469

## Why this matters

`AssinafyClient` defaults `baseUrl` to `https://sandbox.assinafy.com.br/v1` when the option is missing. `env.ASSINAFY_BASE_URL` is optional in Zod. A production deploy with `ASSINAFY_API_KEY` set and the base URL forgotten silently talks to Assinafy sandbox: ofício PDFs and signer invites never reach the live account. Fail closed: if the API key is set, the base URL must be set; if `VERCEL_ENV === 'production'` (or `isProductionRuntime()`), the host must not be `sandbox.assinafy.com.br`.

## Current state

- `src/lib/assinafy/client.ts:37` `DEFAULT_BASE_URL = 'https://sandbox.assinafy.com.br/v1'`
- `src/lib/assinafy/client.ts:87` `this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;`
- `src/lib/env.ts:65-68` — `ASSINAFY_API_KEY`, `ASSINAFY_ACCOUNT_ID`, `ASSINAFY_WEBHOOK_SECRET`, `ASSINAFY_BASE_URL` (optional URL).
- Call site: `src/lib/oficios/service.ts` passes `env.ASSINAFY_BASE_URL` into the client (confirm with `rg ASSINAFY_BASE_URL src`).

**Conventions**

- Env validation lives in `src/lib/env.ts` with tests in `src/lib/env.test.ts` (`validEnv` fixture includes a 32+ char `SESSION_SECRET`).
- Use `.refine()` like the existing `CRON_SECRET` / `ASOF_INTRANET_URL` production checks.
- Do not print URLs with credentials. Host checks only.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/lib/env.test.ts src/lib/assinafy` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/lib/env.ts`
- `src/lib/env.test.ts`
- `src/lib/assinafy/client.ts`
- existing Assinafy client tests (constructor / baseUrl)
- `.env.example` Assinafy block (require `ASSINAFY_BASE_URL` in the comments)

**Out of scope**:
- Webhook HMAC vs shared secret (not this plan).
- Assinafy feature work, PDF generation, signing UI.
- Changing sandbox default for **local** when key is unset (client may keep sandbox only as an explicit test helper, not as the implicit production fallback).

## Git workflow

- Branch: `fix/issue-<N>-assinafy-base-url`
- Commit: `fix(assinafy): exigir ASSINAFY_BASE_URL e recusar sandbox em produção`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Env schema

Add a refine:

- If `ASSINAFY_API_KEY` is non-empty, `ASSINAFY_BASE_URL` must be a valid https URL.
- If `VERCEL_ENV === 'production'` (match neighboring refines; do not invent a new production helper unless you import `isProductionRuntime` from `src/lib/auth/config.ts` — that file must not create an import cycle with `env.ts`. Prefer checking `VERCEL_ENV` / `NODE_ENV` inline like existing refines).
- Production: `ASSINAFY_BASE_URL` hostname must not be `sandbox.assinafy.com.br`.

Error messages in Portuguese or English consistent with neighboring refines (those are English). Stay English to match `env.ts`.

**Verify**: tests in `env.test.ts`:
- key set, URL missing → fail
- key set, URL `https://api.assinafy.com.br/v1` → pass
- `VERCEL_ENV=production` + sandbox host → fail
- key unset, URL unset → pass (Assinafy disabled)

### Step 2: Client constructor

If `options.baseUrl` is missing, **throw** `AssinafyError` instead of defaulting to sandbox. Tests that constructed the client without a URL must pass an explicit sandbox URL (that is correct for unit tests).

**Verify**: `rg -n "sandbox.assinafy.com.br" src/lib/assinafy/client.ts` — the string may remain only in a comment or in tests, not as `DEFAULT_BASE_URL` used by the constructor.

## Test plan

- `src/lib/env.test.ts` — four cases in Step 1. Pattern: existing `safeParse` tests.
- Assinafy client test: constructor without `baseUrl` throws.

## Done criteria

- [ ] Missing `ASSINAFY_BASE_URL` with API key fails `envSchema`
- [ ] Production + sandbox host fails `envSchema`
- [ ] `AssinafyClient` does not default to sandbox
- [ ] `npx vitest run src/lib/env.test.ts src/lib/assinafy` exits 0
- [ ] `npm run lint` and `npm run typecheck` exit 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- `env.ts` importing `isProductionRuntime` from auth creates a cycle. Use inline `VERCEL_ENV`/`NODE_ENV` instead (do not STOP for that — that is the intended fallback).
- Ofício send-for-signature tests spin up a client without URL and you cannot tell which fixture is production vs sandbox. STOP if changing them would hit a live network.

## Maintenance notes

- Reviewer: local/dev may still point at sandbox **explicitly** via env; that is allowed.
- Document the production host in `.env.example` as `https://api.assinafy.com.br/v1` (or whatever the current Assinafy docs say — if ctx7/docs disagree, prefer the value already in `.env.example`).
