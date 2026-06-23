# Plan 021: Bulk audit-log inserts and parallel domain-event emission in autoMarkOverdue

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 93ab643..HEAD -- src/lib/finance/service.ts`
> If the file changed since this plan was written, re-read it before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug / perf
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

`autoMarkOverduePaymentsService` in `src/lib/finance/service.ts` processes overdue
payments as a cron job. It has two sequential loops that scale linearly with the
number of payments:

1. **Inside the transaction**: a `for...of` loop calls `logSystemOverdueTransition`
   per payment — each call issues one DB `INSERT` to `audit_logs`. For N payments
   this is N sequential round-trips holding the transaction open.

2. **After the transaction**: a `for...of` loop with `await emitDomainEvent(event)`
   per payment — sequential, not parallelised. If one emission fails (transient DB
   error), the loop rejects, subsequent payments never get their events emitted, and
   the cron call rejects — even though the transaction for those payments already committed.

Replacing the sequential loops with a single bulk insert (audit) and
`Promise.allSettled` (events) reduces lock hold time, eliminates the partial-failure
data loss, and makes the cron idempotent in the face of event-emission failures.

## Current state

`src/lib/finance/service.ts` lines 48–91:

```ts
export async function autoMarkOverduePaymentsService(): Promise<number> {
  const { transitioned, events } = await db.transaction(async (tx) => {
    const rows = await markOverduePaymentsForAudit(tx);

    // ← Sequential: N round-trips inside transaction
    for (const payment of rows) {
      await logSystemOverdueTransition(payment, tx);
    }

    const domainEvents = rows.map((payment) => ({ event: { /* ... */ } }));

    return { transitioned: rows, events: domainEvents };
  });

  // ← Sequential: a mid-loop failure drops remaining events silently
  for (const { event } of events) {
    await emitDomainEvent(event);
  }

  const count = transitioned.length;
  if (count > 0) {
    logger.info('[autoMarkOverdue] Transitioned payments pendente → atrasado', { count });
  }
  return count;
}
```

`logSystemOverdueTransition` (lines 94–117) builds an audit log entry and calls
`db.insert(auditLogs).values(changes)`. Check whether it already accepts an executor
parameter or is hardcoded to `db` — if hardcoded, it cannot be called inside a
transaction.

## Commands you will need

| Purpose       | Command                                                           | Expected on success |
|---------------|-------------------------------------------------------------------|---------------------|
| Typecheck     | `npm run typecheck`                                               | exit 0              |
| Test (scoped) | `npm run test -- src/lib/finance/service.test.ts`                 | all pass            |
| Lint          | `npm run lint`                                                    | exit 0              |

## Scope

**In scope**:
- `src/lib/finance/service.ts`

**Out of scope** (do NOT touch):
- `src/lib/finance/repository.ts`
- `src/app/api/v1/cron/overdue-payments/route.ts`
- Any test file unless an existing test breaks

## Git workflow

- Branch: `advisor/021-finance-bulk-audit-events`
- Single commit; message: `perf(finance): bulk audit-log insert and Promise.allSettled for domain events in autoMarkOverdue`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Audit `logSystemOverdueTransition`

Read `src/lib/finance/service.ts` lines 94–120 to confirm:
- Whether `logSystemOverdueTransition` accepts a `DbExecutor` parameter.
- Whether it calls `db.insert(auditLogs).values(...)` directly or calls
  `logAuditAction` from `src/lib/audit/service.ts`.

**Case A — it calls `logAuditAction({ ..., executor: tx })`:**
`logAuditAction` already accepts an executor, so bulk insert is possible by
collecting the data and calling `tx.insert(auditLogs).values(allPayloads)` once.

**Case B — it calls `db.insert(auditLogs).values(...)` hardcoded to `db`:**
Add an `executor: DbExecutor = db` parameter before refactoring.

Document which case applies in your commit message.

### Step 2: Replace the sequential audit-log loop with a bulk insert

Inside the transaction, replace:

```ts
for (const payment of rows) {
  await logSystemOverdueTransition(payment, tx);
}
```

With a single bulk insert. Collect the payload array first, then insert once:

```ts
// Collect all audit payloads
const auditPayloads = rows.map((payment) => ({
  action: 'monthly_payment_overdue' as const,   // match the existing action string
  entityType: 'monthly_payment' as const,
  entityId: payment.id,
  adminId: null,
  performedBy: null,
  changes: {
    old: { status: 'pendente' },
    new: { status: 'atrasado' },
  },
  metadata: {
    actorType: 'system',
    associateId: payment.associateId,
    year: payment.year,
    month: payment.month,
  },
}));

