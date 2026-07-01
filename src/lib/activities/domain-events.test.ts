import { describe, expect, it, vi, beforeEach } from 'vitest';
import { emitActivityDomainEvents, toIsoDate } from './domain-events';
import type { Activity } from '@/lib/db/schema';

const { txMock, nextId } = vi.hoisted(() => ({
  txMock: Symbol('tx'),
  nextId: { value: 1 },
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: vi.fn().mockImplementation(async (input: { type: string }) => ({
    id: nextId.value++,
    type: input.type,
  })),
}));

function buildActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    title: 'Atividade',
    description: null,
    status: 'a_fazer',
    priority: 'normal',
    assigneeId: null,
    associateId: null,
    dueDate: null,
    tags: [],
    createdBy: 5,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    completedAt: null,
    position: 1000,
    ...overrides,
  };
}

describe('toIsoDate', () => {
  it('returns null for null/undefined', () => {
    expect(toIsoDate(null)).toBeNull();
    expect(toIsoDate(undefined)).toBeNull();
  });

  it('returns null for invalid date strings', () => {
    expect(toIsoDate('not-a-date')).toBeNull();
  });

  it('normalizes Date instances to ISO', () => {
    const date = new Date('2026-05-30T12:00:00.000Z');
    expect(toIsoDate(date)).toBe('2026-05-30T12:00:00.000Z');
  });

  it('normalizes ISO strings', () => {
    expect(toIsoDate('2026-05-30T12:00:00.000Z')).toBe('2026-05-30T12:00:00.000Z');
  });
});

