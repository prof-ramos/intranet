import { describe, expect, it } from 'vitest';
import { createLoginRateLimiter } from './login-rate-limit';

describe('login rate limiter', () => {
  it('blocks attempts after the configured limit until reset', () => {
    const limiter = createLoginRateLimiter({ maxAttempts: 2, windowMs: 60_000 });

    expect(limiter.consume('user@example.com')).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.consume('user@example.com')).toEqual({ allowed: true, remaining: 0 });
    expect(limiter.consume('user@example.com')).toMatchObject({ allowed: false, remaining: 0 });

    limiter.reset('user@example.com');

    expect(limiter.consume('user@example.com')).toEqual({ allowed: true, remaining: 1 });
  });
});
