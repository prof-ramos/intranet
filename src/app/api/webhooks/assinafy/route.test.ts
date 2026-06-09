import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';

const { mockHandleWebhookEvent } = vi.hoisted(() => ({
  mockHandleWebhookEvent: vi.fn(),
}));

vi.mock('@/lib/assinafy/service', () => ({
  handleWebhookEvent: mockHandleWebhookEvent,
}));

const VALID_SECRET = 'test-webhook-secret-32chars-long!!';
const VALID_EVENT = {
  id: 1,
  event: 'signer_signed_document',
  message: null,
  payload: { signer_full_name: 'João' },
  origin: { ip: '127.0.0.1', 'user-agent': 'Mozilla/5.0' },
  created_at: 1705312200,
  subject: { id: 's1', full_name: 'João', email: 'j@x.com', type: 'Signer' },
  object: { id: 'doc123', status: 'partially_signed', type: 'Document' },
  account_id: 'acc1',
};

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
    process.env = { ...originalEnv };
    mockHandleWebhookEvent.mockResolvedValue({ id: 1 });
  });

  it('returns 503 when ASSINAFY_WEBHOOK_SECRET is not set', async () => {
    delete process.env.ASSINAFY_WEBHOOK_SECRET;
    const req = makeRequest(VALID_EVENT, VALID_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('returns 401 when X-Webhook-Secret header is missing', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    const req = makeRequest(VALID_EVENT);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when X-Webhook-Secret is wrong', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    const req = makeRequest(VALID_EVENT, 'wrong-secret');
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 on valid event', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    const req = makeRequest(VALID_EVENT, VALID_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockHandleWebhookEvent).toHaveBeenCalledWith(VALID_EVENT);
  });

  it('returns 200 on unknown event (no-op)', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    mockHandleWebhookEvent.mockResolvedValue(null);
    const event = { ...VALID_EVENT, event: 'unknown_event' };
    const req = makeRequest(event, VALID_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('returns 500 when DB update fails (signals retry to Assinafy)', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    mockHandleWebhookEvent.mockRejectedValue(new Error('DB connection failed'));
    const req = makeRequest(VALID_EVENT, VALID_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('returns 400 on invalid JSON body', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    const req = new Request('http://localhost/api/webhooks/assinafy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': VALID_SECRET },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/webhooks/assinafy', () => {
  it('returns 405 on non-POST methods', async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
