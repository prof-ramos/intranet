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
} = vi.hoisted(() => ({
  mockGetIntegrationConfig: vi.fn(),
  mockIsIntegrationAuthConfigured: vi.fn(),
  mockFindActiveApiKeyByHash: vi.fn(),
  mockUpdateApiKeyLastUsed: vi.fn(),
  mockDecryptIntegrationSigningSecret: vi.fn(),
  mockLoggerWarn: vi.fn(),
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

vi.mock('@/lib/integrations/http', () => ({
  getRequestId: vi.fn(() => 'test-request-id'),
  jsonError: vi.fn((_status: number, code: string, message: string) => ({
    status: _status,
    body: { ok: false, error: { code, message } },
  })),
}));

// Import after mocks
import { verifyIntegrationRequest } from './verify-request';

// --- Helpers ---

const API_KEY = 'asof_verify_test_key_abc123';
const HMAC_SECRET = 'verify-test-hmac-secret-xyz';
const NOW_SECONDS = Math.floor(Date.now() / 1000);

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

    const borderTimestamp = String(NOW_SECONDS - 299); // 1 s inside the 300 s window
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
    const sig = computeSignature('POST', '/api/v1/webhooks', timestamp, '{"data":"x"}', HMAC_SECRET);
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
