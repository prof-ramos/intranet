import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const runId = Date.now();
let adminId: number;

describe('assinafy service integration', () => {
  beforeAll(async () => {
    const [a] = await db.insert(admins).values({ name: 'Test Admin', email: `int-assinafy-${runId}@test.com`, passwordHash: 'hash', role: 'admin' }).returning({ id: admins.id });
    adminId = a.id;
  });

  afterAll(async () => {
    await db.delete(admins).where(eq(admins.id, adminId));
  });

  it('service module loads correctly', async () => {
    const svc = await import('./service');
    expect(svc).toBeDefined();
  });
});
