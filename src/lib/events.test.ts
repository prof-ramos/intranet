import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import {
  emitActivityCompleted,
  emitEvent,
  type ActivityCompletedMetadata,
  type OficioStatusChangedMetadata,
} from './events';

const createNotificationFromEvent = vi.fn();

vi.mock('@/lib/notifications/service', () => ({
  createNotificationFromEvent: (...args: unknown[]) => createNotificationFromEvent(...args),
}));

describe('events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits activity.completed with sanitized log metadata only', async () => {
    const infoSpy = vi.spyOn(Logger.prototype, 'info').mockImplementation(() => undefined);

    await emitEvent('activity.completed', {
      actorId: 1,
      recipientId: 2,
      entityType: 'activity',
      entityId: 7,
      title: 'Tarefa concluida',
      message: 'Uma tarefa foi concluida.',
      dedupeKey: 'activity:7:completed:2',
    });

    expect(createNotificationFromEvent).toHaveBeenCalledOnce();
    expect(createNotificationFromEvent).toHaveBeenCalledWith(
      'activity.completed',
      expect.objectContaining({
        actorId: 1,
        recipientId: 2,
        entityId: 7,
      }),
      undefined,
    );
    expect(infoSpy).toHaveBeenCalledWith('[emitEvent]', {
      type: 'activity.completed',
      actorId: 1,
      recipientId: 2,
      entityType: 'activity',
      entityId: 7,
    });
    infoSpy.mockRestore();
  });

  it('rejects invalid ids before dispatch', async () => {
    await expect(
      emitEvent('activity.completed', {
        actorId: 0,
        recipientId: 2,
        entityType: 'activity',
        entityId: 7,
        title: 'x',
        message: 'y',
      }),
    ).rejects.toThrow('actorId inválido.');

    expect(createNotificationFromEvent).not.toHaveBeenCalled();
  });

  it('accepts actorId null for oficio.status_changed (assertValidPayload bypass)', async () => {
    await emitEvent('oficio.status_changed', {
      actorId: null,
      recipientId: 2,
      entityType: 'oficio',
      entityId: 7,
      title: 'Status alterado',
      message: 'Ofício alterado.',
      dedupeKey: 'oficio.status_changed:7:signed',
    });

    expect(createNotificationFromEvent).toHaveBeenCalledWith(
      'oficio.status_changed',
      expect.objectContaining({ actorId: null }),
      undefined,
    );
  });

  it('accepts typed oficio.status_changed metadata', async () => {
    const metadata: OficioStatusChangedMetadata = {
      previousStatus: 'pending_signature',
      newStatus: 'partially_signed',
      documentId: 'doc-1',
    };

    await emitEvent('oficio.status_changed', {
      actorId: null,
      recipientId: 2,
      entityType: 'oficio',
      entityId: 7,
      title: 'Status alterado',
      message: 'Ofício alterado.',
      metadata,
      dedupeKey: 'oficio.status_changed:7:partially_signed',
    });

    expect(createNotificationFromEvent).toHaveBeenCalledWith(
      'oficio.status_changed',
      expect.objectContaining({ metadata }),
      undefined,
    );
  });

  it('supports the activity-completed compatibility emitter used by activities service', async () => {
    await emitActivityCompleted({
      activityId: 12,
      title: 'Fechar pendencia',
      createdBy: 4,
      assigneeId: 9,
      associateId: 20,
      completedAt: '2026-05-13T12:00:00.000Z',
    });

    const expectedMetadata: ActivityCompletedMetadata = {
      activityId: 12,
      assigneeId: 9,
      associateId: 20,
      completedAt: '2026-05-13T12:00:00.000Z',
    };

    expect(createNotificationFromEvent).toHaveBeenCalledWith(
      'activity.completed',
      {
        actorId: 4,
        recipientId: 4,
        entityType: 'activity',
        entityId: 12,
        title: 'Atividade concluída',
        message: 'A atividade "Fechar pendencia" foi concluída.',
        href: '/app/atividades',
        metadata: expectedMetadata,
        dedupeKey: 'activity.completed:12:4',
      },
      undefined,
    );
  });
});
