import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dispatchDomainEventById,
  dispatchPendingDomainEvents,
} from '@/lib/integrations/webhooks/service';
import { db } from '@/lib/db';

const mockGetDomainEventById = vi.fn();
const mockClaimDispatchableDomainEventById = vi.fn();
const mockListActiveWebhookSubscriptionsForEvent = vi.fn();
const mockListWebhookDeliveriesForEvent = vi.fn();
const mockInsertWebhookDelivery = vi.fn();
const mockUpdateDomainEventDeliveryStatus = vi.fn();
const mockDecryptWebhookSecret = vi.fn();
const mockRecoverStuckProcessingEvents = vi.fn();
const mockLockAndFetchDispatchableEvents = vi.fn();
const mockResolvePublicWebhookTarget = vi.fn();
const mockSendPinnedWebhook = vi.fn();

vi.mock('@/lib/integrations/webhooks/validation', () => ({
  resolvePublicWebhookTarget: (...args: unknown[]) => mockResolvePublicWebhookTarget(...args),
}));

vi.mock('@/lib/integrations/webhooks/transport', () => ({
  sendPinnedWebhook: (...args: unknown[]) => mockSendPinnedWebhook(...args),
}));

vi.mock('@/lib/integrations/webhooks/repository', () => ({
  claimDispatchableDomainEventById: (...args: unknown[]) =>
    mockClaimDispatchableDomainEventById(...args),
  getDomainEventById: (...args: unknown[]) => mockGetDomainEventById(...args),
  listActiveWebhookSubscriptionsForEvent: (...args: unknown[]) =>
    mockListActiveWebhookSubscriptionsForEvent(...args),
  listWebhookDeliveriesForEvent: (...args: unknown[]) => mockListWebhookDeliveriesForEvent(...args),
  insertWebhookDelivery: (...args: unknown[]) => mockInsertWebhookDelivery(...args),
  updateDomainEventDeliveryStatus: (...args: unknown[]) =>
    mockUpdateDomainEventDeliveryStatus(...args),
  recoverStuckProcessingEvents: (...args: unknown[]) => mockRecoverStuckProcessingEvents(...args),
  lockAndFetchDispatchableEvents: (...args: unknown[]) =>
    mockLockAndFetchDispatchableEvents(...args),
  getLastDeliveryAttemptForSubscription: (
    deliveries: Array<{ webhookSubscriptionId: number }>,
    webhookSubscriptionId: number,
  ) =>
    deliveries
      .filter((delivery) => delivery.webhookSubscriptionId === webhookSubscriptionId)
      .at(-1) ?? null,
}));

vi.mock('@/lib/integrations/webhooks/secrets', () => ({
  decryptWebhookSecret: (...args: unknown[]) => mockDecryptWebhookSecret(...args),
}));

const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  execute: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn((callback: (tx: typeof mockTx) => Promise<unknown>) => callback(mockTx)),
  },
}));

