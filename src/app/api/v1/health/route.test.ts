import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mockAuthorizeIntegrationRequest = vi.fn();
const mockConsume = vi.fn();

vi.mock('@/lib/integrations/auth', () => ({
  authorizeIntegrationRequest: (...args: unknown[]) => mockAuthorizeIntegrationRequest(...args),
}));

vi.mock('@/lib/integrations/rate-limit', () => ({
  getIntegrationRateLimitKey: () => 'ip:127.0.0.1',
  integrationRateLimiter: {
    consume: (...args: unknown[]) => mockConsume(...args),
  },
}));

describe('/api/v1/health route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsume.mockResolvedValue({ allowed: true });
    mockAuthorizeIntegrationRequest.mockResolvedValue({
      ok: true,
      requestId: 'health-request',
      principal: { kind: 'session', userId: 7 },
    });
  });

  it('returns health payload for authorized requests', async () => {
    const response = await GET(new Request('https://asof.local/api/v1/health'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockConsume).toHaveBeenCalledWith('ip:127.0.0.1');
    expect(body).toMatchObject({
      ok: true,
      data: {
        service: 'asof-intranet',
        scope: 'integrations',
        status: 'ok',
        auth: {
          authenticated: true,
          principalType: 'session',
        },
        capabilities: {
          inboundEvents: false,
          outboundWebhooks: true,
        },
      },
      meta: {
        requestId: 'health-request',
      },
    });
  });

  it('returns rate-limit errors before auth', async () => {
    mockConsume.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });

    const response = await GET(new Request('https://asof.local/api/v1/health'));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(mockAuthorizeIntegrationRequest).not.toHaveBeenCalled();
    expect(body.error.code).toBe('rate_limit_exceeded');
  });

  it('returns the auth response when authorization fails', async () => {
    mockAuthorizeIntegrationRequest.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ ok: false, error: { code: 'unauthorized' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    });

    const response = await GET(new Request('https://asof.local/api/v1/health'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('unauthorized');
  });
});
