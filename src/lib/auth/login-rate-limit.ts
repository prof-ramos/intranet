import { db } from '@/lib/db';
import { loginAttempts } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export interface LoginRateLimitOptions {
  maxAttempts: number;
  windowMs: number;
}

export interface LoginRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

interface RateLimitEntry {
  attempts: number;
  expiresAt: number;
}

export interface RateLimitStore {
  getEntry(key: string, now: number, windowMs: number): Promise<RateLimitEntry | null>;
  incrementAttempts(key: string, now: number): Promise<void>;
  reset(key: string): Promise<void>;
  cleanup(now: number): Promise<void>;
}

const dbStore: RateLimitStore = {
  async getEntry(key, now, windowMs) {
    const expiresAt = new Date(now + windowMs);

    const rows = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.email, key))
      .limit(1);

    if (rows.length === 0) {
      const inserted = await db
        .insert(loginAttempts)
        .values({
          email: key,
          attempts: 0,
          expiresAt,
        })
        .returning();
      return {
        attempts: inserted[0].attempts,
        expiresAt: inserted[0].expiresAt.getTime(),
      };
    }

    const row = rows[0];
    if (row.expiresAt.getTime() <= now) {
      const updated = await db
        .update(loginAttempts)
        .set({ attempts: 0, expiresAt, updatedAt: new Date() })
        .where(eq(loginAttempts.id, row.id))
        .returning();
      return {
        attempts: updated[0].attempts,
        expiresAt: updated[0].expiresAt.getTime(),
      };
    }

    return {
      attempts: row.attempts,
      expiresAt: row.expiresAt.getTime(),
    };
  },

  async incrementAttempts(key) {
    await db
      .update(loginAttempts)
      .set({
        attempts: sql`${loginAttempts.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(loginAttempts.email, key));
  },

  async reset(key) {
    await db
      .delete(loginAttempts)
      .where(eq(loginAttempts.email, key));
  },

  async cleanup(now) {
    await db
      .delete(loginAttempts)
      .where(sql`${loginAttempts.expiresAt} <= ${new Date(now)}`);
  },
};

export function createLoginRateLimiter(
  options: LoginRateLimitOptions,
  store: RateLimitStore = dbStore,
) {
  async function getEntry(
    normalizedKey: string,
    now: number,
  ): Promise<RateLimitEntry | null> {
    return store.getEntry(normalizedKey, now, options.windowMs);
  }

  return {
    async consume(
      key: string,
      now = Date.now(),
    ): Promise<LoginRateLimitResult> {
      const normalizedKey = key.trim().toLowerCase();
      const entry = await getEntry(normalizedKey, now);

      if (!entry) {
        return { allowed: true, remaining: options.maxAttempts };
      }

      if (entry.attempts >= options.maxAttempts) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: entry.expiresAt - now,
        };
      }

      await store.incrementAttempts(normalizedKey, now);

      return {
        allowed: true,
        remaining: Math.max(0, options.maxAttempts - (entry.attempts + 1)),
      };
    },

    async reset(key: string): Promise<void> {
      await store.reset(key.trim().toLowerCase());
    },

    async cleanup(now = Date.now()): Promise<void> {
      await store.cleanup(now);
    },

    dispose(): void {
      // No-op: interval cleanup removed with database-backed implementation.
    },
  };
}

export const loginRateLimiter = createLoginRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
});
