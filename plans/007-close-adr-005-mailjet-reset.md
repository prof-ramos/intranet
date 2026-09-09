# Plan 007: Close ADR 005 — transactional email is the only production password-reset path

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/auth/service.ts src/lib/auth/password-reset.ts src/app/app/config/usuarios/actions.ts src/app/app/config/usuarios/UserActionsPanel.tsx src/lib/env.ts docs/adr/005-temporary-manual-password-reset.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/006-mailjet-sender-no-personal-default.md
- **Category**: security
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/472

## Why this matters

ADR 005 accepted showing a one-time `tempPassword` in the admin UI until Mailjet delivery existed, with a deadline of **2026-09-30**. The code already sends mail when `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, and `MAILJET_SENDER_VALIDATED` are all set (`src/lib/auth/service.ts:281-300`). If any flag is off, `resetUserPassword` still returns the plaintext password (`usuarios/actions.ts:55`) and `UserActionsPanel` opens “Ver credenciais resetadas”. Self-service `/forgot-password` returns `?sent=1` even when **no token was created** (`password-reset.ts:135-140`) — good against enumeration, bad against lockout: the operator believes mail was sent.

Production must not display a live password in the browser. Forgot-password must keep the same generic success response (no account enumeration). Admin reset must fail with a Portuguese error if mail is not configured, instead of handing over the secret.

## Current state

- `src/lib/auth/service.ts` `resetPassword` always generates a temp password, emails only if Mailjet is fully configured, returns `{ tempPassword, emailDelivered }`.
- `src/app/app/config/usuarios/actions.ts:50-55` — `tempPassword: result.emailDelivered ? undefined : result.tempPassword`.
- `src/app/app/config/usuarios/UserActionsPanel.tsx:72-78,214` — modal + `data-testid="temp-password-value"`.
- `src/lib/auth/password-reset.ts:135-140` — no token if Mailjet is not validated; timing floor; silent return.
- `src/app/forgot-password/actions.ts:74-75` — always `redirect('/forgot-password?sent=1')`.
- ADR 005 acceptance: no plaintext in admin; mail via Mailjet; admin sees “reset solicitado”; never log passwords/tokens.

**Conventions**

- `defineFormStateAction` with `auth: ['admin']` (already).
- Domain errors: prefer returning `{ success: false, message: '...' }` not `error.message` from drivers (`usuarios/actions.ts` `onError` currently forwards `error.message` — if you touch `onError`, replace with a fixed Portuguese string).
- Tests: `src/app/app/config/usuarios/actions.test.ts` already covers `emailDelivered: true` hiding the password. Invert the `false` case for production behaviour.
- Forgot-password must remain timing-safe and non-enumerating.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/lib/auth/service.test.ts src/lib/auth/password-reset.ts src/app/app/config/usuarios/actions.test.ts src/lib/env.test.ts` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/lib/auth/service.ts` and `src/lib/auth/service.test.ts`
- `src/app/app/config/usuarios/actions.ts` and `actions.test.ts`
- `src/app/app/config/usuarios/UserActionsPanel.tsx` (and its tests if any)
- `src/lib/auth/password-reset.ts` (and tests) — only comments/logging if you add an admin-visible metric; do **not** change the public `?sent=1` contract
- `src/lib/env.ts` / `src/lib/env.test.ts` — production refine: if `VERCEL_ENV === 'production'`, require Mailjet keys + `MAILJET_SENDER_VALIDATED` + `MAILJET_SENDER_EMAIL` (no default; plan 006)
- `docs/adr/005-temporary-manual-password-reset.md` — mark resolved / superseded with date and pointer to this behaviour
- `e2e` only if an existing spec clicks “Ver credenciais resetadas” — update it; do not add a new e2e for mail delivery

**Out of scope**:
- Implementing a new Mailjet account (ops). If production env is not ready, STOP (see STOP).
- Mailing campaigns (they already skip when sender is not validated).
- Reset token in query string (accepted for email links; do not redesign to fragments in this plan).

## Git workflow

- Branch: `fix/issue-<N>-close-adr-005-mailjet-reset`
- Commit: `fix(auth): encerrar ADR 005 — reset de senha só por e-mail em produção`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Production env fail-closed

Add a refine: when `VERCEL_ENV === 'production'`, `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_SENDER_EMAIL`, and `MAILJET_SENDER_VALIDATED === true` are required.

Tests: production parse without them fails; development parse without them succeeds.

**Verify**: `npx vitest run src/lib/env.test.ts`

### Step 2: Admin reset never returns the password to the client

In `resetPassword`:

- If Mailjet is not fully configured: **do not** return `tempPassword`. Throw a domain error or return a result the action maps to `{ success: false, message: 'Envio de e-mail não configurado. Não é possível resetar a senha.' }` **without** mutating the hash… **Decision (load-bearing):** do not rotate the password if you cannot deliver it. Check configuration **before** hashing/updating. Otherwise the user is locked out with no channel.
- If configured: keep current update + send. If `sendEmail` throws, keep the existing log + `emailDelivered: false`. The action must **not** put `tempPassword` on the wire; return `{ success: false, message: 'Não foi possível enviar o e-mail de redefinição. Tente novamente.' }` (password may already have been rotated — that is the current race). Optional improvement in the same function: send email **before** commit is worse (mail without rotation). Leave send-after-commit; just stop returning the secret.

`resetUserPassword` result type: drop `tempPassword` from the client result entirely.

**Verify**: `actions.test.ts` — `emailDelivered: false` does not include a password field; UI message is Portuguese.

### Step 3: Remove the credentials modal

`UserActionsPanel.tsx`: remove the modal, copy buttons, and `temp-password-value`. On success, only show the existing “Senha temporária gerada e enviada ao usuário.” (or the new failure message). Keep confirm-reset UX.

Update any component tests that look for `temp-password-value`.

**Verify**: `rg -n "tempPassword" src/app/app/config/usuarios` — only server-side generation if still needed internally, not in the action return type consumed by the panel.

### Step 4: ADR

Update ADR 005 status to “superseded” / “resolved 2026-09-08” with a short consequences note: production requires Mailjet; admin UI never displays passwords; forgot-password remains generic `?sent=1`.

## Test plan

- `service.test.ts`: unconfigured Mailjet → no DB password change (if you implemented the pre-check) OR documented failure without returning the secret.
- `actions.test.ts`: no `tempPassword` on success or failure.
- `env.test.ts`: production Mailjet required.
- Pattern: existing mocks in `usuarios/actions.test.ts`.

## Done criteria

- [ ] Production env without validated Mailjet fails schema parse
- [ ] Admin action result type has no `tempPassword`
- [ ] `UserActionsPanel` has no credentials modal / `temp-password-value`
- [ ] Forgot-password still always redirects `?sent=1` (no enumeration)
- [ ] Password is not rotated when Mailjet is unconfigured
- [ ] ADR 005 marked resolved
- [ ] Targeted vitest + lint + typecheck pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- Plan 006 is not DONE and `MAILJET_SENDER_EMAIL` still defaults to a personal mailbox — do not require that default in production.
- You cannot implement “check Mailjet before rotating password” without a large refactor of the transaction. STOP and report rather than locking users out.
- Production Mailjet sender is not actually validated in Vercel (executor cannot know). Note in the PR that ops must set `MAILJET_SENDER_VALIDATED=true` **before** deploy, or the production build will fail by design.

## Maintenance notes

- Reviewer: the important invariant is “no password string in the Server Action return”. Grep `tempPassword` in `src/app`.
- Follow-up: Mailjet deliverability/DNS (SPF/DKIM) is ops, not this PR.
- Do not log reset links or temp passwords (`sanitizePii` already treats `resetLink`).
