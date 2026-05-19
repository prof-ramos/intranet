import { describe, expect, it, vi } from 'vitest';
import { getTrustedClientIp, getTrustedProxyCount } from './ip';

// Mock env module to control TRUSTED_PROXY_COUNT (now number | undefined after zod parsing)
const mockEnv = vi.hoisted(() => ({ TRUSTED_PROXY_COUNT: undefined as number | undefined }));

vi.mock('@/lib/env', () => ({
  env: {
    get TRUSTED_PROXY_COUNT() { return mockEnv.TRUSTED_PROXY_COUNT; },
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ warn: vi.fn() }),
}));

describe('getTrustedProxyCount', () => {
  it('defaults to 1 when TRUSTED_PROXY_COUNT is undefined', () => {
    mockEnv.TRUSTED_PROXY_COUNT = undefined;
    expect(getTrustedProxyCount()).toBe(1);
  });

  it('returns the configured integer value', () => {
    mockEnv.TRUSTED_PROXY_COUNT = 2;
    expect(getTrustedProxyCount()).toBe(2);
  });

  it('returns 0 when explicitly set to 0', () => {
    mockEnv.TRUSTED_PROXY_COUNT = 0;
    expect(getTrustedProxyCount()).toBe(0);
  });

  it('falls back to 1 for invalid values', () => {
    mockEnv.TRUSTED_PROXY_COUNT = -1;
    expect(getTrustedProxyCount()).toBe(1);
  });
});

describe('getTrustedClientIp', () => {
  it('extracts the real client IP from the right position in x-forwarded-for', () => {
    mockEnv.TRUSTED_PROXY_COUNT = 1;
    // "client-ip, proxy-ip" → with 1 trusted proxy: index = max(0, 2-2) = 0 → "203.0.113.1"
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' });
    expect(getTrustedClientIp(headers)).toBe('203.0.113.1');
  });

  it('skips two proxy layers with TRUSTED_PROXY_COUNT=2', () => {
    mockEnv.TRUSTED_PROXY_COUNT = 2;
    // "client-ip, cdn-ip, vercel-ip" → index = max(0, 3-3) = 0 → "203.0.113.1"
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.1, 172.16.0.1, 10.0.0.1',
    });
    expect(getTrustedClientIp(headers)).toBe('203.0.113.1');
  });

  it('ignores spoofed left-side entries', () => {
    mockEnv.TRUSTED_PROXY_COUNT = 1;
    // Attacker prepends fake IPs. With 1 proxy, index = max(0, 3-2) = 1 → "real-client-ip"
    const headers = new Headers({
      'x-forwarded-for': 'spoofed-ip, real-client-ip, proxy-ip',
    });
    expect(getTrustedClientIp(headers)).toBe('real-client-ip');
  });

  it('returns single x-forwarded-for entry as-is with 1 proxy', () => {
    mockEnv.TRUSTED_PROXY_COUNT = 1;
    // Vercel: single entry = real client. index = max(0, 1-2) = 0
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.1' });
    expect(getTrustedClientIp(headers)).toBe('203.0.113.1');
  });

  it('with 0 trusted proxies, uses the rightmost (last) entry (closest proxy)', () => {
    mockEnv.TRUSTED_PROXY_COUNT = 0;
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' });
    // index = max(0, 2-0-1) = 1 → "10.0.0.1" (rightmost, set by first proxy)
    expect(getTrustedClientIp(headers)).toBe('10.0.0.1');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    mockEnv.TRUSTED_PROXY_COUNT = 1;
    const headers = new Headers({ 'x-real-ip': '198.51.100.2' });
    expect(getTrustedClientIp(headers)).toBe('198.51.100.2');
  });

  it('returns "unknown" when no IP headers are present', () => {
    mockEnv.TRUSTED_PROXY_COUNT = 1;
    const headers = new Headers();
    expect(getTrustedClientIp(headers)).toBe('unknown');
  });

  it('handles empty x-forwarded-for gracefully', () => {
    mockEnv.TRUSTED_PROXY_COUNT = 1;
    const headers = new Headers({ 'x-forwarded-for': ', , ' });
    // Empty entries filtered out, falls back to x-real-ip or unknown
    expect(getTrustedClientIp(headers)).toBe('unknown');
  });

  it('trims whitespace from x-real-ip fallback', () => {
    mockEnv.TRUSTED_PROXY_COUNT = 1;
    const headers = new Headers({ 'x-real-ip': '  198.51.100.2  ' });
    expect(getTrustedClientIp(headers)).toBe('198.51.100.2');
  });
});
