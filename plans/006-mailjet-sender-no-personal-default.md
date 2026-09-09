# Plan 006: Remove the personal default for `MAILJET_SENDER_EMAIL`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/env.ts src/lib/env.test.ts src/lib/email/index.ts .env.example`
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
- **Issue**: https://github.com/prof-ramos/intranet/issues/471

## Why this matters

`MAILJET_SENDER_EMAIL` defaults to a personal `@asof.org.br` mailbox when the env var is omitted (`src/lib/env.ts:28`). `.env.example` tells operators to set a validated sender. If someone enables `MAILJET_API_KEY` / `MAILJET_SECRET_KEY` without overriding the sender, transactional mail (password reset, mailing campaigns) is sent From that personal identity. There must be no implicit personal From. (`GMAIL_USER` defaulting to `controller@asof.org.br` is a documented controller mailbox in `.env.example` — leave it; this plan is only Mailjet sender.)

Do not copy the current default address into new tests as “the production sender”. Tests may assert that an unset sender is `undefined`.

## Current state

```ts
MAILJET_SENDER_EMAIL: optionalString.default('gabriel@asof.org.br'),
MAILJET_SENDER_NAME: optionalString.default('ASOF Intranet'),
MAILJET_SENDER_VALIDATED: optionalBooleanString.default('false').transform((v) => v === 'true'),
```

- `src/lib/email/index.ts:34-36` uses `env.MAILJET_SENDER_EMAIL` / `MAILJET_SENDER_NAME` as Mailjet `From`.
- Send paths already no-op when keys or `MAILJET_SENDER_VALIDATED` are missing (`auth/service.ts`, `password-reset.ts`, `mailing/service.ts`).

**Conventions**

- `optionalString` already maps `''` → `undefined`.
- Keep `MAILJET_SENDER_NAME` default `'ASOF Intranet'` (not a personal identity).
- Env tests: `src/lib/env.test.ts` `safeParse`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/lib/env.test.ts src/lib/email` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/lib/env.ts`
- `src/lib/env.test.ts`
- `.env.example` Mailjet block (already has a placeholder — keep it, no personal address)
- `src/lib/email/index.ts` only if it needs a runtime guard when sender is undefined (throw `EmailSendError` or a clear Error before calling Mailjet)

**Out of scope**:
- Plan 007 (stop returning temp passwords / require Mailjet in production).
- Changing `GMAIL_USER` default.
- Mailjet API payload shape.

## Git workflow

- Branch: `fix/issue-<N>-mailjet-sender-default`
- Commit: `fix(env): remover default pessoal de MAILJET_SENDER_EMAIL`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Drop the email default

Replace `optionalString.default('…')` with `optionalString` (or `z.string().email().optional()` after the empty transform, without a default). Unset sender → `undefined`.

Add a refine **or** a guard in `sendEmail`: if keys are present but sender is missing, do not call Mailjet. Prefer `sendEmail` throwing a typed error so callers keep their existing try/catch. Do not send with an empty From.

**Verify**: `rg -n "MAILJET_SENDER_EMAIL" src/lib/env.ts` has no `.default(` with an email address.

### Step 2: Tests

- Parse without `MAILJET_SENDER_EMAIL` → `data.MAILJET_SENDER_EMAIL` is `undefined`.
- Parse with a valid email → that email.
- If you add a `sendEmail` guard, unit-test it does not `fetch` when sender is missing (mock `fetch`).

Grep tests for the old default address (`rg -n "asof.org.br" src --glob '*.test.ts'`). Update only assertions that expected the personal default as Mailjet From. Do not rewrite Gmail tests.

## Test plan

- `src/lib/env.test.ts` as above.
- Optional: `src/lib/email` send guard.

## Done criteria

- [ ] `MAILJET_SENDER_EMAIL` has no personal `.default()`
- [ ] Unset sender does not produce a From address
- [ ] `npx vitest run src/lib/env.test.ts` exits 0
- [ ] `npm run lint` and `npm run typecheck` exit 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- Production Vercel already depends on the default because `MAILJET_SENDER_EMAIL` is unset. STOP and report: operators must set the var before this lands, or this plan must ship together with a Vercel env add (ops, out of executor scope).

## Maintenance notes

- Reviewer: `.env.example` must not reintroduce a personal mailbox as the “example” sender; `remetente-validado@asof.org.br` style placeholders are OK.
- Plan 007 will require a validated sender in production; this plan only removes the silent default.
