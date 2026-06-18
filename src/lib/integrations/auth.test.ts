import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash, createHmac } from 'node:crypto';

// --- Hoisted mocks (available inside vi.mock factories) ---
const {
  mockGetIntegrationConfig,
  mockIsIntegrationAuthConfigured,
  mockFindActiveApiKeyByHash,
  mockUpdateApiKeyLastUsed,
  mockDecryptIntegrationSigningSecret,
  mockLoggerWarn,
  mockDbSelect,
  mockDbInsert,
} = vi.hoisted(() => {
  const mockDbInsertValues = vi.fn(() => ({ onConflictDoNothing: vi.fn(() => Promise.resolve()) }));
  const mockDbSelectLimit = vi.fn(() => Promise.resolve([]));
  const mockDbSelectWhere = vi.fn(() => ({ limit: mockDbSelectLimit }));
  const mockDbSelectFrom = vi.fn(() => ({ where: mockDbSelectWhere }));
  const mockDbSelect = vi.fn(() => ({ from: mockDbSelectFrom }));
  const mockDbInsert = vi.fn(() => ({ values: mockDbInsertValues }));
  return {
    mockGetIntegrationConfig: vi.fn(),
    mockIsIntegrationAuthConfigured: vi.fn(),
    mockFindActiveApiKeyByHash: vi.fn(),
    mockUpdateApiKeyLastUsed: vi.fn(),
    mockDecryptIntegrationSigningSecret: vi.fn(),
    mockLoggerWarn: vi.fn(),
    mockDbSelect,
    mockDbInsert,
  };
});

// --- Mocks ---

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    warn: mockLoggerWarn,
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: { select: mockDbSelect, insert: mockDbInsert },
}));

vi.mock('@/lib/db/schema', () => ({
  integrationSignatureNonces: { id: 'id', keyId: 'key_id', signature: 'signature', expiresAt: 'expires_at' },
}));

vi.mock('@/lib/integrations/config', () => ({
  getIntegrationConfig: mockGetIntegrationConfig,
  isIntegrationAuthConfigured: mockIsIntegrationAuthConfigured,
}));

vi.mock('@/lib/integrations/keys/service', () => ({
  hashKey: (rawKey: string) => createHash('sha256').update(rawKey).digest('hex'),
  VALID_SCOPES: ['events:read', 'events:write', 'webhooks:manage', 'admin'],
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
import { verifyIntegrationRequest, authorizeIntegrationRequest } from './auth';

// --- Helpers ---

const TEST_API_KEY = 'asof_test_api_key_12345';
const TEST_HMAC_SECRET = 'test-hmac-secret-for-auth-tests';
const TEST_TABLE_KEY_RAW = 'asof_table_key_abc123def456';
const TEST_TABLE_SIGNING_SECRET = 'test-table-signing-secret-for-auth-tests';
const NOW_SECONDS = Math.floor(Date.now() / 1000);

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function signRequest(
  method: string,
  path: string,
  timestamp: string,
  body: string,
  secret: string,
): string {
  const canonicalPayload = [method.toUpperCase(), path, timestamp, sha256Hex(body)].join('\n');
  return createHmac('sha256', secret).update(canonicalPayload).digest('hex');
}

function makeRequest(
  apiKey: string,
  timestamp: string,
  signature: string,
  options: {
    method?: string;
    url?: string;
    body?: string;
  } = {},
): Request {
  const method = options.method ?? 'GET';
  const url = options.url ?? 'https://example.com/api/v1/events';

  const headers = new Headers();
  headers.set('x-asof-key', apiKey);
  headers.set('x-asof-timestamp', timestamp);
  headers.set('x-asof-signature', `sha256=${signature}`);

  // GET/HEAD requests cannot have a body per the Fetch spec.
  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers });
  }

  const body = options.body ?? '';
  return new Request(url, { method, headers, body });
}

function defaultConfig(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    apiKey: TEST_API_KEY,
    hmacSecret: TEST_HMAC_SECRET,
    timestampToleranceSeconds: 300,
    ...overrides,
  };
}

// --- Tests ---

