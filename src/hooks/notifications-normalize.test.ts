import { describe, expect, it } from 'vitest';
import {
  countUnread,
  extractNotifications,
  normalizeNotification,
  removeNotificationById,
  upsertNotification,
} from './notifications-normalize';

describe('notifications normalization', () => {
  it('normalizes a valid payload item', () => {
    expect(
      normalizeNotification({
        id: '12',
        user_id: '7',
        actor_id: '9',
        entity_id: '22',
        title: 'Nova atividade',
        createdAt: '2026-05-17T12:00:00.000Z',
      }),
    ).toEqual({
      id: 12,
      userId: 7,
      actorId: 9,
      type: 'notification',
      title: 'Nova atividade',
      message: '',
      href: null,
      entityType: null,
      entityId: 22,
      readAt: null,
      createdAt: '2026-05-17T12:00:00.000Z',
    });
  });

  it('rejects payload items with non-decimal id encodings', () => {
    expect(normalizeNotification({ id: '1e2' })).toBeNull();
    expect(normalizeNotification({ id: '0x10' })).toBeNull();
    expect(normalizeNotification({ id: 0 })).toBeNull();
    expect(normalizeNotification({ id: -2 })).toBeNull();
  });

  it('ignores non-decimal optional foreign ids', () => {
    expect(
      normalizeNotification({
        id: '12',
        user_id: '1e2',
        actor_id: '0x10',
        entity_id: 'abc',
      }),
    ).toEqual(
      expect.objectContaining({
        id: 12,
        userId: null,
        actorId: null,
        entityId: null,
      }),
    );
  });

  it('extracts and sorts notifications from payload containers', () => {
    const result = extractNotifications({
      items: [
        { id: '2', createdAt: '2026-05-17T10:00:00.000Z' },
        { id: '1', createdAt: '2026-05-17T12:00:00.000Z' },
      ],
    });

    expect(result.map((item) => item.id)).toEqual([1, 2]);
  });

  it('upserts notifications by id and keeps newest-first ordering', () => {
    const current = extractNotifications([
      { id: '1', title: 'Antiga', createdAt: '2026-05-17T10:00:00.000Z' },
      { id: '2', title: 'Atual', createdAt: '2026-05-17T11:00:00.000Z' },
    ]);

    const updated = upsertNotification(current, {
      ...current[1],
      title: 'Antiga atualizada',
      createdAt: '2026-05-17T12:00:00.000Z',
    });

    expect(updated.map((item) => item.id)).toEqual([1, 2]);
    expect(updated[0]?.title).toBe('Antiga atualizada');
  });

  it('removes notifications by id', () => {
    const current = extractNotifications([
      { id: '1', createdAt: '2026-05-17T10:00:00.000Z' },
      { id: '2', createdAt: '2026-05-17T11:00:00.000Z' },
    ]);

    expect(removeNotificationById(current, 1).map((item) => item.id)).toEqual([2]);
  });

  it('counts only unread notifications', () => {
    expect(
      countUnread([
        {
          id: 1,
          userId: 1,
          actorId: null,
          type: 'notification',
          title: 'A',
          message: '',
          href: null,
          entityType: null,
          entityId: null,
          readAt: null,
          createdAt: '2026-05-17T12:00:00.000Z',
        },
        {
          id: 2,
          userId: 1,
          actorId: null,
          type: 'notification',
          title: 'B',
          message: '',
          href: null,
          entityType: null,
          entityId: null,
          readAt: '2026-05-17T12:00:00.000Z',
          createdAt: '2026-05-17T11:00:00.000Z',
        },
      ]),
    ).toBe(1);
  });
});
