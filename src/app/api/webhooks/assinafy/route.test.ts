import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const { mockHandleWebhookEvent, mockLogger } = vi.hoisted(() => ({
  mockHandleWebhookEvent: vi.fn(),
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/assinafy/service', () => ({ handleWebhookEvent: mockHandleWebhookEvent }));
vi.mock('@/lib/logger', () => ({ createLogger: () => mockLogger }));

const VALID_SECRET = 'test-webhook-secret-32chars-long!!';

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    event: 'signer_signed_document',
    message: null,
    payload: { signer_full_name: 'Test signer' },
    origin: { ip: '127.0.0.1', 'user-agent': 'test' },
    created_at: Math.floor(Date.now() / 1000),
    subject: {
      id: 's1',
      full_name: 'Test signer',
      email: 'test@example.test',
      type: 'Signer',
    },
    object: { id: 'doc123', status: 'partially_signed', type: 'Document' },
    account_id: 'acc1',
    ...overrides,
  };
}

function makeRequest(body?: unknown, secret?: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (secret) headers.set('X-Webhook-Secret', secret);
  return new Request('http://localhost/api/webhooks/assinafy', {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/webhooks/assinafy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ASSINAFY_WEBHOOK_SECRET: VALID_SECRET };
    mockHandleWebhookEvent.mockResolvedValue({
      status: 'processed',
      entityId: 42,
      action: 'official_letter_status_changed',
      actorId: null,
      changedFields: ['assinafyStatus'],
    });
  });

  it('returns 503 when ASSINAFY_WEBHOOK_SECRET is not set', async () => {
    delete process.env.ASSINAFY_WEBHOOK_SECRET;
    const res = await POST(makeRequest(makeEvent(), VALID_SECRET));
    expect(res.status).toBe(503);
    expect(mockHandleWebhookEvent).not.toHaveBeenCalled();
  });

  it('returns 401 when X-Webhook-Secret header is missing or wrong', async () => {
    const missing = await POST(makeRequest(makeEvent()));
    const wrong = await POST(makeRequest(makeEvent(), 'wrong-secret'));

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(mockHandleWebhookEvent).not.toHaveBeenCalled();
  });

  it('returns 401 when the event timestamp is stale', async () => {
    const staleCreatedAt = Math.floor(Date.now() / 1000) - 700;
    const res = await POST(makeRequest(makeEvent({ created_at: staleCreatedAt }), VALID_SECRET));

    expect(res.status).toBe(401);
    expect(mockHandleWebhookEvent).not.toHaveBeenCalled();
  });

  it.each(['processed', 'duplicate', 'ignored'] as const)(
    'returns 200 for a %s service result and calls the service exactly once',
    async (status) => {
      const result =
        status === 'processed'
          ? {
              status,
              entityId: 42,
              action: 'official_letter_status_changed',
              actorId: null,
              changedFields: ['assinafyStatus'],
            }
          : { status };
      mockHandleWebhookEvent.mockResolvedValue(result);
      const event = makeEvent();

      const res = await POST(makeRequest(event, VALID_SECRET));

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ received: true });
      expect(mockHandleWebhookEvent).toHaveBeenCalledOnce();
      expect(mockHandleWebhookEvent).toHaveBeenCalledWith(event);
    },
  );

  it('returns terminal HTTP 400 for an invalid event ID without logging identifiers', async () => {
    mockHandleWebhookEvent.mockResolvedValue({ status: 'invalid' });
    const event = makeEvent({ id: null });

    const res = await POST(makeRequest(event, VALID_SECRET));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid event' });
    expect(mockHandleWebhookEvent).toHaveBeenCalledOnce();
    expect(mockLogger.warn).toHaveBeenCalledWith('Invalid Assinafy webhook event', {
      event: event.event,
    });
    expect(JSON.stringify(mockLogger.warn.mock.calls)).not.toContain('doc123');
  });

  it('temporarily preserves HTTP 200 for failed while returning a sanitized body and log', async () => {
    mockHandleWebhookEvent.mockResolvedValue({ status: 'failed' });
    const event = makeEvent();

    const res = await POST(makeRequest(event, VALID_SECRET));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: false });
    expect(mockHandleWebhookEvent).toHaveBeenCalledOnce();
    expect(mockLogger.error).toHaveBeenCalledWith('Assinafy webhook processing failed', {
      event: event.event,
    });
    const logged = JSON.stringify(mockLogger.error.mock.calls);
    expect(logged).not.toContain('doc123');
    expect(logged).not.toContain('test@example.test');
  });

  it('returns generic HTTP 500 when the service rejects unexpectedly', async () => {
    mockHandleWebhookEvent.mockRejectedValue(new Error('sensitive failure detail'));
    const event = makeEvent();

    const res = await POST(makeRequest(event, VALID_SECRET));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Internal server error' });
    expect(mockLogger.error).toHaveBeenCalledWith('Unexpected Assinafy webhook handler failure', {
      event: event.event,
    });
    const logged = JSON.stringify(mockLogger.error.mock.calls);
    expect(logged).not.toContain('sensitive failure detail');
    expect(logged).not.toContain('doc123');
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new Request('http://localhost/api/webhooks/assinafy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': VALID_SECRET },
      body: 'not-json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockHandleWebhookEvent).not.toHaveBeenCalled();
  });
});

describe('GET /api/webhooks/assinafy', () => {
  it('returns 405 on non-POST methods', async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
