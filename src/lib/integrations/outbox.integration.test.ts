import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { domainEvents } from '@/lib/db/schema/integrations';
import { emitDomainEvent } from '@/lib/integrations/outbox';

const hasTestEnv = existsSync(resolve(process.cwd(), '.env.test.local'));

describe.skipIf(!hasTestEnv)('emitDomainEvent integration (real PG)', () => {
  const TEST_ENTITY_ID = 900000001;
  const validLegalConsultationCreatedPayload = {
    internalNumber: 'JUR-TEST-900000001',
    status: 'aberta',
    associateId: null,
    slaDueDate: new Date('2026-05-20T12:00:00.000Z').toISOString(),
    title: 'Consulta de caracterizacao',
    links: { app: `/app/juridico/consultas/${TEST_ENTITY_ID}` },
  };

  it('rolls back the domain_events insert when the wrapping tx rolls back', async () => {
    await expect(
      db.transaction(async (tx) => {
        await emitDomainEvent(
          { type: 'legal_consultation.created', entityType: 'legal_consultation', entityId: TEST_ENTITY_ID, actorAdminId: null, payload: validLegalConsultationCreatedPayload },
          tx,
        );
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');
    const rows = await db.select({ id: domainEvents.id })
      .from(domainEvents)
      .where(eq(domainEvents.entityId, TEST_ENTITY_ID));
    expect(rows).toHaveLength(0);
  });

  it('persists the domain_events insert when the wrapping tx commits', async () => {
    await db.transaction(async (tx) => {
      await emitDomainEvent(
        { type: 'legal_consultation.created', entityType: 'legal_consultation', entityId: TEST_ENTITY_ID, actorAdminId: null, payload: validLegalConsultationCreatedPayload },
        tx,
      );
    });
    const rows = await db.select({ id: domainEvents.id })
      .from(domainEvents)
      .where(eq(domainEvents.entityId, TEST_ENTITY_ID));
    expect(rows).toHaveLength(1);
    await db.delete(domainEvents).where(eq(domainEvents.entityId, TEST_ENTITY_ID));
  });
});