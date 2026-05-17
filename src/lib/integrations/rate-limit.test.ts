import { describe, expect, it, vi } from 'vitest';
import { createIntegrationRateLimiter, getClientIp } from './rate-limit';

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
  it('prefers the first x-forwarded-for entry', () => {
    const request = new Request('https://asof.local', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 10.0.0.1',
        'x-real-ip': '198.51.100.2',
      },
    });

    expect(getClientIp(request)).toBe('203.0.113.1');
  });

  it('falls back to x-real-ip and then unknown', () => {
    const withRealIp = new Request('https://asof.local', {
      headers: {
        'x-real-ip': '198.51.100.2',
      },
    });
    const unknown = new Request('https://asof.local');

    expect(getClientIp(withRealIp)).toBe('198.51.100.2');
    expect(getClientIp(unknown)).toBe('unknown');
  });
});
