# Plan 011: Finance `autoMarkOverduePaymentsService` — emit inside tx

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 874ed21..HEAD -- src/lib/finance/service.ts`
> If changed, compare against live code; on mismatch, STOP. (Re-stamped @874ed21: #266 landed —
> `logAuditAction` moved outside the tx in sibling services, but `autoMarkOverduePaymentsService`
> was NOT touched by #266; its post-commit `Promise.allSettled(emitDomainEvent)` bug at line 97
> still exists. `cancelMonthlyPayment` exemplar moved from line 343 → line 327.)

## Status

- **Priority**: P2 | **Effort**: S | **Risk**: LOW
- **Depends on**: `advisor-plans/001-outbox-atomicity-test.md` (recommended — the rollback characterization guards this refactor; not strictly required)
- **Category**: correctness | **Planned at**: `844df3b`, 2026-06-30 (re-stamped: rewrote away the ADR 018 dependency — see Maintenance notes; re-stamped again @`874ed21` after #266 landed — line refs refreshed, premise confirmed) | **Issue**: [#249](https://github.com/prof-ramos/intranet/issues/249)

## Why this matters

The transactional outbox invariant is: **the event row exists iff the mutating
transaction commits.** `autoMarkOverduePaymentsService` violates this: it runs
`db.transaction` (transitioning payments `pendente → atrasado` + writing audit
rows), returns `events`, and only **after** commit emits them with the default
`db` (no tx):
```ts
const emitResults = await Promise.allSettled(events.map(({ event }) => emitDomainEvent(event)));
```
If the process dies between commit and emit, events are lost — overdue payments
transitioned but no `monthly_payment.updated` webhook fires. The fix: emit
`emitDomainEvent(event, tx)` **inside** the tx, so the event row commits (or
rolls back) with the mutation. Post-commit, optionally fire-and-forget the
dispatch so webhooks are sent promptly; the daily cron `/api/v1/events/dispatch`
remains the safety net regardless.

This is self-justifying (outbox invariant) — it does not depend on any
uncommitted ADR. The same file already has the canonical shape:
`cancelMonthlyPayment` at `src/lib/finance/service.ts:343` calls
`emitDomainEvent({ type: 'monthly_payment.updated', ... }, tx)` inside its
`db.transaction`.

## Current state (verified at commit `874ed21`)

`src/lib/finance/service.ts:48-110` — `autoMarkOverduePaymentsService` (signature `(): Promise<number>`):
- line 49: `const { transitioned, events } = await db.transaction(async (tx) => {...})`.
- inside the tx: `markOverduePaymentsForAudit(tx)` (line 50), `tx.insert(auditLogs).values(...)` (line 54), and construction of `domainEvents` (lines 70-88, plain objects — **no emit inside the tx**).
- line 97 (post-commit): `const emitResults = await Promise.allSettled(events.map(({ event }) => emitDomainEvent(event)))` — emits with default `db`, no `tx`. This is the bug. (Lines 98-103 log failures via `logger.error` with `failedCount`/`totalCount` — PII-free.)
- line 109: `const count = transitioned.length;` — the function returns `count` (a `number`). Callers consume the count, not the events.

Exemplar (same file, commit `874ed21`) — `cancelMonthlyPayment` at
`src/lib/finance/service.ts:327` (its `db.transaction` opens at line 287):
```ts
    // Outbox invariant: emitDomainEvent MUST stay inside the tx.   // ← line 326
    await emitDomainEvent(                                            // ← line 327
      { type: 'monthly_payment.updated', entityType: 'monthly_payment', entityId: updatedPayment.id, actorAdminId: adminId, payload: { /* … */ } },
      tx,   // ← inside the tx; this is the shape to copy
    );
