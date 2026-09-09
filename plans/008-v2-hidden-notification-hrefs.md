# Plan 008: Point in-app notification and domain-event links at live surfaces

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/email-triage/notifier.ts src/lib/finance/service.ts src/app/app/financeiro/layout.tsx src/app/app/email-triage/layout.tsx src/components/NotificationBell.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/473

## Why this matters

Financeiro and email-triage **operator UI** is hidden until V2 (issue #429). Layouts redirect `/app/financeiro/*` and `/app/email-triage/*` to `/app`. The NotificationBell (PostgreSQL, polling) is live. Triage still notifies admins with `href: /app/email-triage/${id}`. Overdue-payment domain events still set `links.app` to `/app/financeiro/mensalidades?...`. Operators click the bell and land on the dashboard with no context. Do not disable the crons or delete the modules. Change the hrefs to a live surface, or omit `href` so the bell shows the message without a dead link.

## Current state

- `src/app/app/financeiro/layout.tsx` and `src/app/app/email-triage/layout.tsx` — `redirect('/app')`.
- `src/lib/email-triage/notifier.ts:47` — `href: `/app/email-triage/${triageId}``.
- `src/lib/finance/service.ts:196-198` — `links.app: `/app/financeiro/mensalidades?year=...&month=...``.
- Notification click handling: `src/components/NotificationBell.tsx` `processNotificationClick` (tests in `NotificationBell.test.ts`). If `href` is missing, confirm the panel still shows title/message.

**Conventions**

- #429 is an accepted product decision: keep code and crons; do not un-hide UI.
- Domain event `links.app` is consumed by webhook subscribers (ADR 018). Changing the URL may affect external consumers. Prefer a URL that 200s for humans; if you must keep the old path for webhooks, split **notification href** from **domain event link**.
- Copy in notifications stays Portuguese.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/lib/email-triage src/lib/finance src/components/NotificationBell.test.ts` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/lib/email-triage/notifier.ts` and its tests
- `src/lib/finance/service.ts` (only the `links.app` string for overdue events) and tests that assert that URL
- Notification click tests if href presence changes
- Optional: `e2e/global-setup.ts` JIT warmup of financeiro/email-triage URLs — drop those `goto`s if they only warm a redirect (grep `financeiro` / `email-triage` in `e2e/global-setup.ts`)

**Out of scope**:
- Re-enabling the V2 screens.
- Stopping `vercel.json` crons for triage or overdue payments.
- Redesigning NotificationBell.

## Git workflow

- Branch: `fix/issue-<N>-v2-notification-hrefs`
- Commit: `fix(notifications): não apontar o sino para rotas V2 ocultas`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Inventory hrefs

`rg "/app/email-triage|/app/financeiro" src --glob '!**/node_modules/**'`

Every **operator-facing** href (notifications, emails, `links.app` shown in the bell) must change. Webhook payloads that are not shown in the intranet UI may keep the old path **if** a test documents it; default is to change both to a live path so they cannot drift.

### Step 2: Choose live targets

Use these defaults (do not invent new routes):

- Email triage pending: `href: '/app'` (dashboard) **or** omit `href`. Title/message already say the subject needs review. Prefer omit if `createNotificationFromEvent` allows missing href (check the type). If href is required, use `/app`.
- Overdue payment `links.app`: `/app` (not associados — contribution filter is not a per-month ledger).

If `createNotificationFromEvent` requires `href`, keep `/app`.

### Step 3: Tests

Update notifier/finance tests that expect the old paths. Add a comment `// V2 #429: operator UI hidden; do not link to /app/email-triage or /app/financeiro`.

**Verify**: `rg "/app/email-triage|/app/financeiro/mensalidades" src/lib/email-triage/notifier.ts src/lib/finance/service.ts` empty.

## Test plan

- Existing notifier tests (`src/lib/email-triage/notifier.test.ts`) — assert href is `/app` or undefined.
- Finance service tests that snapshot `links.app`.
- Pattern: existing mocks; do not hit Gmail.

## Done criteria

- [ ] No notification href under `/app/email-triage` or `/app/financeiro`
- [ ] Crons and services still compile and unit tests pass
- [ ] V2 layouts still redirect (untouched except if you only grep them)
- [ ] lint + typecheck pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- `href` is required and you think `/app` is too lossy for operators. STOP and report; do not un-hide the V2 layout.
- Domain-event contract tests in integrations freeze the old URL as a public API. STOP and report rather than breaking HMAC payload snapshots without a version bump.

## Maintenance notes

- When V2 ships (#429), restore deep links in the same two call sites.
- Reviewer: do not treat leftover `/app/financeiro` in **tests of the redirect** as a miss.