if (auditPayloads.length > 0) {
  await tx.insert(auditLogs).values(auditPayloads);
}
```

Adapt the exact field names and `action` string to match what `logSystemOverdueTransition`
currently inserts — read the live function before writing the bulk payload.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Replace the sequential event-emission loop with `Promise.allSettled`

After the transaction, replace:

```ts
for (const { event } of events) {
  await emitDomainEvent(event);
}
```

With:

```ts
const emitResults = await Promise.allSettled(events.map(({ event }) => emitDomainEvent(event)));
const emitFailures = emitResults.filter((r) => r.status === 'rejected');
if (emitFailures.length > 0) {
  logger.error('[autoMarkOverdue] Some domain events failed to emit', {
    failedCount: emitFailures.length,
    totalCount: events.length,
  });
}
```

This ensures:
- All events are attempted regardless of individual failures.
- Failures are logged (not silently discarded) without aborting the function.
- The cron's return value (the count) is unaffected by event-emission failures.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Run service tests

**Verify**: `npm run test -- src/lib/finance/service.test.ts` → all pass.

If an existing test asserts that `emitDomainEvent` was called exactly N times
sequentially, update it to assert `Promise.allSettled` semantics (called N times
concurrently). The mock interface (`vi.fn()`) does not distinguish sequential vs.
concurrent — the assertions should be the same.

## Test plan

Check `src/lib/finance/service.test.ts` for an `autoMarkOverduePaymentsService` test.
It should already exist (the cron endpoint test references this service).

Add one new test if not present:
```
it('logs a failure for individual event emissions without throwing', async () => {
  // mock: markOverduePaymentsForAudit returns 2 payments
  // mock: emitDomainEvent rejects for the first payment
  // expectation: service resolves to 2 (count); logger.error called once
```

This validates the partial-failure behaviour introduced in Step 3.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test -- src/lib/finance/service.test.ts` passes
- [ ] `npm run lint` exits 0
- [ ] `grep "for.*of.*events" src/lib/finance/service.ts` returns no matches (sequential loop removed)
- [ ] `grep "Promise.allSettled" src/lib/finance/service.ts` returns one match
- [ ] `grep "\.insert.*auditLogs.*\.values" src/lib/finance/service.ts` shows exactly one bulk insert call
- [ ] Only `src/lib/finance/service.ts` is modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- `logSystemOverdueTransition` calls `logAuditAction` with a different field set than
  expected — read the live function and adapt the bulk payload in Step 2, rather than
  guessing the field names.
- The `auditLogs` table schema does not accept `.values([...array...])` (e.g. has
  NOT NULL columns with DB-generated defaults that Drizzle doesn't handle in bulk) —
  fall back to the sequential loop and limit the change to Step 3 only; document the
  limitation.
- `emitDomainEvent` has a documented requirement to be called sequentially (e.g. it
  enforces ordering guarantees via a serial queue) — check its implementation before
  parallelising; if ordering matters, keep the sequential loop but wrap in try/catch.

## Maintenance notes

- The `autoMarkOverduePaymentsService` cron runs periodically. If the batch size
  grows very large (hundreds of payments), consider adding a chunk limit
  (e.g. process at most 100 per cron run) to bound the lock window.
- The `Promise.allSettled` failure-logging introduced in Step 3 feeds the outbox
  retry mechanism indirectly (via logger). If critical — i.e. undelivered overdue
  events block downstream automations — consider persisting failures to the outbox
  for retry instead of just logging.
