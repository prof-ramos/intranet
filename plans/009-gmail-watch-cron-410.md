# Plan 009: Stop renewing Gmail push watch while the webhook is deactivated

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/app/api/v1/gmail-webhook/route.ts src/app/api/v1/cron/gmail-watch/route.ts src/app/api/v1/cron/gmail-watch/route.test.ts vercel.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/474

## Why this matters

`POST/GET /api/v1/gmail-webhook` always returns 410 “Gmail webhook está desativado”. The weekly cron `GET /api/v1/cron/gmail-watch` still calls `watchGmail` when `GMAIL_WATCH_TOPIC` is set, or 500s when it is not. Batch triage is pull-based (`processBatch` via `/api/v1/email-triage/process`, still scheduled — that cron stays; #429 keeps the pipeline). Renewing a Pub/Sub watch against a dead HTTPS endpoint is wasted Google traffic and noisy cron failures.

## Current state

- `src/app/api/v1/gmail-webhook/route.ts:4-9` — 410 for GET and POST.
- `src/app/api/v1/cron/gmail-watch/route.ts:18-31` — requires topic, then `getGmailAccessToken` + `watchGmail`.
- `vercel.json:26-28` — `"path": "/api/v1/cron/gmail-watch", "schedule": "0 2 * * 0"`.
- `src/app/api/v1/cron/gmail-watch/route.test.ts` — 200 on valid bearer.

**Conventions**

- Cron auth: `authorizeCronRequest` (`src/lib/cron/auth.ts`) — keep it. Even a no-op cron must reject missing bearer (copy `overdue-payments/route.test.ts`).
- Email-triage **process** cron is in scope to **leave running**.
- JSON helpers: `jsonOk` / `jsonError` from `@/lib/integrations/http`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/app/api/v1/cron/gmail-watch src/app/api/v1/gmail-webhook` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/app/api/v1/cron/gmail-watch/route.ts`
- `src/app/api/v1/cron/gmail-watch/route.test.ts`
- `vercel.json` (remove the gmail-watch cron entry)
- Docs that count “8 crons” (`AGENTS.md` root table, `README.md` cron list) — update the count/list if you remove the schedule. If you leave the route as an authenticated no-op, still remove it from `vercel.json` so Vercel does not invoke it.

**Out of scope**:
- Re-authenticating Gmail push.
- Changing `email-triage/process` cron or `processBatch`.
- Gmail OAuth token files.

## Git workflow

- Branch: `fix/issue-<N>-gmail-watch-cron-410`
- Commit: `fix(cron): desligar gmail-watch enquanto o webhook retorna 410`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Make the watch route an authenticated no-op

After `authorizeCronRequest` succeeds, return `jsonOk({ mode: 'scheduled', skipped: 'gmail_webhook_deactivated' }, { requestId })` **without** calling Gmail. Do not 500 on missing `GMAIL_WATCH_TOPIC`.

Keep 401/405 behaviour.

**Verify**: tests: valid bearer → 200 with `skipped`; no bearer → 401; no `watchGmail` mock calls.

### Step 2: Remove the Vercel schedule

Delete the `gmail-watch` object from `vercel.json` `crons`. Leave the route file so a manual GET with bearer still no-ops (useful if someone hits the old URL).

Update cron counts in `AGENTS.md` / `README.md` if they list this path (grep `gmail-watch`).

**Verify**: `rg gmail-watch vercel.json` empty.

## Test plan

- Rewrite `route.test.ts` from “renews watch” to “skips while webhook deactivated”.
- Pattern: `src/app/api/v1/cron/overdue-payments/route.test.ts` (bearer 200/401).

## Done criteria

- [ ] `vercel.json` has no `/api/v1/cron/gmail-watch` schedule
- [ ] Authenticated GET returns 200 skipped, does not call Gmail
- [ ] Unauthenticated GET returns 401
- [ ] `/api/v1/email-triage/process` still listed in `vercel.json`
- [ ] lint + typecheck + focused vitest pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- Gmail webhook is no longer 410 (push re-enabled). Then this plan is REJECTED; keep the cron.
- Removing the cron entry is forbidden by a runbook that says weekly watch is required for pull triage. STOP and report (pull triage does not need watch).

## Maintenance notes

- To re-enable push: restore webhook auth, then put the cron back and restore `watchGmail`.
- Reviewer: do not delete `watchGmail` helper; only stop calling it from the cron.
