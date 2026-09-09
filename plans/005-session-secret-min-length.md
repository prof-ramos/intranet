# Plan 005: Enforce a 32-character minimum on `SESSION_SECRET`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/env.ts src/lib/env.test.ts src/lib/auth/session.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/470

## Why this matters

Session cookies are HMAC-SHA256-signed with `SESSION_SECRET` (`src/lib/auth/session.ts`). AGENTS.md / CLAUDE.md say the secret must be at least 32 characters. `envSchema` only checks that the value is present when `SKIP_AUTH` is not active. A one-character or placeholder secret still boots. Production already uses `openssl rand -hex 32` (64 hex chars) per TODO-PROD; this plan blocks future misconfig at startup, including preview.

## Current state

- `src/lib/env.ts:50` `SESSION_SECRET: optionalSecretString`
- `src/lib/env.ts:130-139` refine: if skip-auth is off, `!!data.SESSION_SECRET` (presence only)
- `src/lib/env.test.ts:8` fixture already uses `'test-session-secret-with-at-least-32-chars'` (41 chars)
- `src/lib/auth/session.ts:26-31` `getSessionSecret()` throws if missing; no length check

Do **not** quote any real secret from `.env.local`. Tests use the existing fixture string only.

**Conventions**

- Zod 4 schema in `env.ts`; tests via `envSchema.safeParse`.
- `SKIP_AUTH=true` in non-production still allows missing `SESSION_SECRET` (existing refine). Keep that.
- HMAC key length: 32 UTF-8 characters minimum is what the docs already promise. Do not require 64 hex unless you also update the docs; 32 chars matches AGENTS.md.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/lib/env.test.ts` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/lib/env.ts`
- `src/lib/env.test.ts`

**Out of scope**:
- Rotating production `SESSION_SECRET` (ops; TODO-PROD already records a rotation).
- Cookie `Secure` / `SameSite` (already covered).
- `ENCRYPTION_MASTER_KEY` length (separate key; do not hitchhike).

## Git workflow

- Branch: `fix/issue-<N>-session-secret-min-length`
- Commit: `fix(env): exigir SESSION_SECRET com no mínimo 32 caracteres`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Schema

Change `SESSION_SECRET` from unconstrained optional string to: optional, but when present must have `min(32)`. Keep the existing refine that requires it when skip-auth is off.

Example shape (adapt to the file’s `optionalSecretString` helper rather than duplicating transforms):

- After `emptyToUndefined`, pipe `z.string().min(32).optional()` so `''` becomes undefined (still caught by the presence refine) and `'short'` fails min length.

If `optionalSecretString` is shared with other secrets, **do not** tighten those other secrets in this plan. Duplicate a local session-secret schema instead.

**Verify**: `npx vitest run src/lib/env.test.ts`

### Step 2: Tests

Add:

- `SESSION_SECRET: 'short'` + `SKIP_AUTH: 'false'` → `success === false`, issue path includes `SESSION_SECRET`.
- Existing `validEnv` still passes (already 32+).
- `SKIP_AUTH: 'true'`, `NODE_ENV: 'development'`, `DEV_USER_ID: '1'`, no session secret → still passes (existing skip-auth behaviour).

Grep other test files for short `SESSION_SECRET` stubs (`rg "SESSION_SECRET:" src scripts e2e .github` excluding node_modules). If CI/workflows use a stub, lengthen it to ≥32. That grep may show workflow files — **only** change a stub that would fail the new schema at boot. Do not edit GitHub workflow secrets.

If a test file outside `env.test.ts` sets `SESSION_SECRET: 'test'` and imports `env`, include that file in scope and lengthen the stub. If the grep is huge, STOP and report the list rather than drive-by editing twenty files.

## Test plan

- File: `src/lib/env.test.ts`, same `safeParse` style as `rejeita SKIP_AUTH=true sem DEV_USER_ID`.
- Do not log or expect the secret value beyond `'short'` vs the existing 32+ fixture.

## Done criteria

- [ ] `envSchema.safeParse` rejects a present `SESSION_SECRET` shorter than 32
- [ ] Skip-auth dev without secret still parses
- [ ] `npx vitest run src/lib/env.test.ts` exits 0
- [ ] `npm run lint` and `npm run typecheck` exit 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- Tightening `optionalSecretString` would also reject short `ENCRYPTION_MASTER_KEY` / webhook keys in tests. Split the schema instead of expanding scope.
- More than ~5 non-env test files break because of a 3-character stub. STOP and list them; do not mass-edit.

## Maintenance notes

- Reviewer: production values are already 64 hex; this is a boot-time seatbelt.
- Never copy a live secret into the PR or tests.
