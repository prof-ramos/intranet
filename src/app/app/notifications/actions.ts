'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { defineServerAction } from '@/lib/server-actions/define-form-action';
import {
  getNotificationsForUser,
  getUnreadNotificationsCountForUser,
  markAllNotificationsAsReadForUser,
  markNotificationAsReadForUser,
} from '@/lib/notifications/service';

function revalidateNotifications() {
  revalidatePath('/app/notifications');
  revalidateTag('notifications', 'max');
}

function parseNotificationId(input: { id: string } | string | number) {
  if (typeof input === 'number') {
    return input;
  }

  if (typeof input === 'string') {
    return /^\d+$/.test(input) ? Number.parseInt(input, 10) : Number.NaN;
  }

  return /^\d+$/.test(input.id) ? Number.parseInt(input.id, 10) : Number.NaN;
}

export const listNotificationsAction = defineServerAction({
  auth: 'any',
  service: async (limit: number, user) => {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const [notifications, unreadCount] = await Promise.all([
      getNotificationsForUser(user.userId, safeLimit),
      getUnreadNotificationsCountForUser(user.userId),
    ]);

    return {
      notifications,
      unreadCount,
    };
  },
});

export const markNotificationReadAction = defineServerAction({
  auth: 'any',
  service: async (input: { id: string } | string | number, user) => {
    const id = parseNotificationId(input);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Notificação inválida.');
    }

    const updated = await markNotificationAsReadForUser({ id, userId: user.userId });

    if (updated) {
      revalidateNotifications();
    }

    return updated;
  },
});

export const markAllNotificationsReadAction = defineServerAction({
  auth: 'any',
  service: async (_input: void, user) => {
    const updatedCount = await markAllNotificationsAsReadForUser(user.userId);

    if (updatedCount > 0) {
      revalidateNotifications();
    }

    return updatedCount;
  },
});
