import { isPublicWebhookUrl } from '@/lib/validation/schemas';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import {
  claimDispatchableDomainEventById,
  getDomainEventById,
  getLastDeliveryAttemptForSubscription,
  insertWebhookDelivery,
  listActiveWebhookSubscriptionsForEvent,
  listWebhookDeliveriesForEvent,
  lockAndFetchDispatchableEvents,
  recoverStuckProcessingEvents,
  updateDomainEventDeliveryStatus,
} from '@/lib/integrations/webhooks/repository';
import { signIntegrationRequest } from '@/lib/integrations/auth';
import type { DomainEventType } from '@/lib/integrations/outbox';
import { decryptWebhookSecret } from '@/lib/integrations/webhooks/secrets';
import { sanitizePiiValue } from '@/lib/sanitize-pii';

const MAX_WEBHOOK_ATTEMPTS = 5;
const RESPONSE_EXCERPT_LIMIT = 500;
const WEBHOOK_TIMEOUT_MS = 10_000;

type DispatchDomainEventResult = Awaited<ReturnType<typeof dispatchDomainEventById>>;

function buildWebhookBody(event: Awaited<ReturnType<typeof getDomainEventById>>) {
  if (!event) {
    return null;
  }

  return {
    id: `evt_${event.id}`,
    type: event.eventType,
    occurredAt: event.occurredAt.toISOString(),
    entity: {
      type: event.entityType,
      id: event.entityId,
    },
    actor: {
      adminId: event.actorAdminId,
    },
    data: sanitizePiiValue(event.payload),
  };
}

