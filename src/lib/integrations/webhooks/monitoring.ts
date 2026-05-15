import { db } from '@/lib/db';
import { webhookDeliveries, webhookSubscriptions } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export interface FailedDeliverySummary {
  id: number;
  eventType: number;
  subscriptionName: string;
  targetUrl: string;
  attempt: number;
  statusCode: number | null;
  failureReason: string | null;
  failedAt: Date | null;
}

export async function getFailedDeliveries(limit = 50): Promise<FailedDeliverySummary[]> {
  return db
    .select({
      id: webhookDeliveries.id,
      eventType: webhookDeliveries.domainEventId,
      subscriptionName: webhookSubscriptions.name,
      targetUrl: webhookSubscriptions.targetUrl,
      attempt: webhookDeliveries.attempt,
      statusCode: webhookDeliveries.statusCode,
      failureReason: webhookDeliveries.failureReason,
      failedAt: webhookDeliveries.failedAt,
    })
    .from(webhookDeliveries)
    .innerJoin(
      webhookSubscriptions,
      eq(webhookDeliveries.webhookSubscriptionId, webhookSubscriptions.id),
    )
    .where(eq(webhookDeliveries.status, 'failed'))
    .orderBy(desc(webhookDeliveries.failedAt))
    .limit(limit);
}