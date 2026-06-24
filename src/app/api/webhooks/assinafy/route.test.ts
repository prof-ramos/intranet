import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';

const {
  mockHandleWebhookEvent,
  mockLimit,
  mockInsert,
  mockOnConflictDoNothing,
  mockSelect,
} = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockOnConflictDoNothing = vi.fn();
  const mockValues = vi.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return {
    mockHandleWebhookEvent: vi.fn(),
    mockLimit,
    mockInsert,
    mockSelect,
    mockOnConflictDoNothing,
  };
});

vi.mock('@/lib/assinafy/service', () => ({
  handleWebhookEvent: mockHandleWebhookEvent,
}));

vi.mock('@/lib/db', () => ({
  db: { select: mockSelect, insert: mockInsert },
}));

const VALID_SECRET = 'test-webhook-secret-32chars-long!!';

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    event: 'signer_signed_document',
    message: null,
    payload: { signer_full_name: 'João' },
    origin: { ip: '127.0.0.1', 'user-agent': 'Mozilla/5.0' },
    created_at: Math.floor(Date.now() / 1000),
    subject: { id: 's1', full_name: 'João', email: 'j@x.com', type: 'Signer' },
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
    process.env = { ...originalEnv };
    mockHandleWebhookEvent.mockResolvedValue({ id: 1 });
    mockLimit.mockResolvedValue([]); // no existing nonce by default
    mockOnConflictDoNothing.mockResolvedValue(undefined);
  });

  it('returns 503 when ASSINAFY_WEBHOOK_SECRET is not set', async () => {
    delete process.env.ASSINAFY_WEBHOOK_SECRET;
    const res = await POST(makeRequest(makeEvent(), VALID_SECRET));
    expect(res.status).toBe(503);
  });

  it('returns 401 when X-Webhook-Secret header is missing', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    const res = await POST(makeRequest(makeEvent()));
    expect(res.status).toBe(401);
  });

  it('returns 401 when X-Webhook-Secret is wrong', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    const res = await POST(makeRequest(makeEvent(), 'wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when event timestamp is stale', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    const staleCreatedAt = Math.floor(Date.now() / 1000) - 700;
    const res = await POST(makeRequest(makeEvent({ created_at: staleCreatedAt }), VALID_SECRET));
    expect(res.status).toBe(401);
    expect(mockHandleWebhookEvent).not.toHaveBeenCalled();
  });

  it('returns 200 on valid event and records nonce', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    const event = makeEvent();
    const res = await POST(makeRequest(event, VALID_SECRET));
    expect(res.status).toBe(200);
    expect(mockHandleWebhookEvent).toHaveBeenCalledWith(event);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('returns 200 on unknown event (no-op) and records nonce', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    mockHandleWebhookEvent.mockResolvedValue(null);
    const res = await POST(makeRequest(makeEvent({ event: 'unknown_event' }), VALID_SECRET));
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('returns 200 on duplicate delivery without reprocessing', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    mockLimit.mockResolvedValue([{ id: 999 }]); // nonce already exists
    const res = await POST(makeRequest(makeEvent(), VALID_SECRET));
    expect(res.status).toBe(200);
    expect(mockHandleWebhookEvent).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns 500 when handler fails (signals retry to Assinafy)', async () => {
    process.env.ASSINAFY_WEBHOOK_SECRET = VALID_SECRET;
    mockHandleWebhookEvent.mockRejectedValue(new Error('DB connection failed'));
    const res = await POST(makeRequest(makeEvent(), VALID_SECRET));
    expect(res.status).toBe(500);
    expect(mockInsert).not.toHaveBeenCalled(); // nonce not recorded on failure
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
