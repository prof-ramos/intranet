# Plan 024: Move webhook dispatch fetches out of the DB transaction

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/integrations/webhooks/service.ts`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P2 | **Effort**: S | **Risk**: MED | **Depends on**: none
- **Category**: perf | **Planned at**: `844df3b`, 2026-06-30 (re-stamped: removed the uncommitted
  `activities/service.ts` post-commit-dispatch reference and the "pending delivery rows" design
  which does not match the code at this commit — see Maintenance notes) | **Issue**: [#262](https://github.com/prof-ramos/intranet/issues/262)

## Why this matters

`dispatchDomainEventById` and `dispatchClaimedEvent` wrap `dispatchEventToSubscriptions` in a
`db.transaction`. `dispatchEventToSubscriptions` does `Promise.allSettled` of HTTP `fetch` calls
(up to `WEBHOOK_TIMEOUT_MS` each, parallel). The DB pool is `max: 10` with
`statement_timeout: 30000` (CLAUDE.md / `src/lib/db/index.ts`). Each dispatch holds a tx AND a
pool connection for the full fetch duration; under load this exhausts the pool and other
requests queue or time out. The transactional outbox + `webhook_deliveries` retry rows already
guarantee eventual delivery, and the cron `/api/v1/events/dispatch`
(`dispatchPendingDomainEvents`) recovers stuck events — so holding a tx for the fetch adds
latency/pool-exhaustion risk for zero correctness gain.

The atomic part of dispatch is the **claim** (`claimDispatchableDomainEventById` — a single
atomic UPDATE that marks the event "processing"). The claim happens BEFORE the tx and does not
need the tx. Everything inside the tx (read subscriptions, read previous deliveries, fetch,
insert delivery outcome rows, update event delivery status) is independent statement-by-
statement work that does not require single-tx atomicity. Dropping the tx wrapper is the fix.

## Current state (verified at commit `844df3b`)

`src/lib/integrations/webhooks/service.ts` — the relevant functions:

`dispatchDomainEventById` @line 307:
```ts
export async function dispatchDomainEventById(eventId: number) {
  const event = await claimDispatchableDomainEventById(eventId);
  if (!event) {
    const existing = await getDomainEventById(eventId);
    return existing
      ? { dispatched: false, reason: 'not_dispatchable' as const }
      : { dispatched: false, reason: 'not_found' as const };
  }

  return db.transaction((tx) => dispatchEventToSubscriptions(event, tx));   // ← line 322, the bug
}
```

`dispatchClaimedEvent` @line 326 (used by the cron `dispatchPendingDomainEvents`):
```ts
async function dispatchClaimedEvent(event: Awaited<ReturnType<typeof lockAndFetchDispatchableEvents>>[number]) {
  return db.transaction((tx) => dispatchEventToSubscriptions(event, tx));   // ← line 326, same bug
}
```

`dispatchEventToSubscriptions` @line 244 (the body that fetches) — takes `executor: DbExecutor`,
reads subscriptions/previous deliveries, maps to `deliverEventToSubscription(...)`, and:
```ts
  const settled = await Promise.allSettled(dispatchPromises);   // line 292
  const results = settled.map((outcome) =>
    outcome.status === 'fulfilled' ? outcome.value : ('failed' as const),
  );
  await updateDomainEventDeliveryStatus(event.id, getOverallEventStatus(results), executor);
  return { dispatched: true as const, eventId: event.id, subscriptions: subscriptions.length, results };
