import { describe, expect, it, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { loginAttempts } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { createLoginRateLimiter, hashEmail } from './login-rate-limit';

describe('login rate limiter integration', () => {
  const testEmailHashes: string[] = [];

  afterAll(async () => {
    if (testEmailHashes.length > 0) {
      await db.delete(loginAttempts).where(inArray(loginAttempts.emailHash, testEmailHashes));
    }
  });

  it('tracks attempts in the database and blocks after limit', async () => {
    const email = `test-${Date.now()}@example.com`;
    testEmailHashes.push(hashEmail(email));

    const limiter = createLoginRateLimiter({ maxAttempts: 2, windowMs: 60_000 });
    try {
      // First attempt
      const r1 = await limiter.consume(email);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(1);

      // Second attempt
      const r2 = await limiter.consume(email);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(0);

      // Third attempt — blocked
      const r3 = await limiter.consume(email);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
      expect(r3.retryAfterMs).toBeGreaterThan(0);

      // Reset and try again
      await limiter.reset(email);
      const r4 = await limiter.consume(email);
      expect(r4.allowed).toBe(true);
      expect(r4.remaining).toBe(1);
    } finally {
      limiter.dispose();
    }

  });

  it('resets expired entries on getEntry', async () => {
    const email = `expired-${Date.now()}@example.com`;
    testEmailHashes.push(hashEmail(email));

    const limiter = createLoginRateLimiter({ maxAttempts: 1, windowMs: 100 });
    try {
      // Consume once
      const r1 = await limiter.consume(email, Date.now());
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(0);

      // Wait for window to expire
      const later = Date.now() + 200;
      const r2 = await limiter.consume(email, later);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(0);
    } finally {
      limiter.dispose();
    }

  });

  it('cleanup removes expired entries', async () => {
    const email = `cleanup-${Date.now()}@example.com`;
    testEmailHashes.push(hashEmail(email));

    const limiter = createLoginRateLimiter({ maxAttempts: 1, windowMs: 100 });
    try {
      await limiter.consume(email, Date.now());
      await limiter.cleanup(Date.now() + 200);

      // After cleanup, the row should be gone and a new attempt allowed
      const r = await limiter.consume(email, Date.now() + 300);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(0);
    } finally {
      limiter.dispose();
    }

  });
});
