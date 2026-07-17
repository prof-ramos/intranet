import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash, createHmac } from 'node:crypto';

// --- Hoisted mocks ---
const {
  mockGetIntegrationConfig,
  mockIsIntegrationAuthConfigured,
  mockFindActiveApiKeyByHash,
  mockUpdateApiKeyLastUsed,
  mockDecryptIntegrationSigningSecret,
  mockLoggerWarn,
  mockNonceSelectResult,
  mockNonceInsertResult,
} = vi.hoisted(() => ({
  mockGetIntegrationConfig: vi.fn(),
  mockIsIntegrationAuthConfigured: vi.fn(),
  mockFindActiveApiKeyByHash: vi.fn(),
  mockUpdateApiKeyLastUsed: vi.fn(),
  mockDecryptIntegrationSigningSecret: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockNonceSelectResult: { current: [] as Array<{ id: number }> },
  mockNonceInsertResult: { current: [{ id: 1 }] as Array<{ id: number }> },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    warn: mockLoggerWarn,
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/integrations/config', () => ({
  getIntegrationConfig: mockGetIntegrationConfig,
  isIntegrationAuthConfigured: mockIsIntegrationAuthConfigured,
}));

vi.mock('@/lib/integrations/keys/repository', () => ({
  findActiveApiKeyByHash: mockFindActiveApiKeyByHash,
  updateApiKeyLastUsed: mockUpdateApiKeyLastUsed,
}));

vi.mock('@/lib/integrations/keys/signing-secrets', () => ({
  decryptIntegrationSigningSecret: mockDecryptIntegrationSigningSecret,
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/auth/authorization', () => ({
  canAccessRole: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(mockNonceSelectResult.current),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: () => Promise.resolve(mockNonceInsertResult.current),
        }),
      }),
    }),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  integrationSignatureNonces: {
    id: 'id',
    keyId: 'key_id',
    signature: 'signature',
    expiresAt: 'expires_at',
  },
}));

vi.mock('@/lib/integrations/http', () => ({
  getRequestId: vi.fn(() => 'test-request-id'),
  jsonError: vi.fn((_status: number, code: string, message: string) => ({
    status: _status,
    body: { ok: false, error: { code, message } },
  })),
}));

// Import after mocks
import { authorizeIntegrationRequest, verifyIntegrationRequest } from './verify-request';

// --- Helpers ---

const API_KEY = 'asof_verify_test_key_abc123';
const HMAC_SECRET = 'verify-test-hmac-secret-xyz';
const NOW_SECONDS = Math.floor(Date.now() / 1000);
const MAX_INTEGRATION_BODY_BYTES = 10 * 1024 * 1024;

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function computeSignature(
  method: string,
  path: string,
  timestamp: string,
  body: string,
  secret: string,
): string {
  const canonical = [method.toUpperCase(), path, timestamp, sha256Hex(body)].join('\n');
  return createHmac('sha256', secret).update(canonical).digest('hex');
}

function makeRequest(
  apiKey: string,
  timestamp: string,
  signature: string,
  options: { method?: string; url?: string; body?: string } = {},
): Request {
  const method = options.method ?? 'GET';
  const url = options.url ?? 'https://api.example.com/api/v1/events';
  const headers = new Headers();
  headers.set('x-asof-key', apiKey);
  headers.set('x-asof-timestamp', timestamp);
  headers.set('x-asof-signature', `sha256=${signature}`);

  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers });
  }
  return new Request(url, { method, headers, body: options.body ?? '' });
}

function defaultConfig(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    apiKey: API_KEY,
    hmacSecret: HMAC_SECRET,
    timestampToleranceSeconds: 300,
    ...overrides,
  };
}

// --- Tests ---

