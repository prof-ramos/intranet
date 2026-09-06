import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mockAuthorizeIntegrationRequest = vi.fn();
const mockPreAuthConsume = vi.fn();
const mockPrincipalConsume = vi.fn();

vi.mock('@/lib/integrations/verify-request', () => ({
  authorizeIntegrationRequest: (...args: unknown[]) => mockAuthorizeIntegrationRequest(...args),
}));

vi.mock('@/lib/integrations/rate-limit', () => ({
  getIntegrationPreAuthRateLimitKey: () => 'ip:127.0.0.1',
  getIntegrationPrincipalRateLimitKey: (principal: { userId: number }) =>
    `session:${principal.userId}`,
  integrationPreAuthRateLimiter: {
    consume: (...args: unknown[]) => mockPreAuthConsume(...args),
  },
  integrationPrincipalRateLimiter: {
    consume: (...args: unknown[]) => mockPrincipalConsume(...args),
  },
}));

describe('/api/v1/health route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', 'ABCDEF0123456789ABCDEF0123456789ABCDEF01');
    mockPreAuthConsume.mockResolvedValue({ allowed: true });
    mockPrincipalConsume.mockResolvedValue({ allowed: true });
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
    expect(mockPreAuthConsume).toHaveBeenCalledWith('ip:127.0.0.1');
    expect(mockPrincipalConsume).toHaveBeenCalledWith('session:7');
    expect(mockAuthorizeIntegrationRequest).toHaveBeenCalledWith(expect.any(Request), {
      allowSessionRoles: ['admin', 'diretoria'],
      requiredScopes: ['health:read'],
    });
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
        deployment: {
          gitCommitSha: 'abcdef0123456789abcdef0123456789abcdef01',
        },
      },
      meta: {
        requestId: 'health-request',
      },
    });
  });

  it.each([undefined, 'short-sha', 'g'.repeat(40)])(
    'returns null without exposing other Git metadata when the deployment SHA is %s',
    async (deploymentSha) => {
      vi.stubEnv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', deploymentSha ?? '');

      const response = await GET(new Request('https://asof.local/api/v1/health'));
      const body = await response.json();

      expect(body.data.deployment).toEqual({ gitCommitSha: null });
      expect(body.data.deployment).not.toHaveProperty('branch');
      expect(body.data.deployment).not.toHaveProperty('message');
      expect(body.data.deployment).not.toHaveProperty('author');
    },
  );

  it('returns rate-limit errors before auth', async () => {
    mockPreAuthConsume.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });

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
    expect(mockPrincipalConsume).not.toHaveBeenCalled();
  });

  it('returns principal rate-limit errors after successful authorization', async () => {
    mockPrincipalConsume.mockResolvedValue({ allowed: false, retryAfterMs: 2500 });

    const response = await GET(new Request('https://asof.local/api/v1/health'));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(mockPrincipalConsume).toHaveBeenCalledWith('session:7');
    expect(body.error.details.retryAfterMs).toBe(2500);
  });
});
