import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from './actions';

const revalidatePath = vi.fn();
const revalidateTag = vi.fn();
const requireAuth = vi.fn();
const getNotificationsForUser = vi.fn();
const getUnreadNotificationsCountForUser = vi.fn();
const markNotificationAsReadForUser = vi.fn();
const markAllNotificationsAsReadForUser = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuth(...args),
}));

vi.mock('@/lib/notifications/service', () => ({
  getNotificationsForUser: (...args: unknown[]) => getNotificationsForUser(...args),
  getUnreadNotificationsCountForUser: (...args: unknown[]) =>
    getUnreadNotificationsCountForUser(...args),
  markNotificationAsReadForUser: (...args: unknown[]) => markNotificationAsReadForUser(...args),
  markAllNotificationsAsReadForUser: (...args: unknown[]) =>
    markAllNotificationsAsReadForUser(...args),
}));

describe('notification actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({
      userId: 9,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      mustChangePassword: false,
    });
  });

  it('lists only the authenticated user notifications', async () => {
    getNotificationsForUser.mockResolvedValue([{ id: 1 }]);
    getUnreadNotificationsCountForUser.mockResolvedValue(3);

    await expect(listNotificationsAction(200)).resolves.toEqual({
      notifications: [{ id: 1 }],
      unreadCount: 3,
    });

    expect(getNotificationsForUser).toHaveBeenCalledWith(9, 50);
    expect(getUnreadNotificationsCountForUser).toHaveBeenCalledWith(9);
  });

  it('marks a notification as read for the authenticated user only', async () => {
    markNotificationAsReadForUser.mockResolvedValue({ id: 4 });

    await expect(markNotificationReadAction({ id: '4' })).resolves.toEqual({ id: 4 });
    expect(markNotificationAsReadForUser).toHaveBeenCalledWith({ id: 4, userId: 9 });
    expect(revalidatePath).toHaveBeenCalledWith('/app');
    expect(revalidatePath).toHaveBeenCalledWith('/app/notifications');
    expect(revalidateTag).toHaveBeenCalledWith('notifications', 'max');
  });

  it('rejects invalid notification id', async () => {
    await expect(markNotificationReadAction(0)).rejects.toThrow('Notificação inválida.');
    expect(markNotificationAsReadForUser).not.toHaveBeenCalled();
  });

  it('marks all notifications as read for the authenticated user', async () => {
    markAllNotificationsAsReadForUser.mockResolvedValue(5);

    await expect(markAllNotificationsReadAction()).resolves.toBe(5);
    expect(markAllNotificationsAsReadForUser).toHaveBeenCalledWith(9);
    expect(revalidatePath).toHaveBeenCalledWith('/app');
    expect(revalidatePath).toHaveBeenCalledWith('/app/notifications');
    expect(revalidateTag).toHaveBeenCalledWith('notifications', 'max');
  });

  it('does not revalidate when no notification changes', async () => {
    markNotificationAsReadForUser.mockResolvedValue(null);

    await expect(markNotificationReadAction('4')).resolves.toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