describe('dispatchDomainEventById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecryptWebhookSecret.mockReturnValue('webhook-secret');
    mockResolvePublicWebhookTarget.mockResolvedValue({
      url: 'https://example.com/webhook',
      hostname: 'example.com',
      addresses: [{ address: '93.184.216.34', family: 4 }],
    });
    mockClaimDispatchableDomainEventById.mockResolvedValue({
      id: 99,
      eventType: 'associate.updated',
      occurredAt: new Date('2026-05-14T12:00:00.000Z'),
      entityType: 'associate',
      entityId: 10,
      actorAdminId: 1,
      payload: {
        associateId: 10,
        changedFields: ['assignment'],
        links: { app: '/app/associados/10' },
      },
    });
    mockGetDomainEventById.mockResolvedValue({
      id: 99,
      eventType: 'associate.updated',
      occurredAt: new Date('2026-05-14T12:00:00.000Z'),
      entityType: 'associate',
      entityId: 10,
      actorAdminId: 1,
      payload: {
        associateId: 10,
        changedFields: ['assignment'],
        links: { app: '/app/associados/10' },
      },
    });
    mockListActiveWebhookSubscriptionsForEvent.mockResolvedValue([
      {
        id: 5,
        targetUrl: 'https://example.com/webhook',
        secretCiphertext: 'enc:v1:test',
      },
    ]);
  });

  it('does not redeliver a subscription that already succeeded', async () => {
    mockListWebhookDeliveriesForEvent.mockResolvedValue([
      {
        webhookSubscriptionId: 5,
        attempt: 1,
        status: 'delivered',
        nextRetryAt: null,
      },
    ]);

    const result = await dispatchDomainEventById(99);

    expect(result).toMatchObject({
      dispatched: true,
      subscriptions: 1,
      results: ['delivered'],
    });
    expect(mockSendPinnedWebhook).not.toHaveBeenCalled();
    expect(mockInsertWebhookDelivery).not.toHaveBeenCalled();
    expect(mockUpdateDomainEventDeliveryStatus).toHaveBeenLastCalledWith(99, 'delivered', db);
  });

  it('returns not_dispatchable when the event exists but cannot be claimed', async () => {
    mockClaimDispatchableDomainEventById.mockResolvedValue(null);
    mockGetDomainEventById.mockResolvedValue({
      id: 99,
      deliveryStatus: 'processing',
    });

    const result = await dispatchDomainEventById(99);

    expect(result).toEqual({
      dispatched: false,
      reason: 'not_dispatchable',
    });
    expect(mockSendPinnedWebhook).not.toHaveBeenCalled();
  });

  it('waits until nextRetryAt before retrying scheduled failures', async () => {
    mockListWebhookDeliveriesForEvent.mockResolvedValue([
      {
        webhookSubscriptionId: 5,
        attempt: 1,
        status: 'retry_scheduled',
        nextRetryAt: new Date(Date.now() + 60_000),
      },
    ]);

    const result = await dispatchDomainEventById(99);

    expect(result).toMatchObject({
      dispatched: true,
      subscriptions: 1,
      results: ['retry_scheduled'],
    });
    expect(mockSendPinnedWebhook).not.toHaveBeenCalled();
    expect(mockInsertWebhookDelivery).not.toHaveBeenCalled();
    expect(mockUpdateDomainEventDeliveryStatus).toHaveBeenLastCalledWith(99, 'pending', db);
  });

  it('does not retry failed deliveries after the maximum attempts', async () => {
    mockListWebhookDeliveriesForEvent.mockResolvedValue([
      {
        webhookSubscriptionId: 5,
        attempt: 5,
        status: 'failed',
        nextRetryAt: null,
      },
    ]);

    const result = await dispatchDomainEventById(99);

    expect(result).toMatchObject({
      dispatched: true,
      subscriptions: 1,
      results: ['failed'],
    });
    expect(mockSendPinnedWebhook).not.toHaveBeenCalled();
    expect(mockInsertWebhookDelivery).not.toHaveBeenCalled();
    expect(mockUpdateDomainEventDeliveryStatus).toHaveBeenLastCalledWith(99, 'failed', db);
  });

  it('records failureReason when delivery permanently fails with non-retryable status', async () => {
    mockListWebhookDeliveriesForEvent.mockResolvedValue([]);
    mockSendPinnedWebhook.mockResolvedValue({
      ok: false,
      status: 403,
      type: 'basic',
      body: 'Forbidden',
    });

    const result = await dispatchDomainEventById(99);

    expect(result).toMatchObject({ dispatched: true, results: ['failed'] });
    expect(mockInsertWebhookDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        failureReason: 'Non-retryable HTTP status 403.',
        failedAt: expect.any(Date),
      }),
      db,
    );
  });

  it('records failureReason when delivery exhausts max retry attempts', async () => {
    mockListWebhookDeliveriesForEvent.mockResolvedValue([
      {
        webhookSubscriptionId: 5,
        attempt: 4,
        status: 'retry_scheduled',
        nextRetryAt: new Date(Date.now() - 60_000),
      },
    ]);
    mockSendPinnedWebhook.mockResolvedValue({
      ok: false,
      status: 503,
      type: 'basic',
      body: 'Service Unavailable',
    });

    const result = await dispatchDomainEventById(99);

    // attempt 5 (4+1), which equals MAX_WEBHOOK_ATTEMPTS, should fail permanently
    expect(result).toMatchObject({ dispatched: true, results: ['failed'] });
    expect(mockInsertWebhookDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        failureReason: 'Max retry attempts (5) exhausted.',
        failedAt: expect.any(Date),
      }),
      db,
    );
  });

  it('fails dispatch when webhook target URL fails SSRF validation', async () => {
    mockListActiveWebhookSubscriptionsForEvent.mockResolvedValue([
      {
        id: 5,
        targetUrl: 'http://127.0.0.1:8080/webhook',
        secretCiphertext: 'enc:v1:test',
      },
    ]);
    mockListWebhookDeliveriesForEvent.mockResolvedValue([]);
    mockResolvePublicWebhookTarget.mockResolvedValueOnce(null);

    const result = await dispatchDomainEventById(99);

    expect(result).toMatchObject({ dispatched: true, results: ['failed'] });
    expect(mockSendPinnedWebhook).not.toHaveBeenCalled();
    expect(mockInsertWebhookDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        failureReason:
          'Webhook target URL failed security validation: http://127.0.0.1:8080/webhook',
        failedAt: expect.any(Date),
      }),
      db,
    );
  });

  it('does not wrap dispatch in a db.transaction', async () => {
    mockListWebhookDeliveriesForEvent.mockResolvedValue([]);

    await dispatchDomainEventById(99);

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('sends through the pinned transport for a dispatchable event', async () => {
    mockListWebhookDeliveriesForEvent.mockResolvedValue([]);
    mockSendPinnedWebhook.mockResolvedValue({
      ok: true,
      status: 200,
      type: 'basic',
      body: 'OK',
    });

    await dispatchDomainEventById(99);

    expect(mockSendPinnedWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'example.com',
        addresses: [{ address: '93.184.216.34', family: 4 }],
      }),
      expect.objectContaining({ redirect: 'manual' }),
    );
  });
});