describe('verifyIntegrationRequest — valid HMAC signature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateApiKeyLastUsed.mockResolvedValue([]);
  });

  it('accepts a request with a correct HMAC signature (GET, no body)', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    const sig = computeSignature('GET', '/api/v1/events', timestamp, '', HMAC_SECRET);
    const request = makeRequest(API_KEY, timestamp, sig);

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(true);
  });

  it('accepts a POST request with a non-empty body when signature covers that body', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const body = JSON.stringify({ event: 'test' });
    const timestamp = String(NOW_SECONDS);
    const sig = computeSignature('POST', '/api/v1/webhooks', timestamp, body, HMAC_SECRET);
    const request = makeRequest(API_KEY, timestamp, sig, {
      method: 'POST',
      url: 'https://api.example.com/api/v1/webhooks',
      body,
    });

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(true);
  });

  it('accepts a signature sent without the sha256= prefix', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    const rawSig = computeSignature('GET', '/api/v1/events', timestamp, '', HMAC_SECRET);

    // Build request with bare hex signature (no "sha256=" prefix)
    const headers = new Headers();
    headers.set('x-asof-key', API_KEY);
    headers.set('x-asof-timestamp', timestamp);
    headers.set('x-asof-signature', rawSig); // no prefix
    const request = new Request('https://api.example.com/api/v1/events', { headers });

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(true);
  });
});

describe('verifyIntegrationRequest — tampered signature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateApiKeyLastUsed.mockResolvedValue([]);
  });

  it('rejects a signature where the last byte has been flipped', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    const validSig = computeSignature('GET', '/api/v1/events', timestamp, '', HMAC_SECRET);
    // Flip the last hex char by replacing it with a different nibble
    const lastChar = validSig[validSig.length - 1];
    const flipped = lastChar === 'f' ? '0' : 'f';
    const tamperedSig = validSig.slice(0, -1) + flipped;

    const request = makeRequest(API_KEY, timestamp, tamperedSig);

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_signature');
    }
  });

  it('rejects a signature computed with the wrong secret', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    const wrongSig = computeSignature('GET', '/api/v1/events', timestamp, '', 'wrong-secret');
    const request = makeRequest(API_KEY, timestamp, wrongSig);

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_signature');
    }
  });

  it('rejects when body was altered after signing', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const originalBody = '{"amount":100}';
    const alteredBody = '{"amount":999}';
    const timestamp = String(NOW_SECONDS);
    // Sign with original body, send altered body
    const sig = computeSignature('POST', '/api/v1/payments', timestamp, originalBody, HMAC_SECRET);
    const request = makeRequest(API_KEY, timestamp, sig, {
      method: 'POST',
      url: 'https://api.example.com/api/v1/payments',
      body: alteredBody,
    });

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_signature');
    }
  });
});

describe('verifyIntegrationRequest — expired timestamp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateApiKeyLastUsed.mockResolvedValue([]);
  });

  it('rejects a timestamp older than the tolerance window (> 5 min)', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const expiredTimestamp = String(NOW_SECONDS - 301); // 301 s ago, tolerance is 300
    const sig = computeSignature('GET', '/api/v1/events', expiredTimestamp, '', HMAC_SECRET);
    const request = makeRequest(API_KEY, expiredTimestamp, sig);

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('timestamp_skew');
    }
  });

  it('includes skewSeconds in the rejection details', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const expiredTimestamp = String(NOW_SECONDS - 600); // 10 min ago
    const sig = computeSignature('GET', '/api/v1/events', expiredTimestamp, '', HMAC_SECRET);
    const request = makeRequest(API_KEY, expiredTimestamp, sig);

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('timestamp_skew');
      expect(result.details).toMatchObject({
        skewSeconds: expect.any(Number),
        toleranceSeconds: 300,
      });
      if (result.details) {
        expect(result.details.skewSeconds as number).toBeGreaterThanOrEqual(600);
      }
    }
  });

  it('accepts a timestamp exactly within the tolerance window', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    // Compute fresh timestamp inside the test (not from module-load NOW_SECONDS)
    // and use 150 s margin so CI scheduling delays cannot flip the assertion.
    const nowSeconds = Math.floor(Date.now() / 1000);
    const borderTimestamp = String(nowSeconds - 150); // midpoint of 300 s window
    const sig = computeSignature('GET', '/api/v1/events', borderTimestamp, '', HMAC_SECRET);
    const request = makeRequest(API_KEY, borderTimestamp, sig);

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(true);
  });

  it('rejects a non-numeric timestamp', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const badTimestamp = 'not-a-number';
    const sig = computeSignature('GET', '/api/v1/events', badTimestamp, '', HMAC_SECRET);
    const request = makeRequest(API_KEY, badTimestamp, sig);

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_timestamp');
    }
  });
});

