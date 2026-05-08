interface LoginRateLimitOptions {
  maxAttempts: number;
  windowMs: number;
}

interface LoginRateLimitEntry {
  attempts: number;
  expiresAt: number;
}

export interface LoginRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export function createLoginRateLimiter(options: LoginRateLimitOptions) {
  const attempts = new Map<string, LoginRateLimitEntry>();

  function cleanupExpiredEntries(now = Date.now()): void {
    for (const [key, entry] of attempts.entries()) {
      if (entry.expiresAt <= now) {
        attempts.delete(key);
      }
    }
  }

  const cleanupInterval = setInterval(cleanupExpiredEntries, options.windowMs);
  cleanupInterval.unref?.();

  function getEntry(key: string, now: number): LoginRateLimitEntry {
    const current = attempts.get(key);
    if (current && current.expiresAt > now) return current;

    const next = { attempts: 0, expiresAt: now + options.windowMs };
    attempts.set(key, next);
    return next;
  }

  return {
    consume(key: string, now = Date.now()): LoginRateLimitResult {
      const normalizedKey = key.trim().toLowerCase();
      const entry = getEntry(normalizedKey, now);

      if (entry.attempts >= options.maxAttempts) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: entry.expiresAt - now,
        };
      }

      entry.attempts += 1;

      return {
        allowed: true,
        remaining: Math.max(0, options.maxAttempts - entry.attempts),
      };
    },

    reset(key: string): void {
      attempts.delete(key.trim().toLowerCase());
    },

    cleanup(now = Date.now()): void {
      cleanupExpiredEntries(now);
    },

    dispose(): void {
      clearInterval(cleanupInterval);
    },
  };
}

export const loginRateLimiter = createLoginRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
});
