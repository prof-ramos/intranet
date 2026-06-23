# Plan 018: Move Assinafy webhook idempotency guard inside the DB transaction

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 93ab643..HEAD -- src/lib/assinafy/service.ts src/lib/assinafy/repository.ts`
> If either file changed since this plan was written, re-read them before
> proceeding; on a mismatch with the excerpts, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

`src/lib/assinafy/service.ts` reads the current `assinafyStatus` with
`findOficioByAssinafyDocumentId(documentId)` at line 35 **outside** any transaction,
then checks `previousStatus === mappedStatus` at line 44 as an idempotency guard
before opening a `db.transaction()`. Two concurrent Assinafy retries of the same
event (common with Assinafy's retry policy) can both read the old status, both pass
the guard, and both enter the transaction — running the update, emitting the domain
event, and inserting per-admin notifications twice. The `dedupeKey` on notifications
helps dedupe if the schema enforces it with a UNIQUE constraint, but the double
domain-event emission is not deduplicated.

Fixing this requires re-reading the status **inside** the transaction so the
idempotency check happens under row-level locking.

## Current state

`src/lib/assinafy/service.ts` — full `handleWebhookEvent`:

```ts
// src/lib/assinafy/service.ts:25-47
export async function handleWebhookEvent(event: AssinafyWebhookEvent) {
  const { event: eventName, object } = event;
  const documentId = object.id;

  const mappedStatus = EVENT_STATUS_MAP[eventName];
  if (!mappedStatus) { /* ... */ return null; }

  const oficio = await findOficioByAssinafyDocumentId(documentId); // ← outside tx
  if (!oficio) { /* ... */ return null; }

  const previousStatus = oficio.assinafyStatus;

  // Idempotency guard: same status written twice (Assinafy retry) → no-op
  if (previousStatus === mappedStatus) { /* ... */ return oficio; } // ← race window

  // ... build additionalFields ...

  try {
    const result = await db.transaction(async (tx) => {
      const updated = await updateAssinafyStatus(oficio.id, mappedStatus, additionalFields, tx);
      // ... emit domain event, audit log, notifications ...
      return updated;
    });
    // ...
    return result;
  } catch (error) { /* ... */ return null; }
}
```

`src/lib/assinafy/repository.ts` — `findOficioByAssinafyDocumentId` must be checked
to confirm it accepts a `DbExecutor` parameter (a transaction executor). Check
whether it currently accepts `executor: DbExecutor = db` or is hardcoded to `db`.

`src/lib/db/index.ts` exports the `DbExecutor` type used throughout this repo:
```ts
// pattern used in other services:
export type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
```

## Commands you will need

| Purpose       | Command                                                         | Expected on success |
|---------------|-----------------------------------------------------------------|---------------------|
| Typecheck     | `npm run typecheck`                                             | exit 0              |
| Test (scoped) | `npm run test -- src/lib/assinafy/service.test.ts`              | all pass            |
| Lint          | `npm run lint`                                                  | exit 0              |

## Scope

**In scope**:
- `src/lib/assinafy/service.ts`
- `src/lib/assinafy/repository.ts` (only to add executor parameter to `findOficioByAssinafyDocumentId` if missing)

**Out of scope** (do NOT touch):
- `src/app/api/webhooks/assinafy/route.ts` — the route handler; no change needed there
- Any test files initially (update if existing tests break)

## Git workflow

- Branch: `advisor/018-assinafy-webhook-toctou`
- Commits: 1–2 (one for repository change if needed, one for service)
- Message: `fix(assinafy): move idempotency guard inside transaction to prevent duplicate webhook processing`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Confirm `findOficioByAssinafyDocumentId` accepts an executor

Read `src/lib/assinafy/repository.ts` and find `findOficioByAssinafyDocumentId`.

**Case A — already accepts executor (like `findAssignmentById(id, executor = db)`):**
No change to repository needed. Proceed to Step 2.

**Case B — hardcoded to `db`:**
Add an `executor: DbExecutor = db` parameter, following the pattern used in
`src/lib/assignments/repository.ts` or `src/lib/associates/repository.ts`:

```ts
export async function findOficioByAssinafyDocumentId(
  documentId: string,
  executor: DbExecutor = db,
) {
  return executor.select(...)
    .from(oficios)
    .where(eq(oficios.assinafyDocumentId, documentId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}
```

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Move the outer read + idempotency guard inside the transaction

Restructure `handleWebhookEvent` so the read happens inside `db.transaction`:

```ts
export async function handleWebhookEvent(event: AssinafyWebhookEvent) {
  const { event: eventName, object } = event;
  const documentId = object.id;

  const mappedStatus = EVENT_STATUS_MAP[eventName];
  if (!mappedStatus) {
    logger.info('Unknown webhook event, ignoring', { eventName, documentId });
    return null;
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Re-read inside the transaction to prevent TOCTOU race on concurrent retries.
      const oficio = await findOficioByAssinafyDocumentId(documentId, tx);
      if (!oficio) {
        logger.warn('Ofício not found for assinafy document', { documentId, eventName });
        return null;
      }

      const previousStatus = oficio.assinafyStatus;

      // Idempotency guard — inside tx, so no concurrent retry can pass simultaneously.
      if (previousStatus === mappedStatus) {
        logger.info('Duplicate webhook event, status unchanged', {
          documentId, eventName, status: mappedStatus,
        });
        return oficio;
      }

      // ... existing additionalFields logic unchanged ...
      const additionalFields: Record<string, unknown> = {};
      // (copy the if-blocks for additionalFields from the original code here)

      const updated = await updateAssinafyStatus(oficio.id, mappedStatus, additionalFields, tx);

      await emitDomainEvent({ /* ... same as before ... */ }, tx);

      try {
        await logAuditAction({ /* ... same as before ... */ executor: tx });
      } catch {
        logger.error('Audit log failed (non-critical, inside transaction)', { oficioId: oficio.id });
      }

      const activeAdmins = await tx.select({ id: admins.id }).from(admins).where(eq(admins.isActive, true));
      if (activeAdmins.length > 0) {
        const notifications = activeAdmins.map((admin) => ({ /* ... same as before ... */ }));
        await createNotificationsBatch(notifications, tx);
      }

      return updated;
    });

    if (result) {
      logger.info('Assinafy status updated', {
        documentId, eventName,
      });
    }
    return result;
  } catch (error) {
    logger.error('Failed to update assinafy status', {
      documentId, eventName,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
```

Key changes:
1. The outer `findOficioByAssinafyDocumentId` call is removed.
2. The read + guard move inside `db.transaction`.
3. `emitDomainEvent` is now called **inside** the transaction (it already accepted a
   `tx` executor before — verify this is the case in the live code; if `emitDomainEvent`
   does not accept a tx, keep it outside but accept the existing race on that call).

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Run the service tests

**Verify**: `npm run test -- src/lib/assinafy/service.test.ts` → all pass.

If a test explicitly sets up the idempotency guard by calling `findOficioByAssinafyDocumentId`
BEFORE the transaction mock — it will need updating to return the oficio from within
the transaction mock instead. Adjust the test mock accordingly.

## Test plan

Check `src/lib/assinafy/service.test.ts` for an existing test covering the
idempotency guard. If present, update it to reflect the new read-inside-tx structure.

Add one new test if the existing suite doesn't cover it:
```
it('returns the oficio without side effects when a concurrent retry arrives with the same status', async () => {
  // mock: findOficioByAssinafyDocumentId (inside tx) returns { assinafyStatus: 'certificating' }
  // event: document_signed → mappedStatus = 'certificating'
  // expectation: updateAssinafyStatus NOT called, emitDomainEvent NOT called
```

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test -- src/lib/assinafy/service.test.ts` passes
- [ ] `npm run lint` exits 0
- [ ] `grep -n "findOficioByAssinafyDocumentId" src/lib/assinafy/service.ts` shows only one call site, inside the `db.transaction` callback
- [ ] No call to `findOficioByAssinafyDocumentId` exists outside the transaction in the function
- [ ] `plans/README.md` status row updated

## STOP conditions

- `findOficioByAssinafyDocumentId` uses a feature (e.g. `FOR UPDATE` lock, streaming)
  that is incompatible with the transaction executor — investigate before proceeding.
- `emitDomainEvent` does not accept a `tx` executor — keep it outside the transaction
  (as before) and document the accepted limitation in the commit message.
- Any existing service test fails and the failure is not due to the mock needing
  an update as described above.

## Maintenance notes

- The real protection against replay is the `dedupeKey` unique constraint on
  notifications (if enforced). Confirm via `src/lib/db/schema/notifications.ts`
  whether `dedupeKey` has a UNIQUE index — if not, add one as a follow-up migration.
- Moving the read inside the transaction increases the lock hold time slightly.
  This is acceptable for a webhook handler that processes at most one event at a time
  per document.