describe('verifyIntegrationRequest — missing headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateApiKeyLastUsed.mockResolvedValue([]);
  });

  it('rejects a request missing the signature header', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const headers = new Headers();
    headers.set('x-asof-key', API_KEY);
    headers.set('x-asof-timestamp', String(NOW_SECONDS));
    // x-asof-signature deliberately omitted
    const request = new Request('https://api.example.com/api/v1/events', { headers });

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('missing_headers');
    }
  });

  it('rejects a request missing the key header', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    const sig = computeSignature('GET', '/api/v1/events', timestamp, '', HMAC_SECRET);
    const headers = new Headers();
    headers.set('x-asof-timestamp', timestamp);
    headers.set('x-asof-signature', `sha256=${sig}`);
    // x-asof-key deliberately omitted
    const request = new Request('https://api.example.com/api/v1/events', { headers });

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('missing_headers');
    }
  });

  it('rejects a request with no integration headers at all', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const request = new Request('https://api.example.com/api/v1/events');

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('missing_headers');
    }
  });
});

describe('verifyIntegrationRequest — empty body', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateApiKeyLastUsed.mockResolvedValue([]);
  });

  it('accepts a POST request with an empty body when the signature covers empty body', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    const sig = computeSignature('POST', '/api/v1/webhooks', timestamp, '', HMAC_SECRET);
    const request = makeRequest(API_KEY, timestamp, sig, {
      method: 'POST',
      url: 'https://api.example.com/api/v1/webhooks',
      body: '',
    });

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(true);
  });

  it('rejects a POST with empty body when the signature was computed for a non-empty body', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    // Signature was computed for a non-empty body but we send an empty body
    const sig = computeSignature(
      'POST',
      '/api/v1/webhooks',
      timestamp,
      '{"data":"x"}',
      HMAC_SECRET,
    );
    const request = makeRequest(API_KEY, timestamp, sig, {
      method: 'POST',
      url: 'https://api.example.com/api/v1/webhooks',
      body: '',
    });

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_signature');
    }
  });
});

