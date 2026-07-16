import { db } from '@/lib/db';
import { rateLimits } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { getTrustedClientIp } from '@/lib/ip';
import type { RequestPrincipal } from '@/lib/integrations/types';

export interface IntegrationRateLimitOptions {
  maxRequests: number;
  windowMs: number;
  scope: string;
  cleanupIntervalMs?: number;
}

export interface IntegrationRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

interface AtomicIncrementResult {
  attempts: number;
  expiresAt: number;
}

export interface IntegrationRateLimitStore {
  atomicIncrement(
    key: string,
    scope: string,
    now: number,
    windowMs: number,
  ): Promise<AtomicIncrementResult>;
  cleanup(now: number): Promise<void>;
}

const dbStore: IntegrationRateLimitStore = {
  async atomicIncrement(key, scope, now, windowMs) {
    const expiresAt = new Date(now + windowMs);
    const nowDate = new Date(now);

    const result = await db
      .insert(rateLimits)
      .values({
        key,
        scope,
        attempts: 1,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [rateLimits.key, rateLimits.scope],
        set: {
          attempts: sql`CASE WHEN ${rateLimits.expiresAt} <= ${nowDate.toISOString()} THEN 1 ELSE ${rateLimits.attempts} + 1 END`,
          expiresAt: sql`CASE WHEN ${rateLimits.expiresAt} <= ${nowDate.toISOString()} THEN ${expiresAt.toISOString()} ELSE ${rateLimits.expiresAt} END`,
          updatedAt: new Date(),
        },
      })
      .returning({
        attempts: rateLimits.attempts,
        expiresAt: rateLimits.expiresAt,
      });

    return {
      attempts: result[0].attempts,
      expiresAt: result[0].expiresAt.getTime(),
    };
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
  if (!Number.isInteger(options.maxRequests) || options.maxRequests < 1) {
    throw new Error('maxRequests must be a positive integer.');
  }
  if (!Number.isInteger(options.windowMs) || options.windowMs < 1) {
    throw new Error('windowMs must be a positive integer.');
  }
  if (!options.scope.trim()) {
    throw new Error('scope is required.');
  }

  if (
    options.cleanupIntervalMs != null &&
    (!Number.isInteger(options.cleanupIntervalMs) || options.cleanupIntervalMs < 1)
  ) {
    throw new Error('cleanupIntervalMs must be a positive integer.');
  }

  const cleanupIntervalMs = options.cleanupIntervalMs ?? 5 * 60 * 1000;
  let lastCleanupAt: number | null = null;

  return {
    async consume(key: string, now = Date.now()): Promise<IntegrationRateLimitResult> {
      if (lastCleanupAt == null || now - lastCleanupAt >= cleanupIntervalMs) {
        lastCleanupAt = now;
        try {
          await store.cleanup(now);
        } catch (error) {
          lastCleanupAt = null;
          throw error;
        }
      }

      const { attempts, expiresAt } = await store.atomicIncrement(
        key,
        options.scope,
        now,
        options.windowMs,
      );

      if (attempts > options.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(expiresAt - now, 0),
        };
      }

      return {
        allowed: true,
        remaining: options.maxRequests - attempts,
      };
    },

    async cleanup(now = Date.now()): Promise<void> {
      await store.cleanup(now);
    },
  };
}

export const integrationPreAuthRateLimiter = createIntegrationRateLimiter({
  maxRequests: 60,
  windowMs: 15 * 60 * 1000,
  scope: 'integration_api_preauth',
});

export const integrationPrincipalRateLimiter = createIntegrationRateLimiter({
  maxRequests: 60,
  windowMs: 15 * 60 * 1000,
  scope: 'integration_api_principal',
});

export function getClientIp(request: Request): string {
  return getTrustedClientIp(request.headers);
}

export function getIntegrationPreAuthRateLimitKey(request: Request): string {
  return `ip:${getClientIp(request)}`;
}

export function getIntegrationPrincipalRateLimitKey(principal: RequestPrincipal): string {
  return principal.kind === 'session'
    ? `session:${principal.userId}`
    : `api-key:${principal.keyId}`;
}
