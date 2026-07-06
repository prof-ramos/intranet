# Plan 009: Batch notification inserts in Assinafy webhook handler

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7178dd5..HEAD -- src/lib/assinafy/service.ts src/lib/notifications/repository.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: performance
- **Planned at**: commit `7178dd5`, 2026-06-10
- **Issue**: https://github.com/prof-ramos/intranet/issues/164

## Why this matters

The `handleWebhookEvent` function in `src/lib/assinafy/service.ts` creates notifications for all active admins inside a `db.transaction()` using a `for` loop with individual `await createNotification(...)` calls (lines 113-129). If there are N active admins, the transaction makes N+1 round-trips to the database (1 query to fetch admins + N inserts). With ~50 active admins and multiple webhook events per document lifecycle, this adds latency and holds the transaction open longer. Batched inserts reduce this to 1 round-trip regardless of admin count.

## Current state

- `src/lib/assinafy/service.ts` — Lines 108-129, inside `db.transaction`:

```typescript
      const activeAdmins = await tx
        .select({ id: admins.id })
        .from(admins)
        .where(eq(admins.isActive, true));

      for (const admin of activeAdmins) {
        await createNotification(
          {
            userId: admin.id,
            actorId: null,
            type: 'oficio.status_changed',
            title: 'Status do ofício alterado',
            message: `O ofício ${oficio.number} (${oficio.recipient}) teve o status alterado para ${mappedStatus}.`,
            href: `/app/secretaria/oficios/${oficio.id}`,
            entityType: 'oficio',
            entityId: oficio.id,
            metadata: { previousStatus, newStatus: mappedStatus, documentId },
            dedupeKey: `oficio.status_changed:${oficio.id}:${mappedStatus}`,
          },
          tx,
        );
      }
```

- `src/lib/notifications/repository.ts` — exports `createNotification` which does a single `tx.insert(...)` per call.

- Repo conventions: Multi-row inserts use Drizzle's `db.insert(table).values([...])` with an array of values. See existing patterns in `src/lib/associates/` for batching.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Lint      | `npm run lint`           | exit 0              |
| Tests     | `npm run test`           | all pass            |

## Scope

**In scope**:
- `src/lib/assinafy/service.ts`
- `src/lib/notifications/repository.ts`
- `src/lib/assinafy/service.test.ts` (update existing tests)

**Out of scope**:
- Other callers of `createNotification` — not affected if the single-insert function is kept.
- The `createNotification` function itself if we add a batch variant (depends on approach).

## Git workflow

- Branch: `advisor/009-assinafy-notification-batch`
- Commit per step or per logical unit; message style: `perf(assinafy): batch notification inserts in webhook handler`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Choose the approach

Two options:

**A) Add a `createNotifications` batch function** in `src/lib/notifications/repository.ts`:
```typescript
export async function createNotifications(
  notifications: Array<InsertNotification>,
  tx: Transaction,
): Promise<void> {
  await tx.insert(notifications).values(notifications);
}
```

**B) Inline the batch insert** directly in `assinafy/service.ts`, skipping the repository layer.

Option A is preferred — it keeps the notification insert logic in the repository layer and is reusable by other modules.

### Step 2: Add createNotifications to repository

In `src/lib/notifications/repository.ts`, add a new exported function:

```typescript
import { notifications } from '@/lib/db/schema'; // adjust import as needed
import type { Transaction } from 'drizzle-orm';  // adjust type as needed

export async function createNotifications(
  items: Array<{
    userId: number;
    actorId: number | null;
    type: string;
    title: string;
    message: string;
    href: string | null;
    entityType: string;
    entityId: number;
    metadata: Record<string, unknown> | null;
    dedupeKey: string | null;
  }>,
  tx: Transaction,
): Promise<void> {
  if (items.length === 0) return;
  await tx.insert(notifications).values(items.map(item => ({
    ...item,
    readAt: null,
    createdAt: new Date(),
  })))
  .onConflictDoNothing({
    target: [notifications.userId, notifications.dedupeKey],
    where: sql`${notifications.dedupeKey} is not null`,
  });
}
```

Do NOT pre-serialize `metadata` with `JSON.stringify` — Drizzle handles jsonb serialization for `notifications.metadata`. The `.onConflictDoNothing()` matches the existing `createNotification` dedup pattern for the `(userId, dedupeKey)` unique index.

(The exact types and import paths depend on the schema — read `src/lib/db/schema/notifications.ts` to confirm.)

**Verify**: `npm run typecheck` → exit 0

### Step 3: Replace the for loop with a batch call

In `src/lib/assinafy/service.ts`, replace lines 113-129:

```typescript
      const notificationItems = activeAdmins.map((admin) => ({
        userId: admin.id,
        actorId: null as number | null,
        type: 'oficio.status_changed' as const,
        title: 'Status do ofício alterado',
        message: `O ofício ${oficio.number} (${oficio.recipient}) teve o status alterado para ${mappedStatus}.`,
        href: `/app/secretaria/oficios/${oficio.id}`,
        entityType: 'oficio' as const,
        entityId: oficio.id,
        metadata: { previousStatus, newStatus: mappedStatus, documentId },
        dedupeKey: `oficio.status_changed:${oficio.id}:${mappedStatus}`,
      }));

      await createNotifications(notificationItems, tx);
```

**Verify**: `npm run typecheck` → exit 0

### Step 4: Run tests

**Verify**: `npm run test` → all pass (including `src/lib/assinafy/service.test.ts`)

## Test plan

- Existing tests for `handleWebhookEvent` in `src/lib/assinafy/service.test.ts` should continue to pass.
- If the mock for `createNotification` needs updating (because the function signature changed or was renamed), update the mock in `service.test.ts` accordingly.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0
- [ ] No `for` loop over `activeAdmins` calling `createNotification` individually in `src/lib/assinafy/service.ts`
- [ ] A batch insert function exists in `src/lib/notifications/repository.ts`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
- The `notifications` table schema requires fields not accounted for (read `src/lib/db/schema/notifications.ts` before implementing)
- A step's verification fails twice after a reasonable fix attempt
- The transaction type (`Transaction`) from Drizzle is not importable or unrecognized — check the import pattern used by existing exports in `repository.ts`

## Maintenance notes

- The `InsertNotification` type (or equivalent) should be exported from the schema or repository for type safety.
- This batch function can be reused by any other module that needs to create multiple notifications at once.
