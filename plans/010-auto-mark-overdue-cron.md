# Plan 010: Move autoMarkOverdue from page load to daily cron job

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 123f019..HEAD -- src/app/app/financeiro/mensalidades/page.tsx src/lib/finance/service.ts src/app/api/v1/cron/ vercel.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `123f019`, 2026-06-12
- **Issue**: none yet

## Why this matters

`autoMarkOverduePaymentsService()` runs on **every single page load** of `/app/financeiro/mensalidades`. This means every time an admin views the payments page, the app executes a transactional query that scans for overdue payments, transitions them, emits domain events, and writes audit logs — even if nothing is overdue. This is wasteful and creates unnecessary DB load. The function is idempotent and should run once daily via cron instead, consistent with the existing cron pattern used for LGPD retention, Gmail watch, etc.

## Current state

- `src/app/app/financeiro/mensalidades/page.tsx:52` — calls `autoMarkOverduePaymentsService()` on every render:
  ```ts
  await autoMarkOverduePaymentsService();
  ```
- `src/lib/finance/service.ts:19-60` — the function runs inside a DB transaction, transitions `pendente → atrasado`, logs audit entries, and emits domain events. Returns the count of transitioned payments.
- `src/lib/cron/auth.ts` — existing `authorizeCronRequest(request)` pattern: checks `Bearer` token against `env.CRON_SECRET`.
- `src/app/api/v1/cron/lgpd-retention/route.ts` — exemplar cron route: `GET` handler calls `authorizeCronRequest`, runs the service, returns JSON.
- `vercel.json` — existing crons at `0 3 * * *`, `0 4 * * *`, `0 5 * * *`, `0 6 * * *`, `0 2 * * 0`. Next available slot: `0 2 * * *` (2:00 AM, before LGPD at 05:00).
- Vercel Free/Hobby plan: crons run at most once per day. No risk of double-execution.

## Commands you will need

| Purpose   | Command                              | Expected on success          |
|-----------|--------------------------------------|------------------------------|
| Typecheck | `npm run typecheck`                  | exit 0, no errors            |
| Lint      | `npm run lint`                       | exit 0                       |
| Tests     | `npm run test`                       | all pass                     |
| Build     | `npm run build`                      | exit 0 (needs env vars)      |

## Scope

**In scope** (the only files you should modify):
- `src/app/api/v1/cron/finance-overdue/route.ts` (create)
- `src/app/app/financeiro/mensalidades/page.tsx` (remove line 52 call)
- `vercel.json` (add cron entry)

**Out of scope** (do NOT touch, even though they look related):
- `src/lib/finance/service.ts` — the service logic is correct; do not modify
- `src/lib/finance/repository.ts` — no changes needed
- Other cron routes — follow their pattern but don't modify them
- `initializeMonthAction` on the same page — separate concern

## Git workflow

- Branch: `advisor/010-auto-mark-overdue-cron`
- Commit message style: `fix(perf): move autoMarkOverdue from page load to cron`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the cron route

Create `src/app/api/v1/cron/finance-overdue/route.ts` following the pattern in `src/app/api/v1/cron/lgpd-retention/route.ts`:

```ts
import { authorizeCronRequest } from '@/lib/cron/auth';
import { jsonError, jsonOk, jsonMethodNotAllowed } from '@/lib/integrations/http';
import { autoMarkOverduePaymentsService } from '@/lib/finance/service';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['GET'] as const;
const log = createLogger('cron:finance-overdue');

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const startTime = performance.now();

  try {
    log.info('Running autoMarkOverduePayments...');
    const count = await autoMarkOverduePaymentsService();
    const elapsed = Math.round(performance.now() - startTime);

    log.info('autoMarkOverduePayments completed.', {
      transitioned: count,
      duration_ms: elapsed,
    });

    return jsonOk(
      { status: 'ok', transitioned: count, duration: `${elapsed}ms` },
      { requestId: authorization.requestId },
    );
  } catch (error) {
    const elapsed = Math.round(performance.now() - startTime);
    log.error('autoMarkOverduePayments failed.', {
      error: error instanceof Error ? error.message : String(error),
      duration_ms: elapsed,
    });

    return jsonError(500, 'internal_error', 'autoMarkOverduePayments failed.', {
      requestId: authorization.requestId,
    });
  }
}

export async function POST(request: Request) {
  return jsonMethodNotAllowed(ALLOWED_METHODS, {
    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}

export async function PUT(request: Request) {
  return jsonMethodNotAllowed(ALLOWED_METHODS, {
    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}

export async function DELETE(request: Request) {
  return jsonMethodNotAllowed(ALLOWED_METHODS, {
    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}
```

**Verify**: `npm run typecheck` → exit 0

### Step 2: Remove the page-load call

In `src/app/app/financeiro/mensalidades/page.tsx`, **remove line 52**:
```ts
await autoMarkOverduePaymentsService();
```

Also remove the now-unused import on line 2:
```ts
import { autoMarkOverduePaymentsService } from '@/lib/finance/service';
```

**Verify**: `npm run typecheck` → exit 0 (no dangling imports)

### Step 3: Add the cron entry to vercel.json

Add to the `crons` array in `vercel.json`:
```json
{
  "path": "/api/v1/cron/finance-overdue",
  "schedule": "0 2 * * *"
}
```

Place it before the gmail-watch entry (which runs weekly). The resulting order should be:
1. `0 2 * * *` finance-overdue (new)
2. `0 2 * * 0` gmail-watch (weekly, Sundays)
3. `0 3 * * *` events/dispatch
4. `0 4 * * *` juridico/sla-warnings
5. `0 5 * * *` lgpd-retention
6. `0 6 * * *` email-triage/process

**Verify**: `cat vercel.json | python3 -m json.tool` → valid JSON, 6 cron entries

### Step 4: Run quality gates

```bash
npm run lint        # → exit 0
npm run typecheck   # → exit 0
npm run test        # → all pass
```

## Test plan

- No new unit tests needed for the cron route itself — it's a thin wrapper around `autoMarkOverduePaymentsService` which is already tested by the service tests.
- If you want to add a test for the route, follow `src/app/api/v1/cron/gmail-watch/route.test.ts` as the pattern: mock `@/lib/finance/service`, mock `@/lib/env`, test GET with valid/invalid bearer.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test` exits 0
- [ ] `grep -rn "autoMarkOverduePaymentsService" src/app/app/` returns no matches (removed from page)
- [ ] `src/app/api/v1/cron/finance-overdue/route.ts` exists and exports GET
- [ ] `vercel.json` contains `finance-overdue` in crons array
- [ ] No files outside the in-scope list are modified (`git status`)

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- `autoMarkOverduePaymentsService` has side effects that require page-level context (it doesn't — it uses the global `db` client).

## Maintenance notes

- If the finance-overdue cron needs to run more frequently in the future (e.g., hourly), change the schedule in `vercel.json`. The Vercel Free plan limits to once/day.
- The service is idempotent: running it twice just returns 0 the second time.
- If a "manual trigger" UI is later desired, keep the service import but expose it through a server action, not a page-load call.
