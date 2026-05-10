import { describe, expect, it } from 'vitest';
import { createLoginRateLimiter, type RateLimitStore } from '@/lib/auth/login-rate-limit';

function createMemoryStore(): RateLimitStore {
  const entries = new Map<string, { attempts: number; expiresAt: number }>();

  return {
    async getEntry(key: string, now: number, windowMs: number) {
      const entry = entries.get(key);
      if (!entry) {
        const next = { attempts: 0, expiresAt: now + windowMs };
        entries.set(key, next);
        return { attempts: next.attempts, expiresAt: next.expiresAt };
      }
      if (entry.expiresAt <= now) {
        const next = { attempts: 0, expiresAt: now + windowMs };
        entries.set(key, next);
        return { attempts: next.attempts, expiresAt: next.expiresAt };
      }
      return { attempts: entry.attempts, expiresAt: entry.expiresAt };
    },
    async incrementAttempts(key: string) {
      const entry = entries.get(key);
      if (entry) entry.attempts += 1;
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

  it('cleans up expired entries', async () => {
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
});