```

`dispatchDomainEventById` is defined at `src/lib/integrations/webhooks/service.ts:307`
(`export async function dispatchDomainEventById(eventId: number)`) and used at
`src/app/api/v1/events/route.ts:134` (`await dispatchDomainEventById(body.eventId)`).
The cron route `/api/v1/events/dispatch` calls `dispatchPendingDomainEvents`
(`webhooks/service.ts:329`) to drain stuck events — it remains the safety net.
**Note (post-#267):** `dispatchDomainEventById` and `dispatchClaimedEvent` now call
`dispatchEventToSubscriptions(event, db)` directly (no `db.transaction` wrapper — #267
removed it). So the Step 2 fire-and-forget `void dispatchDomainEventById(id)` no longer
holds a tx during fetches — even safer.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Unit tests | `npx vitest run src/lib/finance/service.test.ts` | pass |
| Validate | `npm run validate:quick` | exit 0 |

## Scope

**In scope**: `src/lib/finance/service.ts` + `src/lib/finance/service.test.ts`.
**Out of scope**: `cancelMonthlyPayment`'s audit issue (plan 002 covers that);
webhook dispatch internals; the cron route.

## Steps

### Step 1: Move emits inside the tx

The function signature is `autoMarkOverduePaymentsService(): Promise<number>` and it
returns `count = transitioned.length` (line 109). **Preserve that signature** — callers
consume the count. Only the internals change.

Inside the `db.transaction` callback, after building `domainEvents` (lines 70-88), emit
each one with `tx` and collect the inserted ids; return both from the tx callback so the
ids escape the tx for the post-commit dispatch:
```ts
const emittedEventIds: number[] = [];
for (const { event } of domainEvents) {
  const inserted = await emitDomainEvent(event, tx);
  emittedEventIds.push(inserted.id);
}
return { transitioned: rows, eventIds: emittedEventIds };
```
Then destructure as `const { transitioned, eventIds } = await db.transaction(...)` (rename
`events` → `eventIds` in the destructure). After the tx, keep `const count = transitioned.length;`
and `return count;` unchanged.

**Confirm `emitDomainEvent`'s return shape at this commit before using `.id`**: open
`src/lib/integrations/outbox.ts` and read `emitDomainEvent`. It returns the inserted row
from `.returning()`; confirm the `.id` field name. If `emitDomainEvent` returns
`undefined` or a shape without `.id`, STOP and report; do not guess. (Step 2 dispatch
needs the id; Step 1's tx-coupling is still correct even if you can't get the id — in that
case collect nothing and skip Step 2.)

Remove the post-commit `const emitResults = await Promise.allSettled(events.map(({ event }) => emitDomainEvent(event)))` block (line 97 + the `emitFailures`/`logger.error` lines 98-103) — those emits now happen inside the tx. Keep the `logger.info('[autoMarkOverdue] Transitioned ...')` line.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Post-commit fire-and-forget dispatch (optional latency optimization)

After the tx commits, fire-and-forget `dispatchDomainEventById` per event so
webhooks send promptly without waiting for the cron:
```ts
for (const id of eventIds) {
  void dispatchDomainEventById(id).catch((e) => {
    logger.error('[autoMarkOverdue] post-commit dispatch failed', { eventId: id, error: String(e) });
  });
}
```
Import `dispatchDomainEventById` from `@/lib/integrations/webhooks/service`.
The `void … .catch(...)` fire-and-forget is intentional — the cron
`/api/v1/events/dispatch` (`dispatchPendingDomainEvents`) is the safety net
for any dispatch that fails or is skipped. If adding the dispatch is awkward
given the function's current return shape, STOP and report; emitting inside the
tx (Step 1) is the correctness fix — dispatch is an optional latency win.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Update the test

The existing test asserts the post-commit `Promise.allSettled(emitDomainEvent)`
shape. Rewrite it to:
- assert `emitDomainEvent` is called with `tx` (a sentinel) inside the
  transaction — use the `vi.hoisted()` + sentinel-executor pattern (see
  `src/lib/integrations/outbox.test.ts` for the chainable `insert → values →
  returning → Promise` mock shape, and plan 001's `txSentinel`).
- assert the post-commit dispatch (`dispatchDomainEventById`) is invoked per
  event (if Step 2 was applied) OR simply assert emits are tx-coupled (if
  Step 2 was skipped).
- assert the return value (count) is unchanged for callers.

**Verify**: `npx vitest run src/lib/finance/service.test.ts` → pass.

### Step 4: rollback characterization (optional, if plan 001 has landed)

If `src/lib/integrations/outbox.integration.test.ts` exists (plan 001 landed),
add a test: if the `autoMarkOverduePaymentsService` tx throws after emits, no
event row persists. If plan 001 has NOT landed, skip this — the outbox
integration test in plan 001 already characterizes the rollback invariant.

**Verify**: `npm run validate:quick` → exit 0.

## Test plan

- Rewrite the emit test to assert tx-coupling (`emitDomainEvent(event, tx)`).
- Pattern: the chainable sentinel mock from `src/lib/integrations/outbox.test.ts`
  (`vi.hoisted` + `insert → values → returning → Promise`).
- Verification: `npx vitest run src/lib/finance/service.test.ts` → pass.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npx vitest run src/lib/finance/service.test.ts` passes with tx-coupling assertions
- [ ] `grep -n "Promise.allSettled" src/lib/finance/service.ts` returns no matches in the
  post-commit outbox-emit shape (the post-commit `Promise.allSettled(events.map(emitDomainEvent))`
  is gone; emits are inside the tx)
