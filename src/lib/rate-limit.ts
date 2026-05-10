import { db } from '@/lib/db';
import { rateLimits } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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

export async function consumeIpRateLimit(
  ip: string,
  scope: string,
  options: IpRateLimitOptions,
  now = Date.now(),
): Promise<IpRateLimitResult> {
  const key = normalizeKey(ip, scope);
  const expiresAt = new Date(now + options.windowMs);

  const rows = await db
    .select()
    .from(rateLimits)
    .where(and(eq(rateLimits.key, key), eq(rateLimits.scope, scope)))
    .limit(1);

  if (rows.length === 0) {
    await db.insert(rateLimits).values({
      key,
      scope,
      attempts: 1,
      expiresAt,
    });
    return { allowed: true, remaining: options.maxRequests - 1 };
  }

  const row = rows[0];

  if (row.expiresAt.getTime() <= now) {
    await db
      .update(rateLimits)
      .set({ attempts: 1, expiresAt, updatedAt: new Date() })
      .where(eq(rateLimits.id, row.id));
    return { allowed: true, remaining: options.maxRequests - 1 };
  }

  if (row.attempts >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: row.expiresAt.getTime() - now,
    };
  }

  await db
    .update(rateLimits)
    .set({
      attempts: sql`${rateLimits.attempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(rateLimits.id, row.id));

  return {
    allowed: true,
    remaining: Math.max(0, options.maxRequests - (row.attempts + 1)),
  };
}
