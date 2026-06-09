import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNotificationFromEvent,
  getNotificationsForUser,
  getUnreadNotificationsCountForUser,
  markAllNotificationsAsReadForUser,
  markNotificationAsReadForUser,
} from './service';
import {
  countUnreadNotificationsForUser,
  createNotification,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from './repository';

vi.mock('./repository', () => ({
  createNotification: vi.fn(),
  listNotificationsForUser: vi.fn(),
  countUnreadNotificationsForUser: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

describe('notifications service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips self-notifications', async () => {
    await expect(
      createNotificationFromEvent('activity.completed', {
        actorId: 7,
        recipientId: 7,
        entityType: 'activity',
        entityId: 10,
        title: 'Titulo',
        message: 'Mensagem',
      }),
    ).resolves.toBeNull();

    expect(createNotification).not.toHaveBeenCalled();
  });

  it('creates notification with actorId null for oficio.status_changed', async () => {
    await createNotificationFromEvent('oficio.status_changed', {
      actorId: null,
      recipientId: 7,
      entityType: 'oficio',
      entityId: 10,
      title: 'Status do ofício alterado',
      message: 'O ofício 001/2026 teve status alterado.',
      dedupeKey: 'oficio.status_changed:10:partially_signed',
    });

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        type: 'oficio.status_changed',
        entityType: 'oficio',
        entityId: 10,
        dedupeKey: 'oficio.status_changed:10:partially_signed',
      }),
      undefined,
    );
  });

  it('validates notification payload before creating', async () => {
    await expect(
      createNotificationFromEvent('activity.completed', {
        actorId: 0,
        recipientId: 7,
        entityType: 'activity',
        entityId: 10,
        title: 'Titulo',
        message: 'Mensagem',
      }),
    ).rejects.toThrow('actorId inválido.');

    await expect(
      createNotificationFromEvent('activity.completed', {
        actorId: 2,
        recipientId: 7,
        entityType: 'activity',
        entityId: 10,
        title: '   ',
        message: 'Mensagem',
      }),
    ).rejects.toThrow('Título da notificação é obrigatório.');
  });

  it('clamps notification listing limit', async () => {
    vi.mocked(listNotificationsForUser).mockResolvedValue([]);

    await getNotificationsForUser(5, 200);

    expect(listNotificationsForUser).toHaveBeenCalledWith(5, 50, undefined);
  });

  it('validates ids for reads and counts', async () => {
    await expect(getNotificationsForUser(0)).rejects.toThrow('userId inválido.');
    await expect(getUnreadNotificationsCountForUser(0)).rejects.toThrow('userId inválido.');
    await expect(markNotificationAsReadForUser({ id: 0, userId: 1 })).rejects.toThrow(
      'Notificação inválida.',
    );
    await expect(markAllNotificationsAsReadForUser(0)).rejects.toThrow('userId inválido.');

    expect(countUnreadNotificationsForUser).not.toHaveBeenCalled();
    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(markAllNotificationsRead).not.toHaveBeenCalled();
  });
});
