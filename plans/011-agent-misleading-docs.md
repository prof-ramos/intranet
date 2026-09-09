# Plan 011: Correct agent-facing docs that describe the wrong stack, dashboard, and Neon reset

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/auth/AGENTS.md src/app/app/AGENTS.md docs/environments.md docs/operations/auditoria-tecnica-residuos-2026-09-05.md TODO-PROD.md AGENTS.md README.md docs/compliance/lgpd-checklist.md src/app/app/privacidade/page.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/476

## Why this matters

Agents treat nested `AGENTS.md` as instructions. Today they are told that passwords are Argon2 and sessions are `jose`, that `/app` redirects to atividades, and that Neon `main` may still be reset while “not in real use”. The code is bcryptjs + HMAC cookies, `/app` renders the dashboard (`WelcomeBanner`), and TODO-PROD treats go-live as done (2026-09-08). A following agent can “restore” a redirect that deletes the painel, swap the hash, or reset production. Docs that are actively wrong are worse than missing.

## Current state (must fix all of these)

1. `src/lib/auth/AGENTS.md:18` — `password.ts` described as “Argon2 password hashing”; `:49` lists deps `argon2` and `jose`. Reality: `src/lib/auth/password.ts` is complexity validation; hash is `bcryptjs` in `src/lib/auth/service.ts`; session is HMAC in `src/lib/auth/session.ts`.
2. `src/app/app/AGENTS.md:19` — `page.tsx` “Redirects to atividades”. Reality: `src/app/app/page.tsx` renders the dashboard.
3. `docs/environments.md:33-45` — “Enquanto a intranet ainda não estiver em uso real… pode ser resetado”. TODO-PROD (2026-09-08) records production smoke green. The matrix is the canonical env doc (ADR 015): add an explicit state line that destructive reset of Neon `main` is **forbidden** after go-live, matching the paragraph already at `:44-45`, and remove the “pré-go-live reset is OK” framing **or** date-stamp it as historical (ADR 016) so it cannot be read as current procedure.
4. `docs/operations/auditoria-tecnica-residuos-2026-09-05.md` — claims NotificationBell is unmounted and Novu is the UI. After PR #457/#459/#465 the layout mounts `NotificationBellWrapper` and Novu is gone. Archive this file (see Step 3).
5. `TODO-PROD.md` “Em aberto” still mentions drafts #432/#428 and undici pending in one paragraph while another marks undici done. Reconcile that section with current `main`.
6. Root `AGENTS.md` / `README.md` cron count and `ARCHITECTURE.md#21-domain-module-and-caller-map` (broken anchor). Grep and fix or delete the link.
7. `docs/compliance/lgpd-checklist.md:12` — “Mascaramento por role”. Root `AGENTS.md` forbids reintroducing PII masks by role. Correct the checklist.
8. `src/app/app/privacidade/page.tsx:52-56` — access request copy has no 15-day SLA. ADR 019 asks for that sentence. Add one Portuguese sentence; do **not** change `privacidade/actions.ts`.

**Conventions**