```

`deliverEventToSubscription` (called per subscription) does `fetch(subscription.targetUrl, ...)`
@line 152, then `insertWebhookDelivery({...status: 'delivered'|'failed'|'retry_scheduled'...})`
with the OUTCOME — there is NO "pending" delivery row created before the fetch. Delivery rows are
outcome records, created after each fetch.

Pool config: `max: 10`, `statement_timeout: 30000` (`src/lib/db/index.ts`). `DbExecutor` type
(`typeof db | PgTransaction`) from `src/lib/db/index.ts`. `webhook_deliveries` table at
`src/lib/db/schema/integrations.ts:116`.

Test exemplar (at this commit): `src/lib/integrations/webhooks/service.test.ts` — mocks
`@/lib/integrations/webhooks/repository` (incl. `insertWebhookDelivery`,
`updateDomainEventDeliveryStatus`, `claimDispatchableDomainEventById`,
`listActiveWebhookSubscriptionsForEvent`, `listWebhookDeliveriesForEvent`), mocks `@/lib/db` with
`db.transaction: (callback) => callback(mockTx)` and a `mockTx` sentinel, and `vi.stubGlobal('fetch', vi.fn())`.
`describe('dispatchDomainEventById', ...)` @line 56 with tests @lines 106, 125, 144, 166, 186.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Unit tests (focused) | `npx vitest run src/lib/integrations/webhooks` | pass |
| Full validate | `npm run validate:quick` | exit 0 |

On macOS, prefix Node commands with `PATH="/opt/homebrew/bin:$PATH"` to avoid Next.js native
code-signing errors.

## Scope

**In scope**: `src/lib/integrations/webhooks/service.ts` (the two `db.transaction` wrappers around
`dispatchEventToSubscriptions`) + `src/lib/integrations/webhooks/service.test.ts`.

**Out of scope**:
- The outbox emit path (`emitDomainEvent` in `src/lib/integrations/outbox.ts`) — plan 001's domain.
- The retry worker / cron route internals (but the cron's call into `dispatchClaimedEvent` IS in
  scope for the wrapper removal).
- Subscription CRUD, `webhook_deliveries` schema, the `claimDispatchableDomainEventById` claim
  logic (leave it — it's the atomic part that stays).
- Any new "pending" delivery status / schema change — explicitly NOT doing this (see Maintenance notes).

## Steps

### Step 1: Drop the tx wrapper in `dispatchDomainEventById` @line 322

Replace:
```ts
  return db.transaction((tx) => dispatchEventToSubscriptions(event, tx));
```
with:
```ts
  return dispatchEventToSubscriptions(event, db);
```
`db` is the default executor (a `DbExecutor`). `dispatchEventToSubscriptions` already accepts
`executor: DbExecutor`; passing `db` makes each internal repository call auto-commit on its own
connection — no held tx across fetches.

**Verify**: `PATH="/opt/homebrew/bin:$PATH" npm run typecheck` → exit 0.

### Step 2: Drop the tx wrapper in `dispatchClaimedEvent` @line 326

Replace:
```ts
  return db.transaction((tx) => dispatchEventToSubscriptions(event, tx));
```
with:
```ts
  return dispatchEventToSubscriptions(event, db);