describe('verifyIntegrationRequest — body size limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateApiKeyLastUsed.mockResolvedValue([]);
  });

  it('rejects requests whose declared body size exceeds the integration limit', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    const sig = computeSignature('POST', '/api/v1/webhooks', timestamp, '', HMAC_SECRET);
    const headers = new Headers();
    headers.set('x-asof-key', API_KEY);
    headers.set('x-asof-timestamp', timestamp);
    headers.set('x-asof-signature', `sha256=${sig}`);
    headers.set('content-length', String(10 * 1024 * 1024 + 1));
    const request = new Request('https://api.example.com/api/v1/webhooks', {
      method: 'POST',
      headers,
      body: '',
    });
    const getReader = vi.spyOn(request.body!, 'getReader');

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('body_too_large');
      expect(result.details).toEqual({ limitBytes: 10 * 1024 * 1024 });
    }
    expect(getReader).not.toHaveBeenCalled();
  });

  it('accepts a chunked body at the exact byte limit without Content-Length', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const body = 'a'.repeat(MAX_INTEGRATION_BODY_BYTES);
    const timestamp = String(NOW_SECONDS);
    const signature = computeSignature('POST', '/api/v1/webhooks', timestamp, body, HMAC_SECRET);
    const firstHalf = new TextEncoder().encode(body.slice(0, body.length / 2));
    const secondHalf = new TextEncoder().encode(body.slice(body.length / 2));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(firstHalf);
        controller.enqueue(secondHalf);
        controller.close();
      },
    });
    const request = new Request('https://api.example.com/api/v1/webhooks', {
      method: 'POST',
      headers: {
        'x-asof-key': API_KEY,
        'x-asof-timestamp': timestamp,
        'x-asof-signature': `sha256=${signature}`,
      },
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.verifiedBody).toBe(body);
  });

  it('rejects and cancels a chunked body one byte above the limit', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const cancel = vi.fn();
    const timestamp = String(NOW_SECONDS);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_INTEGRATION_BODY_BYTES));
        controller.enqueue(new Uint8Array([1]));
      },
      cancel,
    });
    const request = new Request('https://api.example.com/api/v1/webhooks', {
      method: 'POST',
      headers: {
        'x-asof-key': API_KEY,
        'x-asof-timestamp': timestamp,
        'x-asof-signature': 'sha256=synthetic-signature',
      },
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    const result = await verifyIntegrationRequest(request);

    expect(result).toEqual({
      ok: false,
      reason: 'body_too_large',
      details: { limitBytes: MAX_INTEGRATION_BODY_BYTES },
    });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('counts UTF-8 bytes and decodes multibyte chunks only once after reading', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const body = '{"text":"ação🙂"}';
    const bytes = new TextEncoder().encode(body);
    const emojiStart = bytes.findIndex((byte) => byte === 0xf0);
    const timestamp = String(NOW_SECONDS);
    const signature = computeSignature('POST', '/api/v1/webhooks', timestamp, body, HMAC_SECRET);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, emojiStart + 2));
        controller.enqueue(bytes.slice(emojiStart + 2));
        controller.close();
      },
    });
    const request = new Request('https://api.example.com/api/v1/webhooks', {
      method: 'POST',
      headers: {
        'x-asof-key': API_KEY,
        'x-asof-timestamp': timestamp,
        'x-asof-signature': `sha256=${signature}`,
      },
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.verifiedBody).toBe(body);
  });

  it('fails closed when the body stream cannot be read', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    const request = new Request('https://api.example.com/api/v1/webhooks', {
      method: 'POST',
      headers: {
        'x-asof-key': API_KEY,
        'x-asof-timestamp': timestamp,
        'x-asof-signature': 'sha256=synthetic-signature',
      },
      body: new ReadableStream({
        pull() {
          throw new Error('synthetic reader failure containing private body data');
        },
      }),
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    await expect(verifyIntegrationRequest(request)).resolves.toEqual({
      ok: false,
      reason: 'body_read_failed',
      details: {},
    });
  });

  it('maps reader failures to a generic safe 400 response', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    const sensitiveErrorText = 'synthetic reader failure containing private body data';
    const request = new Request('https://api.example.com/api/v1/webhooks', {
      method: 'POST',
      headers: {
        'x-asof-key': API_KEY,
        'x-asof-timestamp': timestamp,
        'x-asof-signature': 'sha256=synthetic-signature',
      },
      body: new ReadableStream({
        pull() {
          throw new Error(sensitiveErrorText);
        },
      }),
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    const result = await authorizeIntegrationRequest(request);

    expect(result).toMatchObject({
      ok: false,
      response: {
        status: 400,
        body: {
          error: {
            code: 'invalid_request',
            message: 'Integration request body could not be read.',
          },
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain(sensitiveErrorText);
  });
});

describe('verifyIntegrationRequest — disabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateApiKeyLastUsed.mockResolvedValue([]);
  });

  it('returns disabled when integrations are turned off', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig({ enabled: false }));

    const timestamp = String(NOW_SECONDS);
    const sig = computeSignature('GET', '/api/v1/events', timestamp, '', HMAC_SECRET);
    const request = makeRequest(API_KEY, timestamp, sig);

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('disabled');
    }
  });
});

describe('verifyIntegrationRequest — replay protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateApiKeyLastUsed.mockResolvedValue([]);
    mockNonceInsertResult.current = [{ id: 1 }];
  });

  it('rejects a replayed request when the same signature was already accepted', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);
    mockNonceInsertResult.current = [];

    const timestamp = String(NOW_SECONDS);
    const sig = computeSignature('GET', '/api/v1/events', timestamp, '', HMAC_SECRET);
    const request = makeRequest(API_KEY, timestamp, sig);

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('replay_detected');
    }
  });

  it('accepts the first request and records the nonce when no replay exists', async () => {
    mockGetIntegrationConfig.mockReturnValue(defaultConfig());
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    const sig = computeSignature('GET', '/api/v1/events', timestamp, '', HMAC_SECRET);
    const request = makeRequest(API_KEY, timestamp, sig);

    const result = await verifyIntegrationRequest(request);

    expect(result.ok).toBe(true);
  });
});
