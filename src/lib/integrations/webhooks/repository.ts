import { and, asc, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { db, type DbExecutor } from '@/lib/db';
import {
  domainEvents,
  webhookDeliveries,
  webhookSubscriptions,
  type DomainEvent,
  type NewWebhookSubscription,
  type WebhookDelivery,
  type WebhookSubscription,
} from '@/lib/db/schema/integrations';
import type { DomainEventType } from '@/lib/integrations/outbox';

/** Default retention period for delivered webhook records before cleanup. */
const DELIVERED_RECORD_RETENTION_DAYS = 30;


export async function getDomainEventById(id: number, executor: DbExecutor = db): Promise<DomainEvent | null> {
  const [event] = await executor
    .select()
    .from(domainEvents)
    .where(eq(domainEvents.id, id))
    .limit(1);
  return event ?? null;
}

export async function listDispatchableDomainEvents(
  limit = 20,
  executor: DbExecutor = db,
): Promise<DomainEvent[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error('limit must be an integer between 1 and 1000.');
  }

  return executor
    .select()
    .from(domainEvents)
    .where(inArray(domainEvents.deliveryStatus, ['pending', 'partially_delivered', 'failed']))
    .orderBy(asc(domainEvents.occurredAt))
    .limit(limit);
}

export async function listActiveWebhookSubscriptionsForEvent(
  eventType: DomainEventType,
  executor: DbExecutor = db,
): Promise<WebhookSubscription[]> {
  return executor
    .select()
    .from(webhookSubscriptions)
    .where(
      sql`${webhookSubscriptions.isActive} = true and ${webhookSubscriptions.subscribedEvents} @> ${JSON.stringify([eventType])}::jsonb`,
    )
    .orderBy(asc(webhookSubscriptions.id));
}

export async function listWebhookSubscriptions(
  executor: DbExecutor = db,
): Promise<WebhookSubscription[]> {
  return executor
    .select()
    .from(webhookSubscriptions)
    .orderBy(desc(webhookSubscriptions.createdAt), asc(webhookSubscriptions.id));
}

export async function getWebhookSubscriptionById(
  id: number,
  executor: DbExecutor = db,
): Promise<WebhookSubscription | null> {
  const [subscription] = await executor
    .select()
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.id, id))
    .limit(1);
  return subscription ?? null;
}

export async function insertWebhookSubscription(
  values: NewWebhookSubscription,
  executor: DbExecutor = db,
) {
  const [subscription] = await executor.insert(webhookSubscriptions).values(values).returning();
  return subscription;
}

export async function updateWebhookSubscriptionById(
  id: number,
  values: Partial<Pick<WebhookSubscription, 'name' | 'targetUrl' | 'subscribedEvents' | 'isActive' | 'secretCiphertext'>>,
  executor: DbExecutor = db,
) {
  const [subscription] = await executor
    .update(webhookSubscriptions)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(webhookSubscriptions.id, id))
    .returning();
  return subscription ?? null;
}

export async function listWebhookDeliveriesForEvent(
  domainEventId: number,
  executor: DbExecutor = db,
): Promise<WebhookDelivery[]> {
  return executor
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.domainEventId, domainEventId))
    .orderBy(asc(webhookDeliveries.webhookSubscriptionId), asc(webhookDeliveries.attempt));
}

export async function insertWebhookDelivery(
  values: typeof webhookDeliveries.$inferInsert,
  executor: DbExecutor = db,
) {
  const [delivery] = await executor.insert(webhookDeliveries).values(values).returning();
  return delivery;
}

