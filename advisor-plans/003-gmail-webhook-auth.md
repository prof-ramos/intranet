# Plan 003: Authenticate `gmail-webhook` POST

> **Executor instructions**: Follow step by step. Run every verification command
> and confirm the expected result before moving on. If a STOP condition fires,
> stop and report — do not improvise. When done, update your row in
> `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/app/api/v1/gmail-webhook/route.ts`
> If changed, compare "Current state" excerpts against live code; on mismatch, STOP.
>
> **SECURITY NOTE**: This plan describes an unauthenticated public endpoint. Do NOT
> publish this plan as a public GitHub issue — it is plan-only. Reference
> `file:line` and the missing-control type only; do not reproduce any token or
> webhook URL value.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `844df3b`, 2026-06-30
- **Issue**: plan-only (repo is public; do not publish)

## Why this matters

The Gmail webhook endpoint accepts unauthenticated POST requests, base64-decodes
an attacker-controlled `historyId`, and triggers Gmail API calls using the
project's OAuth token. An external attacker who can guess or enumerate the
webhook URL can drive the project's Gmail integration with arbitrary history IDs,
forcing token use and potentially surfacing mailbox state. This is a missing
authentication control on a privileged integration endpoint. The fix is small:
require a shared secret (the repo already has `CRON_SECRET` and the dual
`integration_api_keys` pattern to model on).

## Current state

- `src/app/api/v1/gmail-webhook/route.ts` — `POST` handler at ~lines 42-76 uses
  `createWebhookHandler` without an `authenticate` callback. It base64-decodes
  `body.message.data`, JSON-parses `historyId`, and calls `processWebhookAsync(historyId)`.
  `GET` at ~line 78 is also unauth (health check — lower priority).
- The route is **outside** the `proxy.ts` matcher — confirm via
  `src/proxy.ts` that `/api/v1/gmail-webhook` is not behind the session-cookie guard.
  API routes under `/api/v1/` are intentionally public for M2M integrations.
- Existing auth patterns to model on:
  - `src/lib/integrations/verify-request.ts` — dual auth (env-var `ASOF_INTEGRATIONS_ENABLED`
    or `integration_api_keys` table-backed) + nonce anti-replay. Used by other
    integration endpoints.
  - `CRON_SECRET` for `/api/v1/cron/*` routes — `src/app/api/v1/cron/*/route.ts`
    check `Authorization: Bearer <CRON_SECRET>`.
- Gmail Pub/Sub push webhooks conventionally send a bearer token or require URL
  verification; check `docs/adr/` and `src/lib/email-triage/` for any documented
  Gmail integration contract before choosing the mechanism.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Unit tests | `npx vitest run` (or the relevant webhook test) | pass |
| Lint | `npm run lint` | exit 0 |
| Validate | `npm run validate:quick` | exit 0 |

## Scope

**In scope**:
- `src/app/api/v1/gmail-webhook/route.ts`
- `src/app/api/v1/gmail-webhook/route.test.ts` (create or extend)

**Out of scope**:
- `src/lib/email-triage/*` — the downstream processing logic
- `src/proxy.ts` — do not move this route behind the session guard (it's an M2M endpoint)
- Other `/api/v1/` routes

## Git workflow

- Branch: `advisor/003-gmail-webhook-auth`
- Commit: `security(gmail-webhook): require shared-secret authentication on POST`
- Do NOT push unless instructed.

## Steps

### Step 1: Decide the auth mechanism

Check whether Gmail Pub/Sub push subscriptions support a bearer token header
(check `docs/adr/` for an Assinafy/Gmail integration ADR and the Gmail Pub/Sub docs
via the `document-specialist` agent or Context7). If Gmail supports a configurable
bearer token in the push config, use a dedicated `GMAIL_WEBHOOK_SECRET` env var
validated in `src/lib/env.ts` (model on `CRON_SECRET`).

**Verify**: `npm run typecheck` after adding the env field → exit 0 (env validation
runs in non-production dev too).

### Step 2: Add an `authenticate` callback to `createWebhookHandler`

Model the callback on the dual-auth pattern in `verify-request.ts` OR the simpler
`CRON_SECRET` bearer check in `src/app/api/v1/cron/*/route.ts`. Reject with 401 when
the token is missing/invalid. Log the rejection with `sanitizePii` on any identifier
(never log the token value).

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Add tests

In `route.test.ts`: (a) POST without token → 401; (b) POST with wrong token → 401;
(c) POST with correct token → delegates to `processWebhookAsync` (mock it) and returns
the expected status. Model on an existing cron route test if one exists.

**Verify**: `npx vitest run src/app/api/v1/gmail-webhook` → pass.

### Step 4: Secure the GET health endpoint (lower priority)

Either gate GET with the same token or restrict it to a fixed health string with
no integration details. Prefer the same token for simplicity.

**Verify**: `npm run lint` + `npm run validate:quick` → exit 0.

## Test plan

- New tests in `route.test.ts`: 401 without token, 401 wrong token, 200/correct
  delegation with valid token.
- Pattern: existing cron route tests or `verify-request.test.ts` if present.
- Verification: `npx vitest run src/app/api/v1/gmail-webhook` → all pass.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run validate:quick` exits 0
- [ ] POST without a valid token returns 401 (test asserts it)
- [ ] No token value appears in any log, test, or code (only the env var name)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- `createWebhookHandler` does not accept an `authenticate` callback — STOP; report
  the actual signature and propose the minimal change to the handler.
- Gmail Pub/Sub push config does not support a custom bearer token — STOP; report
  and propose URL-token (`?token=…`) or HMAC signature verification as the alternative.
- The route already has auth that was missed during audit — STOP; reconfirm and close
  the plan as REJECTED with rationale.

## Maintenance notes

- Reviewer: confirm the chosen secret is rotated via the same process as
  `CRON_SECRET` (memory note: Vercel Encrypted env rotation requires redeploy).
- After landing, verify the deployed webhook still receives Gmail pushes — a
  misconfigured token silently breaks email triage.
- Follow-up (out of scope): rate-limit this endpoint via `src/lib/integrations/rate-limit.ts`.