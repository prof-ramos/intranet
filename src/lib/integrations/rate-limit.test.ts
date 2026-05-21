import { describe, expect, it, vi } from 'vitest';
import { createIntegrationRateLimiter, getClientIp, getIntegrationRateLimitKey } from './rate-limit';

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

describe('getIntegrationRateLimitKey', () => {
  it('uses a hash of x-asof-key when present', () => {
    const request = new Request('https://asof.local', {
      headers: {
        'x-asof-key': 'asof_test_secret',
        'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      },
    });

    const key = getIntegrationRateLimitKey(request);

    expect(key).toMatch(/^api-key:[0-9a-f]{64}$/);
    expect(key).not.toContain('asof_test_secret');
    expect(key).not.toContain('203.0.113.1');
  });

  it('falls back to client IP when no API key header exists', () => {
    const request = new Request('https://asof.local', {
      headers: {
        'x-real-ip': '198.51.100.2',
      },
    });

    expect(getIntegrationRateLimitKey(request)).toBe('ip:198.51.100.2');
  });
});