- `docs/environments.md` wins over other env docs (file header). If you change it, keep ADR 015/016 pointers.
- Do not claim RLS is active (ADR 001).
- Notification path: PostgreSQL `emitEvent` + `NotificationBell` polling. Novu is not the in-app path (removed in #465).
- User-facing privacidade copy: Portuguese, calm, institutional (`PRODUCT.md`).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Docs check | `npm run docs:check` | exit 0 (if it flags moved files, follow its rules) |
| Lint (if page.tsx copy changes) | `npm run lint` | exit 0 |

## Scope

**In scope**:
- `src/lib/auth/AGENTS.md`
- `src/app/app/AGENTS.md`
- `docs/environments.md` (the pré-go-live section only, plus a one-line current state at the top of that section)
- `docs/operations/auditoria-tecnica-residuos-2026-09-05.md` — move to `docs/operations/archive/` and add a 5-line banner “superseded 2026-09-06+, Bell is mounted, Novu removed”
- `docs/operations/AGENTS.md` if it indexes that audit
- `TODO-PROD.md` stale “Em aberto” bullets only
- Root `AGENTS.md` cron count if wrong
- `README.md` broken ARCHITECTURE anchor
- `docs/compliance/lgpd-checklist.md` mask-by-role line
- `src/app/app/privacidade/page.tsx` SLA sentence only

**Out of scope**:
- Rewriting ARCHITECTURE.md wholesale.
- Code changes to auth, dashboard, or notifications.
- ADR 016 historical text (you may add “historical — do not execute” if you touch it; do not rewrite the ADR decision).

## Git workflow

- Branch: `docs/issue-<N>-agent-misleading-docs`
- Commit: `docs: corrigir AGENTS, matriz Neon e auditoria de resíduos obsoleta`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Auth + dashboard AGENTS

Rewrite the Key Files row for `password.ts` to “password complexity rules (bcryptjs hash lives in `service.ts`)”. Dependencies: `bcryptjs`, HMAC in `session.ts`. Remove `argon2` and `jose`.

`src/app/app/AGENTS.md` `page.tsx` row: “Dashboard (WelcomeBanner, indicadores, filas)”.

**Verify**: `rg -n "argon2|jose|Redirects to atividades" src/lib/auth/AGENTS.md src/app/app/AGENTS.md` empty.

### Step 2: environments.md state stamp

At the top of “Produção E Pré-Go-Live”, add a dated status (2026-09-08): go-live executed; destructive reset of Neon `main` is forbidden; use PITR/ADR 010. Keep ADR 016 as history of the pre-go-live reset, not as a current runbook step.

**Verify**: the phrase “pode ser resetado” is not an unmarked present-tense instruction. Either deleted or prefixed with “Histórico (pré-go-live, ADR 016):”.

### Step 3: Archive the 2026-09-05 residual audit

`git mv docs/operations/auditoria-tecnica-residuos-2026-09-05.md docs/operations/archive/`

Prepend:

```md
> **Superseded.** NotificationBell is mounted (`src/app/app/layout.tsx`).
> Novu client removed (PR #465). Do not follow cleanup item “Bell morto”.
```

Update any link in `docs/operations/AGENTS.md`.

### Step 4: TODO-PROD, cron count, README, LGPD checklist, privacidade SLA

- TODO-PROD: delete or tick the undici/#432/#428 lines so they match the “não há PR aberto” / undici-done bullets. Do not invent new open items.
- Grep `7 cron` / `gmail-watch` in `AGENTS.md` `README.md`. After plan 009 the watch cron may already be gone — write counts from **live** `vercel.json`, not from this plan’s memory.
- Fix or remove `README.md` link to `ARCHITECTURE.md#21-domain-module-and-caller-map`.
- Checklist: replace “Mascaramento por role” with the current rule (authenticated staff have operational PII visibility; `sanitizePii` on logs).
- Privacidade page: one sentence that the Secretaria has up to 15 days (ADR 019) to compile the export. No action change.

**Verify**: `npm run docs:check`; `rg -n "argon2|jose" src/lib/auth/AGENTS.md` empty.

## Test plan

- No new unit tests unless `docs:check` requires a fixture update (`scripts/check-docs.test.ts`).
- If you touch `privacidade/page.tsx` only as copy, no e2e required.

## Done criteria

- [ ] Auth AGENTS describes bcryptjs + HMAC, not argon2/jose
- [ ] App AGENTS describes the dashboard, not a redirect to atividades
- [ ] environments.md cannot be read as permission to reset Neon `main` today
- [ ] Residual audit is in `docs/operations/archive/` with a superseded banner
- [ ] LGPD checklist does not prescribe role masking
- [ ] Privacidade copy mentions the 15-day SLA
- [ ] `npm run docs:check` exits 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- Product owner still considers production “pré-go-live” (no real ASOF data). Then do **not** forbid reset in the matrix; STOP and report instead of inventing a go-live state.
- `docs:check` forbids moving the audit file without a registry edit you cannot find. STOP with the checker output.

## Maintenance notes

- Reviewer: the Neon reset wording is the dangerous line — read that diff twice.
- Nested AGENTS.md files are generated-looking; keep the `<!-- Parent -->` headers.