- [ ] `emitDomainEvent(event, tx)` calls exist inside the `autoMarkOverduePaymentsService` tx
- [ ] `cancelMonthlyPayment`'s `emitDomainEvent(..., tx)` at ~line 327 is UNCHANGED (do not touch it)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- `emitDomainEvent`'s return shape at this commit does not expose the inserted
  `.id` (needed for post-commit dispatch) — STOP and report; do not guess the
  field name. (Step 1 emits are still correct; only Step 2 dispatch is affected.)
- `autoMarkOverduePaymentsService` returns `events` (or `transitioned`) to a
  caller that consumes them outside the tx (e.g., a cron route uses the return
  for something) — STOP; report the caller and adjust the return shape (return
  the count, not un-emitted event objects).
- The service emits multiple events per run and inline-dispatch-per-event is too
  chatty — STOP; report and rely on the cron `dispatchPendingDomainEvents` as
  the sole dispatch path (skip Step 2; Step 1 still stands).

## Maintenance notes

- Reviewer: confirm emits moved INSIDE the tx (`executor=tx`) and the dispatch
  (if added) is fire-and-forget OUTSIDE; the cron `/api/v1/events/dispatch`
  remains the safety net.
- Do NOT change `cancelMonthlyPayment`'s `emitDomainEvent(..., tx)` — that is
  already correct; plan 002 handles its audit issue separately.
- **Drift vs uncommitted work (recorded during re-stamp):** the original draft
  grounded this in "ADR 018 §2/§5" and cited `activities/service.ts` as the
  exemplar of `emitDomainEvent(..., tx)` + `void dispatchDomainEventById(...)` +
  `activities/service.test.ts:97-130` as the test pattern. At commit `844df3b`
  none of that exists: ADR 018 is uncommitted, `activities/service.ts` has no
  `emitDomainEvent`/`dispatchDomainEventById`, and `activities/service.test.ts:97-130`
  is not a tx-coupling test. The rewrite grounds the fix in the **outbox
  invariant** (self-justifying) and uses the **real** exemplar
  `cancelMonthlyPayment` @ `finance/service.ts:343` (`emitDomainEvent(..., tx)`
  inside the tx, same file) plus the real `dispatchDomainEventById` @
  `webhooks/service.ts:307`. When ADR 018 lands, a follow-up can re-reference it;
  the refactor is unchanged. See memory `feedback_advisor_plans_vs_uncommitted_work`.