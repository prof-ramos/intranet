import { db } from '@/lib/db';
import { rateLimits } from '@/lib/db/schema';
import { eq, and, sql, lt, lte, gt } from 'drizzle-orm';

export interface IpRateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export interface IpRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

function normalizeKey(ip: string, scope: string): string {
  return `${ip.trim()}:${scope}`;
}

function assertValidOptions(options: IpRateLimitOptions) {
  if (!Number.isInteger(options.windowMs) || options.windowMs <= 0) {
    throw new Error('windowMs must be a positive integer.');
  }

  if (!Number.isInteger(options.maxRequests) || options.maxRequests <= 0) {
    throw new Error('maxRequests must be a positive integer.');
  }
}

export async function consumeIpRateLimit(
  ip: string,
  scope: string,
  options: IpRateLimitOptions,
  now = Date.now(),
): Promise<IpRateLimitResult> {
  assertValidOptions(options);

  const key = normalizeKey(ip, scope);
  const nowDate = new Date(now);
  const expiresAt = new Date(now + options.windowMs);

  const [inserted] = await db
    .insert(rateLimits)
    .values({
      key,
      scope,
      attempts: 1,
      expiresAt,
      updatedAt: nowDate,
    })
    .onConflictDoNothing()
    .returning({
      attempts: rateLimits.attempts,
      expiresAt: rateLimits.expiresAt,
    });

  if (inserted) {
    return { allowed: true, remaining: options.maxRequests - 1 };
  }

  const [reset] = await db
    .update(rateLimits)
    .set({ attempts: 1, expiresAt, updatedAt: nowDate })
    .where(
      and(eq(rateLimits.key, key), eq(rateLimits.scope, scope), lte(rateLimits.expiresAt, nowDate)),
    )
    .returning({
      attempts: rateLimits.attempts,
      expiresAt: rateLimits.expiresAt,
    });

  if (reset) {
    return { allowed: true, remaining: options.maxRequests - 1 };
  }

  const [incremented] = await db
    .update(rateLimits)
    .set({
      attempts: sql`${rateLimits.attempts} + 1`,
      updatedAt: nowDate,
    })
    .where(
      and(
        eq(rateLimits.key, key),
        eq(rateLimits.scope, scope),
        gt(rateLimits.expiresAt, nowDate),
        lt(rateLimits.attempts, options.maxRequests),
      ),
    )
    .returning({
      attempts: rateLimits.attempts,
      expiresAt: rateLimits.expiresAt,
    });

  if (incremented) {
    return {
      allowed: true,
      remaining: Math.max(0, options.maxRequests - incremented.attempts),
    };
  }

  const [row] = await db
    .select({
      attempts: rateLimits.attempts,
      expiresAt: rateLimits.expiresAt,
    })
    .from(rateLimits)
    .where(and(eq(rateLimits.key, key), eq(rateLimits.scope, scope)))
    .limit(1);

  if (!row) {
    const [retriedInsert] = await db
      .insert(rateLimits)
      .values({
        key,
        scope,
        attempts: 1,
        expiresAt,
        updatedAt: nowDate,
      })
      .onConflictDoNothing()
      .returning({
        attempts: rateLimits.attempts,
        expiresAt: rateLimits.expiresAt,
      });

    if (retriedInsert) {
      return { allowed: true, remaining: options.maxRequests - 1 };
    }

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: options.windowMs,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfterMs: Math.max(0, row.expiresAt.getTime() - now),
  };
}
