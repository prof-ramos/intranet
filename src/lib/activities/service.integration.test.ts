import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { activities, admins, auditLogs, domainEvents } from '@/lib/db/schema';
import { createActivityService, updateActivityService } from './service';

const runId = `${Date.now()}-${process.pid}`;
const activityIds: number[] = [];
let adminId: number | null = null;

function requireAdminId(): number {
  if (adminId === null) throw new Error('activities admin fixture was not created');
  return adminId;
}

describe('activities service integration', () => {
  beforeAll(async () => {
    const [admin] = await db
      .insert(admins)
      .values({
        name: 'Admin Atividades Sintético',
        email: `integration-activities-${runId}@example.test`,
        passwordHash: 'integration-test-placeholder',
        role: 'admin',
      })
      .returning({ id: admins.id });
    adminId = admin.id;
  });

  afterAll(async () => {
    if (activityIds.length > 0) {
      await db
        .delete(domainEvents)
        .where(
          and(eq(domainEvents.entityType, 'activity'), inArray(domainEvents.entityId, activityIds)),
        );
      await db
        .delete(auditLogs)
        .where(and(eq(auditLogs.entityType, 'activity'), inArray(auditLogs.entityId, activityIds)));
      await db.delete(activities).where(inArray(activities.id, activityIds));
    }
    if (adminId !== null) await db.delete(admins).where(eq(admins.id, adminId));
  });

  it('commits creation and completion with their exact outbox events', async () => {
    const created = await createActivityService({
      title: `Atividade sintética ${runId}`,
      description: 'Fixture sem dados pessoais',
      status: 'a_fazer',
      priority: 'normal',
      assigneeId: null,
      associateId: null,
      dueDate: null,
      tags: ['integracao', 'postgres'],
      createdBy: requireAdminId(),
    });
    activityIds.push(created.id);

    const creationEvents = await db
      .select()
      .from(domainEvents)
      .where(and(eq(domainEvents.entityType, 'activity'), eq(domainEvents.entityId, created.id)));
    expect(creationEvents).toHaveLength(1);
    expect(creationEvents[0]).toMatchObject({ eventType: 'activity.created' });
    expect(creationEvents[0].payload).toMatchObject({
      activityId: created.id,
      status: 'a_fazer',
      createdById: requireAdminId(),
    });

    const completed = await updateActivityService({
      id: created.id,
      actorId: requireAdminId(),
      status: 'concluido',
    });
    const [persisted] = await db.select().from(activities).where(eq(activities.id, created.id));
    const allEvents = await db
      .select({ eventType: domainEvents.eventType, payload: domainEvents.payload })
      .from(domainEvents)
      .where(and(eq(domainEvents.entityType, 'activity'), eq(domainEvents.entityId, created.id)));

    expect(completed.status).toBe('concluido');
    expect(persisted.status).toBe('concluido');
    expect(persisted.completedAt).not.toBeNull();
    expect(allEvents.map((event) => event.eventType).sort()).toEqual([
      'activity.completed',
      'activity.created',
      'activity.status_changed',
    ]);
    expect(
      allEvents.find((event) => event.eventType === 'activity.status_changed')?.payload,
    ).toMatchObject({ previousStatus: 'a_fazer', status: 'concluido' });
  });

  it('rolls back the service mutation when the outbox insert violates a real FK', async () => {
    const [fixture] = await db
      .insert(activities)
      .values({
        title: `Atividade para rollback ${runId}`,
        status: 'a_fazer',
        priority: 'alta',
        createdBy: requireAdminId(),
      })
      .returning();
    activityIds.push(fixture.id);

    await expect(
      updateActivityService({
        id: fixture.id,
        actorId: 2_147_483_647,
        status: 'em_andamento',
      }),
    ).rejects.toThrow(/insert into "domain_events"/i);

    const [persisted] = await db.select().from(activities).where(eq(activities.id, fixture.id));
    const events = await db
      .select({ id: domainEvents.id })
      .from(domainEvents)
      .where(and(eq(domainEvents.entityType, 'activity'), eq(domainEvents.entityId, fixture.id)));

    expect(persisted.status).toBe('a_fazer');
    expect(events).toEqual([]);
  });
});