describe('dispatchPendingDomainEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecoverStuckProcessingEvents.mockResolvedValue(undefined);
    mockLockAndFetchDispatchableEvents.mockResolvedValue([]);
  });

  it('recovers stuck processing events before dispatching', async () => {
    mockLockAndFetchDispatchableEvents.mockResolvedValue([]);

    await dispatchPendingDomainEvents();

    expect(mockRecoverStuckProcessingEvents).toHaveBeenCalledTimes(1);
  });

  it('uses lockAndFetchDispatchableEvents instead of listDispatchableDomainEvents', async () => {
    mockLockAndFetchDispatchableEvents.mockResolvedValue([]);

    await dispatchPendingDomainEvents(50);

    expect(mockLockAndFetchDispatchableEvents).toHaveBeenCalledWith(50);
  });

  it('dispatches each locked event and returns aggregated results', async () => {
    const event1 = {
      id: 1,
      eventType: 'associate.updated' as const,
      occurredAt: new Date('2026-05-14T12:00:00.000Z'),
      entityType: 'associate' as const,
      entityId: 10,
      actorAdminId: 1,
      payload: {},
    };
    const event2 = {
      id: 2,
      eventType: 'associate.updated' as const,
      occurredAt: new Date('2026-05-14T12:01:00.000Z'),
      entityType: 'associate' as const,
      entityId: 20,
      actorAdminId: 1,
      payload: {},
    };

    mockLockAndFetchDispatchableEvents.mockResolvedValue([event1, event2]);
    mockListActiveWebhookSubscriptionsForEvent.mockResolvedValue([]);
    mockUpdateDomainEventDeliveryStatus.mockResolvedValue(undefined);

    const result = await dispatchPendingDomainEvents();

    expect(result.processed).toBe(2);
    expect(result.results).toEqual([
      { dispatched: true, eventId: 1, subscriptions: 0, results: [] },
      { dispatched: true, eventId: 2, subscriptions: 0, results: [] },
    ]);
    expect(mockClaimDispatchableDomainEventById).not.toHaveBeenCalled();
    expect(mockUpdateDomainEventDeliveryStatus).toHaveBeenCalledWith(1, 'delivered', db);
    expect(mockUpdateDomainEventDeliveryStatus).toHaveBeenCalledWith(2, 'delivered', db);
  });

  it('returns empty results when no events are dispatchable', async () => {
    mockLockAndFetchDispatchableEvents.mockResolvedValue([]);

    const result = await dispatchPendingDomainEvents();

    expect(result).toEqual({ processed: 0, results: [] });
    expect(mockClaimDispatchableDomainEventById).not.toHaveBeenCalled();
  });
});
