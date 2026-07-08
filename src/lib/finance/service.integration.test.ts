import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { admins, associates, monthlyPayments } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

const runId = Date.now();
const cleanIds: number[] = [];
let adminId: number;
let associateId: number;

describe('finance service integration', () => {
  beforeAll(async () => {
    const [a] = await db.insert(admins).values({ name: 'Test Admin', email: `int-finance-${runId}@test.com`, passwordHash: 'hash', role: 'admin' }).returning({ id: admins.id });
    adminId = a.id;
    const [s] = await db.insert(associates).values({ fullName: 'Test Assoc', siape: `9${runId}`, primaryEmail: `int-assoc-${runId}@test.com`, assignment: 'SERE', functionalStatus: 'ativo', associationStatus: 'associado', contributionStatus: 'em_dia' }).returning({ id: associates.id });
    associateId = s.id;
  });

  afterAll(async () => {
    if (cleanIds.length) await db.delete(monthlyPayments).where(inArray(monthlyPayments.id, cleanIds));
    await db.delete(associates).where(eq(associates.id, associateId));
    await db.delete(admins).where(eq(admins.id, adminId));
  });

  it('service module loads correctly', async () => {
    const svc = await import('./service');
    expect(svc).toBeDefined();
  });
});