```

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Confirm no other tx wraps dispatch

`grep -nE "db\.transaction" src/lib/integrations/webhooks/service.ts` → confirm NO
`db.transaction((tx) => dispatchEventToSubscriptions(...))` wrappers remain. (If
`dispatchPendingDomainEvents` or any other function still wraps dispatch in a tx, apply the same
unwrap — but only for dispatch, not for the claim or any non-dispatch tx.)

**Verify**: the grep shows no `dispatchEventToSubscriptions` inside a `db.transaction`.

### Step 4: Update the tests

The existing tests mock `db.transaction` as `(callback) => callback(mockTx)`. After the refactor,
`dispatchEventToSubscriptions` is called with `db` directly (no `db.transaction`), so the
`mockTx` is no longer the executor — `db` is. Update the test mocks:

- The `db` mock must expose the repository-call surface that `dispatchEventToSubscriptions` uses
  via `executor`. Today the repository functions (`listActiveWebhookSubscriptionsForEvent`, etc.)
  are mocked at the module level (`vi.mock('@/lib/integrations/webhooks/repository', ...)`) and
  IGNORE the `executor` arg (they spread `...args`). So they keep working regardless of whether
  the executor is `mockTx` or `db`. Confirm this by re-reading the mocked repository functions:
  they accept `(...args: unknown[])` and forward to a `mockXxx` — they don't use the executor.
  Therefore the existing tests should still pass after the unwrap. Run them and confirm.
- Add ONE new test in `describe('dispatchDomainEventById', ...)` asserting the dispatch path does
  NOT wrap in a transaction: spy on `db.transaction` (the mock) and assert it is NOT called by
  `dispatchDomainEventById` for a dispatchable event. Pattern: `expect(db.transaction).not.toHaveBeenCalled()`
  after invoking `dispatchDomainEventById(eventId)` with a mocked dispatchable event. (The
  `db.transaction` mock already exists at the top of the file; add the assertion.)
- Add ONE new test asserting `fetch` is still called (dispatch still happens) for a dispatchable
  event with active subscriptions — guards against accidentally breaking dispatch. Pattern:
  `expect(vi.mocked(globalThis.fetch)).toHaveBeenCalled()`.

**Verify**: `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/lib/integrations/webhooks` → all pass.

### Step 5: full validate

**Verify**: `PATH="/opt/homebrew/bin:$PATH" npm run validate:quick` → exit 0.

## Test plan

- Update existing `dispatchDomainEventById` / `dispatchClaimedEvent` tests to reflect no-tx
  dispatch (most should pass unchanged because the repository mocks ignore the executor arg —
  confirm; fix only if a test asserts `mockTx` was passed as executor).
- New test: `db.transaction` is NOT called by `dispatchDomainEventById` (dispatch no longer wraps
  in a tx).
- New test: `fetch` IS called for a dispatchable event with active subscriptions (dispatch still
  works).
- Verification: `npx vitest run src/lib/integrations/webhooks` → all pass; `npm run validate:quick` → exit 0.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npx vitest run src/lib/integrations/webhooks` passes
- [ ] `npm run validate:quick` exits 0
- [ ] `grep -nE "db\.transaction\(\(tx\) => dispatchEventToSubscriptions" src/lib/integrations/webhooks/service.ts` returns no matches
- [ ] No `fetch` removed — dispatch still happens (new test asserts `fetch` is called)
- [ ] `claimDispatchableDomainEventById` is NOT modified (the atomic claim stays)
- [ ] No `webhook_deliveries` schema/status change (no new "pending" status)
- [ ] No files outside `src/lib/integrations/webhooks/service.ts` + its test modified
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- `dispatchEventToSubscriptions` relies on the wrapping tx for correctness (e.g., a rollback
  path that must atomically undo delivery-row inserts) — STOP and report; do not unwrap.
- The mocked repository functions in `service.test.ts` actually USE the `executor` arg (i.e., they
  don't ignore it) — STOP and report; the tests will need deeper restructuring.
- Removing the tx changes the event's `delivery_status` semantics (e.g.,
  `updateDomainEventDeliveryStatus` no longer commits atomically with the inserts) in a way that
  breaks a documented invariant — STOP; report and keep the event-status update in a tiny tx
  (only the fetches move out, not the status update).
- The cron `dispatchPendingDomainEvents` path has additional tx logic beyond
  `dispatchClaimedEvent` that depends on the tx — STOP and report.

## Maintenance notes

- Reviewer: the invariant to protect is "the atomic CLAIM stays" (`claimDispatchableDomainEventById`
  or `lockAndFetchDispatchableEvents` for the cron). The fetches and delivery-row inserts do NOT
  need a single tx — they are independent, and the cron recovers stuck events. Confirm no tx
  wraps `dispatchEventToSubscriptions` after the refactor.
- The cron `/api/v1/events/dispatch` (`dispatchPendingDomainEvents`) remains the safety net for
  any dispatch that fails mid-flight (event stuck in "processing" is recovered by
  `recoverStuckProcessingEvents`).
- **Drift vs the original plan (recorded during re-stamp):** the original draft referenced
  "pattern: `activities/service.ts` post-commit dispatch" and proposed enqueuing
  `webhook_deliveries` rows with `status: 'pending'` in-tx, then fetching post-commit. At commit
  `844df3b` neither exists: `activities/service.ts` has no `emitDomainEvent`/`dispatchDomainEventById`
  (that's uncommitted ADR 018 work), and `webhook_deliveries` rows are OUTCOME records created
  AFTER each fetch (there is no 'pending' row today — introducing one would be a schema change,
  out of scope for a perf plan). The re-stamp grounds the fix in the real code: drop the
  `db.transaction` wrappers at `webhooks/service.ts:322` and `:326`, keep the atomic claim. This
  is a much smaller, schema-free refactor that achieves the perf goal (no pool conn held during
  fetches). See memory `feedback_advisor_plans_vs_uncommitted_work`.
- This interacts with plan 015 (webhooks integration test) — land 015's webhooks test first if
  possible, so this refactor has a regression net. Not a hard dependency.