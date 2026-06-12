import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    CRON_SECRET: 'test-secret-123',
  },
}));

describe('authorizeCronRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok=true for valid bearer token', async () => {
    const { authorizeCronRequest } = await import('./auth');
    const request = new Request('http://localhost/api/v1/test', {
      headers: { authorization: 'Bearer test-secret-123' },
    });

    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(true);
  });

  it('returns ok=false with 401 when no authorization header', async () => {
    const { authorizeCronRequest } = await import('./auth');
    const request = new Request('http://localhost/api/v1/test');

    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const response = result.response;
      expect(response.status).toBe(401);
    }
  });

  it('returns ok=false with 401 for invalid bearer token', async () => {
    const { authorizeCronRequest } = await import('./auth');
    const request = new Request('http://localhost/api/v1/test', {
      headers: { authorization: 'Bearer wrong-secret' },
    });

    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const response = result.response;
      expect(response.status).toBe(401);
    }
  });

  it('returns ok=false with 503 when CRON_SECRET is not configured', async () => {
    const { env } = await import('@/lib/env');
    const original = env.CRON_SECRET;
    env.CRON_SECRET = '';
    try {
      const { authorizeCronRequest } = await import('./auth');
      const request = new Request('http://localhost/api/v1/test', {
        headers: { authorization: 'Bearer some-token' },
      });

      const result = authorizeCronRequest(request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const response = result.response;
        expect(response.status).toBe(503);
      }
    } finally {
      env.CRON_SECRET = original;
    }
  });

  it('handles bearer prefix case-insensitively', async () => {
    const { authorizeCronRequest } = await import('./auth');
    const request = new Request('http://localhost/api/v1/test', {
      headers: { authorization: 'BEARER test-secret-123' },
    });

    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(true);
  });

  it('strips whitespace from bearer token', async () => {
    const { authorizeCronRequest } = await import('./auth');
    const request = new Request('http://localhost/api/v1/test', {
      headers: { authorization: 'Bearer  test-secret-123  ' },
    });

    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(true);
  });
});
