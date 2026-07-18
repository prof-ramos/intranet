import { afterAll, describe, expect, it } from 'vitest';
import { inArray, max, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { ensureDevelopmentAdminInDatabase } from '../../../scripts/dev-admin-store';

const insertedIds: number[] = [];

afterAll(async () => {
  if (insertedIds.length > 0) {
    await db.delete(admins).where(inArray(admins.id, insertedIds));
  }
  await db.execute(sql`
    SELECT setval(
      'admins_id_seq',
      GREATEST(
        (SELECT COALESCE(MAX(id), 1) FROM admins),
        (SELECT last_value FROM admins_id_seq)
      ),
      true
    )
  `);
});

describe('development admin PostgreSQL adapter', () => {
  it('creates and reuses the configured id while keeping automatic identity above the maximum', async () => {
    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`LOCK TABLE admins IN EXCLUSIVE MODE`);
      const [{ maxId }] = await tx.select({ maxId: max(admins.id) }).from(admins);
      const userId = Number(maxId ?? 0) + 2;
      const env = {
        SKIP_AUTH: 'true',
        DEV_USER_ID: String(userId),
        DEV_USER_NAME: 'Integration Dev Actor',
        DEV_USER_EMAIL: `dev-integration-${userId}@asof.local`,
        DEV_USER_ROLE: 'admin',
      };

      await expect(
        ensureDevelopmentAdminInDatabase(tx, env, async () => 'unusable-integration-hash'),
      ).resolves.toBe(userId);
      await expect(
        ensureDevelopmentAdminInDatabase(tx, env, async () => 'unused-second-hash'),
      ).resolves.toBe(userId);

      const [automatic] = await tx
        .insert(admins)
        .values({
          name: 'Automatic Identity Probe',
          email: `automatic-identity-${userId}@asof.local`,
          passwordHash: 'unusable-integration-hash',
          role: 'admin',
          isActive: true,
          mustChangePassword: false,
        })
        .returning({ id: admins.id });

      return { userId, automaticId: automatic.id };
    });
    insertedIds.push(created.userId, created.automaticId);

    expect(created.automaticId).toBeGreaterThan(created.userId);
  });
});