describe('emitActivityDomainEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nextId.value = 1;
  });

  it('emits no events when nothing changed', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity();
    const ids = await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: 7,
      current,
      updated: current,
    });
    expect(ids).toEqual([]);
    expect(outbox.emitDomainEvent).not.toHaveBeenCalled();
  });

  it('emits activity.status_changed on any status transition', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity({ status: 'a_fazer' });
    const updated = buildActivity({ status: 'em_andamento' });
    await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: 7,
      current,
      updated,
    });
    expect(outbox.emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity.status_changed',
        entityType: 'activity',
        entityId: 1,
        actorAdminId: 7,
        payload: expect.objectContaining({
          activityId: 1,
          previousStatus: 'a_fazer',
          status: 'em_andamento',
          createdById: 5,
          links: { app: '/app/atividades/1' },
        }),
      }),
      txMock,
    );
  });

  it('emits activity.completed when transitioning into concluido', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity({ status: 'em_andamento' });
    const updated = buildActivity({
      status: 'concluido',
      completedAt: new Date('2026-05-02T10:00:00.000Z'),
    });
    await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: 7,
      current,
      updated,
    });
    expect(outbox.emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity.completed',
        payload: expect.objectContaining({
          activityId: 1,
          completedAt: '2026-05-02T10:00:00.000Z',
          createdById: 5,
          links: { app: '/app/atividades/1' },
        }),
      }),
      txMock,
    );
  });

  it('emits both status_changed and completed on first completion (parallel events)', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity({ status: 'em_andamento' });
    const updated = buildActivity({ status: 'concluido', completedAt: new Date('2026-05-02T10:00:00.000Z') });
    const ids = await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: 7,
      current,
      updated,
    });
    const types = vi.mocked(outbox.emitDomainEvent).mock.calls.map((c) => c[0].type);
    expect(types).toContain('activity.status_changed');
    expect(types).toContain('activity.completed');
    expect(ids).toHaveLength(2);
  });

  it('emits activity.assigned when assignee changes to another person', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity({ assigneeId: 2 });
    const updated = buildActivity({ assigneeId: 9 });
    await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: 7,
      current,
      updated,
    });
    expect(outbox.emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity.assigned',
        payload: expect.objectContaining({
          activityId: 1,
          previousAssigneeId: 2,
          assigneeId: 9,
          createdById: 5,
          links: { app: '/app/atividades/1' },
        }),
      }),
      txMock,
    );
  });

  it('skips activity.assigned on self-assignment (canonical guard)', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity({ assigneeId: 2 });
    const updated = buildActivity({ assigneeId: 7 });
    await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: 7, // actor === new assignee → self-assignment
      current,
      updated,
    });
    const types = vi.mocked(outbox.emitDomainEvent).mock.calls.map((c) => c[0].type);
    expect(types).not.toContain('activity.assigned');
  });

  it('emits activity.assigned on system reassignment to a real person (actorId === null)', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity({ assigneeId: null });
    const updated = buildActivity({ assigneeId: 9 });
    await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: null, // ação de sistema; number !== null → emite
      current,
      updated,
    });
    const types = vi.mocked(outbox.emitDomainEvent).mock.calls.map((c) => c[0].type);
    expect(types).toContain('activity.assigned');
  });

  it('skips activity.assigned on system unassignment (null -> null with actorId === null)', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    // assigneeId não muda (null -> null) → nem entra no branch de assigned.
    const current = buildActivity({ assigneeId: null });
    const updated = buildActivity({ assigneeId: null });
    await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: null,
      current,
      updated,
    });
    const types = vi.mocked(outbox.emitDomainEvent).mock.calls.map((c) => c[0].type);
    expect(types).not.toContain('activity.assigned');
  });

  it('emits activity.priority_changed on priority change', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity({ priority: 'normal' });
    const updated = buildActivity({ priority: 'urgente' });
    await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: 7,
      current,
      updated,
    });
    expect(outbox.emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity.priority_changed',
        payload: expect.objectContaining({
          activityId: 1,
          previousPriority: 'normal',
          priority: 'urgente',
          createdById: 5,
          links: { app: '/app/atividades/1' },
        }),
      }),
      txMock,
    );
  });

  it('emits activity.due_date_changed when due date changes (null -> datetime)', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity({ dueDate: null });
    const updated = buildActivity({ dueDate: '2026-05-30T00:00:00.000Z' });
    await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: 7,
      current,
      updated,
    });
    expect(outbox.emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity.due_date_changed',
        payload: expect.objectContaining({
          activityId: 1,
          previousDueDate: null,
          dueDate: '2026-05-30T00:00:00.000Z',
          createdById: 5,
          links: { app: '/app/atividades/1' },
        }),
      }),
      txMock,
    );
  });

  it('emits activity.due_date_changed when due date is cleared (datetime -> null)', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity({ dueDate: '2026-05-30T00:00:00.000Z' });
    const updated = buildActivity({ dueDate: null });
    await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: 7,
      current,
      updated,
    });
    const types = vi.mocked(outbox.emitDomainEvent).mock.calls.map((c) => c[0].type);
    expect(types).toContain('activity.due_date_changed');
  });

  it('emits one event per changed field when multiple fields change at once', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity({
      status: 'a_fazer',
      priority: 'normal',
      dueDate: null,
      assigneeId: 2,
    });
    const updated = buildActivity({
      status: 'em_andamento',
      priority: 'alta',
      dueDate: '2026-06-15T00:00:00.000Z',
      assigneeId: 9,
    });
    const ids = await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: 7,
      current,
      updated,
    });
    const types = vi.mocked(outbox.emitDomainEvent).mock.calls.map((c) => c[0].type);
    expect(types).toEqual(
      expect.arrayContaining([
        'activity.status_changed',
        'activity.assigned',
        'activity.priority_changed',
        'activity.due_date_changed',
      ]),
    );
    expect(ids).toHaveLength(4);
  });

  it('does not emit completed when already concluido (idempotent)', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const current = buildActivity({ status: 'concluido', completedAt: new Date('2026-05-01T00:00:00.000Z') });
    const updated = buildActivity({ status: 'concluido', completedAt: new Date('2026-05-01T00:00:00.000Z') });
    await emitActivityDomainEvents({
      tx: txMock as unknown as Parameters<typeof emitActivityDomainEvents>[0]['tx'],
      actorId: 7,
      current,
      updated,
    });
    const types = vi.mocked(outbox.emitDomainEvent).mock.calls.map((c) => c[0].type);
    expect(types).not.toContain('activity.completed');
    expect(types).not.toContain('activity.status_changed');
  });
});