import { describe, expect, it } from 'vitest';
import { createLoginRateLimiter, type RateLimitStore } from '@/lib/auth/login-rate-limit';

function createMemoryStore(): RateLimitStore {
  const entries = new Map<string, { attempts: number; expiresAt: number }>();

  return {
    async consume(key: string, now: number, windowMs: number, maxAttempts: number) {
      const existing = entries.get(key);
      let attempts: number;
      let expiresAt: number;

      if (!existing || existing.expiresAt <= now) {
        attempts = 1;
        expiresAt = now + windowMs;
      } else {
        attempts = existing.attempts + 1;
        expiresAt = existing.expiresAt;
      }

      entries.set(key, { attempts, expiresAt });

      if (attempts > maxAttempts) {
        return { allowed: false, remaining: 0, retryAfterMs: expiresAt - now };
      }
      return { allowed: true, remaining: Math.max(0, maxAttempts - attempts) };
    },
    async reset(key: string) {
      entries.delete(key);
    },
    async cleanup(now: number) {
      for (const [k, entry] of entries.entries()) {
        if (entry.expiresAt <= now) entries.delete(k);
      }
    },
  };
}

describe('login rate limiter', () => {
  it('blocks attempts after the configured limit until reset', async () => {
    const limiter = createLoginRateLimiter(
      { maxAttempts: 2, windowMs: 60_000 },
      createMemoryStore(),
    );

    expect(await limiter.consume('user@example.com')).toEqual({
      allowed: true,
      remaining: 1,
    });
    expect(await limiter.consume('user@example.com')).toEqual({
      allowed: true,
      remaining: 0,
    });
    expect(await limiter.consume('user@example.com')).toMatchObject({
      allowed: false,
      remaining: 0,
    });

    await limiter.reset('user@example.com');

    expect(await limiter.consume('user@example.com')).toEqual({
      allowed: true,
      remaining: 1,
    });
    limiter.dispose();
  });

  it('cleans up expired entries and resets window', async () => {
    const limiter = createLoginRateLimiter(
      { maxAttempts: 1, windowMs: 1_000 },
      createMemoryStore(),
    );

    expect(await limiter.consume('user@example.com', 1_000)).toEqual({
      allowed: true,
      remaining: 0,
    });
    expect(await limiter.consume('user@example.com', 1_500)).toMatchObject({
      allowed: false,
    });

    await limiter.cleanup(2_001);

    expect(await limiter.consume('user@example.com', 2_001)).toEqual({
      allowed: true,
      remaining: 0,
    });
    limiter.dispose();
  });

  it('resets window automatically when entry is expired', async () => {
    const limiter = createLoginRateLimiter(
      { maxAttempts: 3, windowMs: 1_000 },
      createMemoryStore(),
    );

    // Consume all attempts
    await limiter.consume('user@example.com', 0);
    await limiter.consume('user@example.com', 0);
    await limiter.consume('user@example.com', 0);
    expect(await limiter.consume('user@example.com', 0)).toMatchObject({ allowed: false });

    // After window expires, should allow again (window reset)
    const result = await limiter.consume('user@example.com', 2_000);
    expect(result).toEqual({ allowed: true, remaining: 2 });
    limiter.dispose();
  });
});
