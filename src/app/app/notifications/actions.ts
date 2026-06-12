'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import {
  defineNoInputServerAction,
  defineServerAction,
} from '@/lib/server-actions/define-form-action';
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

const notificationIdSchema = z
  .union([z.number(), z.string(), z.object({ id: z.string() })])
  .transform((input) => {
    const value = typeof input === 'object' ? input.id : input;
    if (typeof value === 'number') return value;
    return /^\d+$/.test(value) ? Number.parseInt(value, 10) : Number.NaN;
  })
  .refine((id) => Number.isSafeInteger(id) && id > 0, 'Notificação inválida.');
const notificationLimitSchema = z
  .number()
  .int()
  .transform((limit) => Math.min(Math.max(limit, 1), 50));

const _listNotificationsAction = defineServerAction({
  auth: 'any',
  schema: notificationLimitSchema,
  service: async (limit, user) => {
    const [notifications, unreadCount] = await Promise.all([
      getNotificationsForUser(user.userId, limit),
      getUnreadNotificationsCountForUser(user.userId),
    ]);

    return {
      notifications,
      unreadCount,
    };
  },
});

export async function listNotificationsAction(limit = 20) {
  return _listNotificationsAction(limit);
}

export const markNotificationReadAction = defineServerAction({
  auth: 'any',
  schema: notificationIdSchema,
  service: async (id, user) => {
    const updated = await markNotificationAsReadForUser({ id, userId: user.userId });

    if (updated) {
      revalidateNotifications();
    }

    return updated;
  },
});

export const markAllNotificationsReadAction = defineNoInputServerAction({
  auth: 'any',
  service: async (user) => {
    const updatedCount = await markAllNotificationsAsReadForUser(user.userId);

    if (updatedCount > 0) {
      revalidateNotifications();
    }

    return updatedCount;
  },
});
