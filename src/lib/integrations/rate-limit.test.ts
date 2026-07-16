import { describe, expect, it, vi } from 'vitest';
import {
  createIntegrationRateLimiter,
  getClientIp,
  getIntegrationPreAuthRateLimitKey,
  getIntegrationPrincipalRateLimitKey,
} from './rate-limit';

// Mock the ip module to control getTrustedClientIp behavior
vi.mock('@/lib/ip', () => ({
  getTrustedClientIp: vi.fn((headers: Headers): string => {
    // Replicate the trusted-proxy logic for testing
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
      const entries = forwarded
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (entries.length > 0) {
        // Default TRUSTED_PROXY_COUNT=1: client index = entries.length - 2
        const clientIndex = Math.max(0, entries.length - 2);
        const ip = entries[clientIndex];
        if (ip) return ip;
      }
    }
    const realIp = headers.get('x-real-ip');
    if (realIp?.trim()) return realIp.trim();
    return 'unknown';
  }),
}));

describe('integration rate limiter', () => {
  it('rejects invalid limiter options', () => {
    expect(() =>
      createIntegrationRateLimiter({
        maxRequests: 0,
        windowMs: 60_000,
        scope: 'integration_api',
      }),
    ).toThrow('maxRequests must be a positive integer.');

    expect(() =>
      createIntegrationRateLimiter({
        maxRequests: 10,
        windowMs: 0,
        scope: 'integration_api',
      }),
    ).toThrow('windowMs must be a positive integer.');

    expect(() =>
      createIntegrationRateLimiter({
        maxRequests: 10,
        windowMs: 60_000,
        scope: '   ',
      }),
    ).toThrow('scope is required.');

    expect(() =>
      createIntegrationRateLimiter({
        maxRequests: 10,
        windowMs: 60_000,
        scope: 'integration_api',
        cleanupIntervalMs: 0,
      }),
    ).toThrow('cleanupIntervalMs must be a positive integer.');
  });

  it('allows requests until the configured limit and then blocks with retryAfter', async () => {
    const atomicIncrement = vi
      .fn()
      .mockResolvedValueOnce({ attempts: 1, expiresAt: 1_060_000 })
      .mockResolvedValueOnce({ attempts: 3, expiresAt: 1_060_000 });
    const cleanup = vi.fn().mockResolvedValue(undefined);

    const limiter = createIntegrationRateLimiter(
      {
        maxRequests: 2,
        windowMs: 60_000,
        scope: 'integration_api',
      },
      { atomicIncrement, cleanup },
    );

    await expect(limiter.consume('127.0.0.1', 1_000_000)).resolves.toEqual({
      allowed: true,
      remaining: 1,
    });

    await expect(limiter.consume('127.0.0.1', 1_000_000)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: 60_000,
    });
  });

  it('clamps negative retryAfter to zero', async () => {
    const limiter = createIntegrationRateLimiter(
      {
        maxRequests: 1,
        windowMs: 60_000,
        scope: 'integration_api',
      },
      {
        atomicIncrement: vi.fn().mockResolvedValue({ attempts: 2, expiresAt: 900 }),
        cleanup: vi.fn().mockResolvedValue(undefined),
      },
    );

    await expect(limiter.consume('127.0.0.1', 1_000)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: 0,
    });
  });

  it('amortizes cleanup and removes expired records without touching active buckets', async () => {
    const records = new Map([
      ['expired-bucket', 50_000],
      ['active-bucket', 120_000],
    ]);
    const cleanup = vi.fn(async (now: number) => {
      for (const [key, expiresAt] of records) {
        if (expiresAt <= now) records.delete(key);
      }
    });
    const atomicIncrement = vi.fn().mockResolvedValue({ attempts: 1, expiresAt: 120_000 });
    const limiter = createIntegrationRateLimiter(
      {
        maxRequests: 10,
        windowMs: 60_000,
        scope: 'integration_api',
        cleanupIntervalMs: 30_000,
      },
      { atomicIncrement, cleanup },
    );

    await limiter.consume('active-bucket', 60_000);
    await limiter.consume('active-bucket', 70_000);
    await limiter.consume('active-bucket', 90_000);

    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenNthCalledWith(1, 60_000);
    expect(cleanup).toHaveBeenNthCalledWith(2, 90_000);
    expect(atomicIncrement).toHaveBeenCalledTimes(3);
    expect(records).toEqual(new Map([['active-bucket', 120_000]]));
  });
});

describe('getClientIp', () => {
  it('delegates to getTrustedClientIp for IP extraction', () => {
    // Verify getClientIp delegates to the shared getTrustedClientIp
    const request = new Request('https://asof.local', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      },
    });

    expect(getClientIp(request)).toBe('203.0.113.1');
  });

  it('falls back gracefully when no headers are present', () => {
    const request = new Request('https://asof.local');
    expect(getClientIp(request)).toBe('unknown');
  });

  it('respects x-real-ip as a fallback', () => {
    const request = new Request('https://asof.local', {
      headers: { 'x-real-ip': '198.51.100.2' },
    });
    expect(getClientIp(request)).toBe('198.51.100.2');
  });
});

describe('integration rate-limit identities', () => {
  it('uses one trusted-IP bucket for rotating invalid credentials', () => {
    const keys = Array.from({ length: 100 }, (_, index) =>
      getIntegrationPreAuthRateLimitKey(
        new Request('https://asof.local', {
          headers: {
            'x-asof-key': `synthetic-invalid-${index}`,
            'x-forwarded-for': '203.0.113.1, 10.0.0.1',
          },
        }),
      ),
    );

    expect(new Set(keys)).toEqual(new Set(['ip:203.0.113.1']));
    expect(keys.join(' ')).not.toContain('synthetic-invalid');
  });

  it('isolates distinct trusted client IPs', () => {
    const request = new Request('https://asof.local', {
      headers: {
        'x-real-ip': '198.51.100.2',
      },
    });

    expect(getIntegrationPreAuthRateLimitKey(request)).toBe('ip:198.51.100.2');
  });

  it('uses canonical authenticated principal identities', () => {
    expect(
      getIntegrationPrincipalRateLimitKey({
        kind: 'integration',
        scheme: 'api-key-hmac-sha256',
        keyId: 'canonical-key-id',
      }),
    ).toBe('api-key:canonical-key-id');
    expect(
      getIntegrationPrincipalRateLimitKey({
        kind: 'session',
        userId: 42,
        email: 'synthetic@example.test',
        role: 'admin',
      }),
    ).toBe('session:42');
  });
});
