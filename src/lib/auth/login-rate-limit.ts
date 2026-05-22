import { db } from '@/lib/db';
import { loginAttempts } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

import { hkdfDeriveKey, blindIndex, KEY_CONTEXTS } from '@/lib/crypto';
import { env } from '@/lib/env';

export interface LoginRateLimitOptions {
  maxAttempts: number;
  windowMs: number;
}

export interface LoginRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export interface RateLimitStore {
  consume(
    key: string,
    now: number,
    windowMs: number,
    maxAttempts: number,
  ): Promise<LoginRateLimitResult>;
  reset(key: string): Promise<void>;
  cleanup(now: number): Promise<void>;
}

/**
 * Derives the HMAC search key for email hashing from the master encryption key.
 * Falls back to the webhook encryption key if the master key is not set (backward compat).
 */
function getEmailSearchKey(): string {
  const masterKey = env.ENCRYPTION_MASTER_KEY ?? env.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY or ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY must be set for email hashing.',
    );
  }
  return hkdfDeriveKey(masterKey, KEY_CONTEXTS.piiSearch).toString('hex');
}

/**
 * Computes a deterministic HMAC-SHA-256 blind index for an email address.
 * Uses a dedicated search key derived via HKDF to prevent offline enumeration.
 */
export function hashEmail(email: string): string {
  return blindIndex(email.trim().toLowerCase(), getEmailSearchKey());
}

const dbStore: RateLimitStore = {
  async consume(key, now, windowMs, maxAttempts) {
    const expiresAt = new Date(now + windowMs);
    const emailHash = hashEmail(key);

    const rows = await db
      .insert(loginAttempts)
      .values({
        email: null,
        emailHash,
        attempts: 1,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: loginAttempts.emailHash,
        targetWhere: sql`${loginAttempts.emailHash} IS NOT NULL`,
        set: {
          attempts: sql`CASE 
            WHEN ${loginAttempts.expiresAt} <= ${new Date(now).toISOString()} THEN 1 
            ELSE ${loginAttempts.attempts} + 1 
          END`,
          expiresAt: sql`CASE 
            WHEN ${loginAttempts.expiresAt} <= ${new Date(now).toISOString()} THEN ${expiresAt.toISOString()} 
            ELSE ${loginAttempts.expiresAt} 
          END`,
          updatedAt: new Date(),
        },
      })
      .returning();

    const entry = rows[0];
    if (entry.attempts > maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: entry.expiresAt.getTime() - now,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - entry.attempts),
    };
  },

  async reset(key) {
    await db.delete(loginAttempts).where(eq(loginAttempts.emailHash, hashEmail(key)));
  },

  async cleanup(now) {
    await db
      .delete(loginAttempts)
      .where(sql`${loginAttempts.expiresAt} <= ${new Date(now).toISOString()}`);
  },
};

export function createLoginRateLimiter(
  options: LoginRateLimitOptions,
  store: RateLimitStore = dbStore,
) {
  return {
    async consume(key: string, now = Date.now()): Promise<LoginRateLimitResult> {
      return store.consume(key.trim().toLowerCase(), now, options.windowMs, options.maxAttempts);
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
