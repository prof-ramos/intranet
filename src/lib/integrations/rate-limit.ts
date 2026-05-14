import { db } from '@/lib/db';
import { rateLimits } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export interface IntegrationRateLimitOptions {
  maxRequests: number;
  windowMs: number;
  scope: string;
}

export interface IntegrationRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

interface RateLimitEntry {
  attempts: number;
  expiresAt: number;
}

export interface IntegrationRateLimitStore {
  getEntry(key: string, scope: string, now: number, windowMs: number): Promise<RateLimitEntry | null>;
  incrementAttempts(key: string, scope: string): Promise<void>;
  cleanup(now: number): Promise<void>;
}

const dbStore: IntegrationRateLimitStore = {
  async getEntry(key, scope, now, windowMs) {
    const expiresAt = new Date(now + windowMs);

    const rows = await db
      .select()
      .from(rateLimits)
      .where(sql`${rateLimits.key} = ${key} AND ${rateLimits.scope} = ${scope}`)
      .limit(1);

    if (rows.length === 0) {
      const inserted = await db
        .insert(rateLimits)
        .values({
          key,
          scope,
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
        .update(rateLimits)
        .set({ attempts: 0, expiresAt, updatedAt: new Date() })
        .where(eq(rateLimits.id, row.id))
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

  async incrementAttempts(key, scope) {
    await db
      .update(rateLimits)
      .set({
        attempts: sql`${rateLimits.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(sql`${rateLimits.key} = ${key} AND ${rateLimits.scope} = ${scope}`);
  },

  async cleanup(now) {
    await db
      .delete(rateLimits)
      .where(sql`${rateLimits.expiresAt} <= ${new Date(now).toISOString()}`);
  },
};

export function createIntegrationRateLimiter(
  options: IntegrationRateLimitOptions,
  store: IntegrationRateLimitStore = dbStore,
) {
  return {
    async consume(key: string, now = Date.now()): Promise<IntegrationRateLimitResult> {
      const entry = await store.getEntry(key, options.scope, now, options.windowMs);

      if (!entry) {
        return { allowed: true, remaining: options.maxRequests };
      }

      if (entry.attempts >= options.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: entry.expiresAt - now,
        };
      }

      await store.incrementAttempts(key, options.scope);

      return {
        allowed: true,
        remaining: Math.max(0, options.maxRequests - (entry.attempts + 1)),
      };
    },

    async cleanup(now = Date.now()): Promise<void> {
      await store.cleanup(now);
    },
  };
}

export const integrationRateLimiter = createIntegrationRateLimiter({
  maxRequests: 60,
  windowMs: 15 * 60 * 1000,
  scope: 'integration_api',
});

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}