describe('verifyIntegrationRequest (dual-auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateApiKeyLastUsed.mockResolvedValue([]);
    mockDecryptIntegrationSigningSecret.mockReturnValue(TEST_TABLE_SIGNING_SECRET);
  });

  describe('env-var key authentication', () => {
    it('authenticates with a valid env-var API key and HMAC signature', async () => {
      const config = defaultConfig();
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(true);

      const timestamp = String(NOW_SECONDS);
      const signature = signRequest('GET', '/api/v1/events', timestamp, '', TEST_HMAC_SECRET);
      const request = makeRequest(TEST_API_KEY, timestamp, signature);

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.principal.kind).toBe('integration');
        expect(result.principal.keyId).toBe(TEST_API_KEY);
        if (result.principal.kind === 'integration') {
          expect(result.principal.scopes).toBeUndefined();
        }
      }
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATED'),
        expect.objectContaining({
          requestId: 'test-request-id',
          method: 'GET',
          path: '/api/v1/events',
        }),
      );

      // Ensure secrets are not leaked in the log message or its metadata
      for (const call of mockLoggerWarn.mock.calls) {
        const logContent = JSON.stringify(call);
        expect(logContent).not.toContain(TEST_API_KEY);
        expect(logContent).not.toContain(TEST_HMAC_SECRET);
      }
    });

    it('rejects an invalid env-var API key when no table key matches', async () => {
      const config = defaultConfig();
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(true);
      mockFindActiveApiKeyByHash.mockResolvedValue(null);

      const timestamp = String(NOW_SECONDS);
      const signature = signRequest('GET', '/api/v1/events', timestamp, '', TEST_HMAC_SECRET);
      const request = makeRequest('wrong_key', timestamp, signature);

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_key');
      }
    });

    it('rejects a valid env-var key with an invalid HMAC signature', async () => {
      const config = defaultConfig();
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(true);

      const timestamp = String(NOW_SECONDS);
      const request = makeRequest(TEST_API_KEY, timestamp, 'badsignature');

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_signature');
      }
    });
  });

  describe('table-backed key authentication', () => {
    it('authenticates with a valid table-backed key when env var is absent', async () => {
      const config = defaultConfig({ apiKey: null });
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(false);
      mockFindActiveApiKeyByHash.mockResolvedValue({
        id: 1,
        name: 'test-table-key',
        keyHash: sha256Hex(TEST_TABLE_KEY_RAW),
        signingSecretCiphertext: 'enc:v2:k1.iv.tag.ciphertext',
        scopes: ['events:read', 'events:write'],
        isActive: true,
      });

      const timestamp = String(NOW_SECONDS);
      const signature = signRequest(
        'GET',
        '/api/v1/events',
        timestamp,
        '',
        TEST_TABLE_SIGNING_SECRET,
      );
      const request = makeRequest(TEST_TABLE_KEY_RAW, timestamp, signature);

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.principal.kind).toBe('integration');
        expect(result.principal.keyId).toBe('test-table-key');
        if (result.principal.kind === 'integration') {
          expect(result.principal.scopes).toEqual(['events:read', 'events:write']);
        }
      }
      expect(mockFindActiveApiKeyByHash).toHaveBeenCalledWith(sha256Hex(TEST_TABLE_KEY_RAW));
      expect(mockDecryptIntegrationSigningSecret).toHaveBeenCalledWith('enc:v2:k1.iv.tag.ciphertext');
    });

    it('authenticates a legacy table-backed key with the shared HMAC fallback', async () => {
      const config = defaultConfig();
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(true);
      mockFindActiveApiKeyByHash.mockResolvedValue({
        id: 2,
        name: 'another-table-key',
        keyHash: sha256Hex(TEST_TABLE_KEY_RAW),
        signingSecretCiphertext: null,
        scopes: ['webhooks:manage'],
        isActive: true,
      });

      const timestamp = String(NOW_SECONDS);
      const signature = signRequest('GET', '/api/v1/events', timestamp, '', TEST_HMAC_SECRET);
      const request = makeRequest(TEST_TABLE_KEY_RAW, timestamp, signature);

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(true);
      if (result.ok) {
        if (result.principal.kind === 'integration') {
          expect(result.principal.scopes).toEqual(['webhooks:manage']);
        }
      }
    });

    it('rejects a per-key table-backed key signed with the legacy shared HMAC secret', async () => {
      const config = defaultConfig();
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(true);
      mockFindActiveApiKeyByHash.mockResolvedValue({
        id: 2,
        name: 'per-key-table-key',
        keyHash: sha256Hex(TEST_TABLE_KEY_RAW),
        signingSecretCiphertext: 'enc:v2:k1.iv.tag.ciphertext',
        scopes: ['webhooks:manage'],
        isActive: true,
      });

      const timestamp = String(NOW_SECONDS);
      const signature = signRequest('GET', '/api/v1/events', timestamp, '', TEST_HMAC_SECRET);
      const request = makeRequest(TEST_TABLE_KEY_RAW, timestamp, signature);

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_signature');
      }
    });

    it('rejects a table-backed key with an invalid HMAC signature', async () => {
      const config = defaultConfig({ apiKey: null });
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(false);
      mockFindActiveApiKeyByHash.mockResolvedValue({
        id: 1,
        name: 'test-table-key',
        keyHash: sha256Hex(TEST_TABLE_KEY_RAW),
        signingSecretCiphertext: 'enc:v2:k1.iv.tag.ciphertext',
        scopes: ['events:read'],
        isActive: true,
      });

      const timestamp = String(NOW_SECONDS);
      const request = makeRequest(TEST_TABLE_KEY_RAW, timestamp, 'badsignature');

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_signature');
      }
    });

    it('rejects a key not found in env var or table', async () => {
      const config = defaultConfig();
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(true);
      mockFindActiveApiKeyByHash.mockResolvedValue(null);

      const timestamp = String(NOW_SECONDS);
      const signature = signRequest('GET', '/api/v1/events', timestamp, '', TEST_HMAC_SECRET);
      const request = makeRequest('unknown_key', timestamp, signature);

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_key');
      }
    });
  });

  describe('misconfigured / disabled', () => {
    it('returns disabled when integrations are not enabled', async () => {
      const config = defaultConfig({ enabled: false });
      mockGetIntegrationConfig.mockReturnValue(config);

      const timestamp = String(NOW_SECONDS);
      const signature = signRequest('GET', '/api/v1/events', timestamp, '', TEST_HMAC_SECRET);
      const request = makeRequest(TEST_API_KEY, timestamp, signature);

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('disabled');
      }
    });

    it('returns invalid_key when no hmacSecret is set and no table key matches', async () => {
      const config = defaultConfig({ hmacSecret: null, apiKey: null });
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(false);
      mockFindActiveApiKeyByHash.mockResolvedValue(null);

      const timestamp = String(NOW_SECONDS);
      const signature = signRequest('GET', '/api/v1/events', timestamp, '', '');
      const request = makeRequest(TEST_API_KEY, timestamp, signature);

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_key');
      }
    });

    it('returns misconfigured for a legacy table-backed key when the shared fallback is missing', async () => {
      const config = defaultConfig({ hmacSecret: null, apiKey: null });
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(false);
      mockFindActiveApiKeyByHash.mockResolvedValue({
        id: 1,
        name: 'legacy-table-key',
        keyHash: sha256Hex(TEST_TABLE_KEY_RAW),
        signingSecretCiphertext: null,
        scopes: ['events:read'],
        isActive: true,
      });

      const timestamp = String(NOW_SECONDS);
      const signature = signRequest('GET', '/api/v1/events', timestamp, '', '');
      const request = makeRequest(TEST_TABLE_KEY_RAW, timestamp, signature);

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('misconfigured');
      }
    });

    it('returns missing_headers when key header is absent', async () => {
      const config = defaultConfig();
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(true);

      const headers = new Headers();
      headers.set('x-asof-timestamp', String(NOW_SECONDS));
      headers.set('x-asof-signature', 'sha256=somesig');
      const request = new Request('https://example.com/api/v1/events', { headers });

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('missing_headers');
      }
    });
  });

  describe('timestamp validation', () => {
    it('rejects a timestamp outside the tolerance window', async () => {
      const config = defaultConfig();
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(true);

      const oldTimestamp = String(NOW_SECONDS - 600); // 10 minutes ago
      const signature = signRequest('GET', '/api/v1/events', oldTimestamp, '', TEST_HMAC_SECRET);
      const request = makeRequest(TEST_API_KEY, oldTimestamp, signature);

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('timestamp_skew');
      }
    });

    it('rejects non-decimal timestamp encodings', async () => {
      const config = defaultConfig();
      mockGetIntegrationConfig.mockReturnValue(config);
      mockIsIntegrationAuthConfigured.mockReturnValue(true);

      const rawTimestamp = `${NOW_SECONDS}abc`;
      const signature = signRequest('GET', '/api/v1/events', rawTimestamp, '', TEST_HMAC_SECRET);
      const request = makeRequest(TEST_API_KEY, rawTimestamp, signature);

      const result = await verifyIntegrationRequest(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_timestamp');
      }
    });
  });
});