export async function updateDomainEventDeliveryStatus(
  id: number,
  status: DomainEvent['deliveryStatus'],
  executor: DbExecutor = db,
) {
  await executor
    .update(domainEvents)
    .set({
      deliveryStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(domainEvents.id, id));
}

export function getLastDeliveryAttemptForSubscription(
  deliveries: WebhookDelivery[],
  webhookSubscriptionId: number,
): WebhookDelivery | null {
  const matching = deliveries.filter((delivery) => delivery.webhookSubscriptionId === webhookSubscriptionId);
  return matching.at(-1) ?? null;
}

/**
 * Recover events stuck in "processing" status for longer than the threshold.
 * Resets them to "pending" so they can be picked up by the next dispatch cycle.
 * Call this BEFORE listing dispatchable events to prevent events from being
 * permanently stuck if a dispatcher crashed mid-processing.
 */
export async function recoverStuckProcessingEvents(
  stuckThresholdMinutes = 10,
  executor: DbExecutor = db,
) {
  const cutoff = new Date(Date.now() - stuckThresholdMinutes * 60 * 1000);
  return executor
    .update(domainEvents)
    .set({ deliveryStatus: 'pending', updatedAt: new Date() })
    .where(
      and(
        eq(domainEvents.deliveryStatus, 'processing'),
        lt(domainEvents.updatedAt, cutoff),
      ),
    );
}

/**
 * Atomically lock and fetch dispatchable domain events using
 * SELECT ... FOR UPDATE SKIP LOCKED, then mark them as "processing".
 * This prevents multiple concurrent dispatchers from claiming the same events.
 *
 * Drizzle ORM does not natively support FOR UPDATE SKIP LOCKED,
 * so we use a raw SQL UPDATE ... RETURNING approach that achieves
 * the same result in a single atomic statement.
 */
export async function lockAndFetchDispatchableEvents(
  limit = 20,
  executor: DbExecutor = db,
): Promise<DomainEvent[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error('limit must be an integer between 1 and 1000.');
  }

  const rows = await executor.execute<DomainEvent>(sql`
    UPDATE domain_events
    SET delivery_status = 'processing',
        updated_at = now()
    WHERE id IN (
      SELECT id FROM domain_events
      WHERE delivery_status IN ('pending', 'partially_delivered', 'failed')
      ORDER BY occurred_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  // Drizzle's execute() returns a RowList<T> which extends Array<T>;
  // cast to DomainEvent[] for a clean public return type.
  return rows as DomainEvent[];
}

export async function claimDispatchableDomainEventById(
  id: number,
  executor: DbExecutor = db,
): Promise<DomainEvent | null> {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('id must be a positive integer.');
  }

  const rows = await executor.execute<DomainEvent>(sql`
    UPDATE domain_events
    SET delivery_status = 'processing',
        updated_at = now()
    WHERE id = ${id}
      AND delivery_status IN ('pending', 'partially_delivered', 'failed')
    RETURNING *
  `);

  return (rows as DomainEvent[])[0] ?? null;
}

/**
 * Retrieve domain events whose overall delivery status is "failed",
 * meaning all subscriptions have permanently failed (exhausted retries
 * or received a non-retryable status). These events form the dead-letter
 * queue and can be inspected or replayed by operators.
 */
export async function getFailedEvents(
  limit = 50,
  executor: DbExecutor = db,
): Promise<DomainEvent[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error('limit must be an integer between 1 and 1000.');
  }

  return executor
    .select()
    .from(domainEvents)
    .where(eq(domainEvents.deliveryStatus, 'failed'))
    .orderBy(desc(domainEvents.occurredAt))
    .limit(limit);
}

/**
 * Remove webhook delivery records for successfully delivered events
 * that are older than the retention period. This keeps the deliveries
 * table from growing unboundedly while preserving recent and failed records
 * for debugging and potential replay.
 *
 * Returns the number of deleted rows.
 */
export async function cleanUpOldDeliveries(
  retentionDays: number = DELIVERED_RECORD_RETENTION_DAYS,
  executor: DbExecutor = db,
): Promise<number> {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error('retentionDays must be a positive integer.');
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await executor
    .delete(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.status, 'delivered'),
        lt(webhookDeliveries.createdAt, cutoff),
      ),
    )
    .returning({ id: webhookDeliveries.id });

  return result.length;
}