function buildPathWithQuery(targetUrl: string): string {
  try {
    const url = new URL(targetUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return '/';
  }
}

function sanitizeResponseExcerpt(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const sanitized = value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[redacted-cpf]');

  return sanitized.length > RESPONSE_EXCERPT_LIMIT
    ? sanitized.slice(0, RESPONSE_EXCERPT_LIMIT)
    : sanitized;
}

function isRetryableStatus(statusCode: number | null): boolean {
  if (statusCode == null) {
    return true;
  }

  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

function calculateNextRetryAt(attempt: number): Date {
  const delayMinutes = Math.min(2 ** (attempt - 1), 60);
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

function getOverallEventStatus(results: Array<'delivered' | 'retry_scheduled' | 'failed'>) {
  if (results.length === 0 || results.every((result) => result === 'delivered')) {
    return 'delivered' as const;
  }

  if (results.some((result) => result === 'retry_scheduled')) {
    return results.some((result) => result === 'delivered')
      ? ('partially_delivered' as const)
      : ('pending' as const);
  }

  if (results.some((result) => result === 'delivered')) {
    return 'partially_delivered' as const;
  }

  return 'failed' as const;
}

async function deliverEventToSubscription(
  eventId: number,
  eventType: DomainEventType,
  subscription: Awaited<ReturnType<typeof listActiveWebhookSubscriptionsForEvent>>[number],
  body: string,
  attempt: number,
  executor: Pick<import('@/lib/db').Tx, 'insert' | 'update' | 'select' | 'execute'>,
) {
  // F-001 fix: Re-validate webhook target URL at dispatch time to prevent SSRF
  // if the URL was modified in the database after creation.
  if (!isPublicWebhookUrl(subscription.targetUrl)) {
    const failureReason = `Webhook target URL failed security validation: ${subscription.targetUrl}`;
    console.error('[webhook] ' + failureReason);
    await insertWebhookDelivery({
      domainEventId: eventId,
      webhookSubscriptionId: subscription.id,
      attempt,
      requestId: `ssrf-blocked-${subscription.id}`,
      idempotencyKey: `ssrf-blocked-${eventId}:${subscription.id}`,
      status: 'failed',
      statusCode: null,
      responseExcerpt: null,
      failedAt: new Date(),
      failureReason,
    }, executor);
    return 'failed' as const;
  }

  const idempotencyKey = `${eventId}:${subscription.id}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const requestId = randomUUID();
  const pathWithQuery = buildPathWithQuery(subscription.targetUrl);
  const webhookSecret = decryptWebhookSecret(subscription.secretCiphertext);
  const signature = signIntegrationRequest(
    {
      method: 'POST',
      pathWithQuery,
      timestamp,
      body,
    },
    webhookSecret,
  );

  let statusCode: number | null = null;
  let responseExcerpt: string | null = null;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(subscription.targetUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'user-agent': 'asof-intranet-webhooks/1.0',
        'idempotency-key': idempotencyKey,
        'x-asof-event-type': eventType,
        'x-asof-timestamp': timestamp,
        'x-asof-signature': `sha256=${signature}`,
        'x-request-id': requestId,
      },
      body,
      signal: abortController.signal,
    });

    statusCode = response.status;
    responseExcerpt = sanitizeResponseExcerpt(await response.text());

    if (response.ok) {
      await insertWebhookDelivery({
        domainEventId: eventId,
        webhookSubscriptionId: subscription.id,
        attempt,
        requestId,
        idempotencyKey,
        status: 'delivered',
        statusCode,
        responseExcerpt,
        deliveredAt: new Date(),
      }, executor);

      return 'delivered' as const;
    }
  } catch (error) {
    responseExcerpt = sanitizeResponseExcerpt(
      error instanceof Error ? error.message : 'unknown error',
    );
  } finally {
    clearTimeout(timeout);
  }

  const shouldRetry = attempt < MAX_WEBHOOK_ATTEMPTS && isRetryableStatus(statusCode);
  const failureReason = shouldRetry
    ? null
    : attempt >= MAX_WEBHOOK_ATTEMPTS
      ? `Max retry attempts (${MAX_WEBHOOK_ATTEMPTS}) exhausted.`
      : `Non-retryable HTTP status ${statusCode}.`;

  await insertWebhookDelivery({
    domainEventId: eventId,
    webhookSubscriptionId: subscription.id,
    attempt,
    requestId,
    idempotencyKey,
    status: shouldRetry ? 'retry_scheduled' : 'failed',
    statusCode,
    responseExcerpt,
    nextRetryAt: shouldRetry ? calculateNextRetryAt(attempt) : null,
    failedAt: shouldRetry ? null : new Date(),
    failureReason,
  }, executor);

  return shouldRetry ? ('retry_scheduled' as const) : ('failed' as const);
}

export async function dispatchDomainEventById(eventId: number) {
  const event = await claimDispatchableDomainEventById(eventId);
  if (!event) {
    const existing = await getDomainEventById(eventId);
    return existing
      ? {
          dispatched: false,
          reason: 'not_dispatchable' as const,
        }
      : {
          dispatched: false,
          reason: 'not_found' as const,
        };
  }

  return db.transaction(async (tx) => {
    const bodyEnvelope = buildWebhookBody(event);
    const body = JSON.stringify(bodyEnvelope);
    const subscriptions = await listActiveWebhookSubscriptionsForEvent(event.eventType, tx);
    const previousDeliveries = await listWebhookDeliveriesForEvent(event.id, tx);

    if (subscriptions.length === 0) {
      await updateDomainEventDeliveryStatus(event.id, 'delivered', tx);
      return {
        dispatched: true as const,
        eventId: event.id,
        subscriptions: 0,
        results: [] as Array<'delivered' | 'retry_scheduled' | 'failed'>,
      };
    }

    const dispatchPromises = subscriptions.map(async (subscription) => {
      const previous = getLastDeliveryAttemptForSubscription(previousDeliveries, subscription.id);
      if (previous?.status === 'delivered') {
        return 'delivered' as const;
      }

      if (
        previous?.status === 'retry_scheduled' &&
        previous.nextRetryAt &&
        previous.nextRetryAt.getTime() > Date.now()
      ) {
        return 'retry_scheduled' as const;
      }

      if (previous?.status === 'failed' && previous.attempt >= MAX_WEBHOOK_ATTEMPTS) {
        return 'failed' as const;
      }

      const attempt = (previous?.attempt ?? 0) + 1;
      return deliverEventToSubscription(
        event.id,
        event.eventType,
        subscription,
        body,
        attempt,
        tx,
      );
    });

    const settled = await Promise.allSettled(dispatchPromises);
    const results = settled.map((outcome) =>
      outcome.status === 'fulfilled' ? outcome.value : ('failed' as const),
    );

    await updateDomainEventDeliveryStatus(event.id, getOverallEventStatus(results), tx);

    return {
      dispatched: true as const,
      eventId: event.id,
      subscriptions: subscriptions.length,
      results,
    };
  });
}

export async function dispatchPendingDomainEvents(limit = 20) {
  // Recover events stuck in "processing" status (e.g. if a dispatcher crashed)
  await recoverStuckProcessingEvents();

  // Atomically lock and claim dispatchable events using FOR UPDATE SKIP LOCKED
  // so concurrent dispatchers do not double-process the same events.
  const pendingEvents = await lockAndFetchDispatchableEvents(limit);
  const results: DispatchDomainEventResult[] = [];

  for (const event of pendingEvents) {
    results.push(await dispatchDomainEventById(event.id));
  }

  return {
    processed: pendingEvents.length,
    results,
  };
}