describe('authorizeIntegrationRequest (scope validation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateApiKeyLastUsed.mockResolvedValue([]);
    mockDecryptIntegrationSigningSecret.mockReturnValue(TEST_TABLE_SIGNING_SECRET);
  });

  it('allows env-var key to bypass scope requirements (no scopes on principal)', async () => {
    const config = defaultConfig();
    mockGetIntegrationConfig.mockReturnValue(config);
    mockIsIntegrationAuthConfigured.mockReturnValue(true);

    const timestamp = String(NOW_SECONDS);
    const signature = signRequest('GET', '/api/v1/events', timestamp, '', TEST_HMAC_SECRET);
    const request = makeRequest(TEST_API_KEY, timestamp, signature);

    const result = await authorizeIntegrationRequest(request, {
      requiredScopes: ['events:read'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.principal.kind).toBe('integration');
      // env-var keys have no scopes — they bypass scope checks
      if (result.principal.kind === 'integration') {
        expect(result.principal.scopes).toBeUndefined();
      }
    }
  });

  it('allows table-backed key with matching scope', async () => {
    const config = defaultConfig({ apiKey: null });
    mockGetIntegrationConfig.mockReturnValue(config);
    mockIsIntegrationAuthConfigured.mockReturnValue(false);
    mockFindActiveApiKeyByHash.mockResolvedValue({
      id: 1,
      name: 'scoped-key',
      keyHash: sha256Hex(TEST_TABLE_KEY_RAW),
      signingSecretCiphertext: null,
      scopes: ['events:read', 'events:write'],
      isActive: true,
    });

    const timestamp = String(NOW_SECONDS);
    const signature = signRequest('GET', '/api/v1/events', timestamp, '', TEST_HMAC_SECRET);
    const request = makeRequest(TEST_TABLE_KEY_RAW, timestamp, signature);

    const result = await authorizeIntegrationRequest(request, {
      requiredScopes: ['events:read'],
    });

    expect(result.ok).toBe(true);
  });

  it('rejects table-backed key without required scope', async () => {
    const config = defaultConfig({ apiKey: null });
    mockGetIntegrationConfig.mockReturnValue(config);
    mockIsIntegrationAuthConfigured.mockReturnValue(false);
    mockFindActiveApiKeyByHash.mockResolvedValue({
      id: 1,
      name: 'limited-key',
      keyHash: sha256Hex(TEST_TABLE_KEY_RAW),
      signingSecretCiphertext: null,
      scopes: ['webhooks:manage'],
      isActive: true,
    });

    const timestamp = String(NOW_SECONDS);
    const signature = signRequest('GET', '/api/v1/events', timestamp, '', TEST_HMAC_SECRET);
    const request = makeRequest(TEST_TABLE_KEY_RAW, timestamp, signature);

    const result = await authorizeIntegrationRequest(request, {
      requiredScopes: ['events:read'],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it('allows table-backed key with admin scope when admin is required', async () => {
    const config = defaultConfig({ apiKey: null });
    mockGetIntegrationConfig.mockReturnValue(config);
    mockIsIntegrationAuthConfigured.mockReturnValue(false);
    mockFindActiveApiKeyByHash.mockResolvedValue({
      id: 1,
      name: 'admin-key',
      keyHash: sha256Hex(TEST_TABLE_KEY_RAW),
      signingSecretCiphertext: null,
      scopes: ['admin'],
      isActive: true,
    });

    const timestamp = String(NOW_SECONDS);
    const signature = signRequest('GET', '/api/v1/events', timestamp, '', TEST_HMAC_SECRET);
    const request = makeRequest(TEST_TABLE_KEY_RAW, timestamp, signature);

    const result = await authorizeIntegrationRequest(request, {
      requiredScopes: ['admin'],
    });

    expect(result.ok).toBe(true);
  });

  it('skips scope check when no requiredScopes provided', async () => {
    const config = defaultConfig({ apiKey: null });
    mockGetIntegrationConfig.mockReturnValue(config);
    mockIsIntegrationAuthConfigured.mockReturnValue(false);
    mockFindActiveApiKeyByHash.mockResolvedValue({
      id: 1,
      name: 'limited-key',
      keyHash: sha256Hex(TEST_TABLE_KEY_RAW),
      signingSecretCiphertext: null,
      scopes: ['webhooks:manage'],
      isActive: true,
    });

    const timestamp = String(NOW_SECONDS);
    const signature = signRequest('GET', '/api/v1/events', timestamp, '', TEST_HMAC_SECRET);
    const request = makeRequest(TEST_TABLE_KEY_RAW, timestamp, signature);

    // No requiredScopes — should pass even though key only has webhooks:manage
    const result = await authorizeIntegrationRequest(request);

    expect(result.ok).toBe(true);
  });
});
