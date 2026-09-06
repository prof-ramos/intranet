import type { NotificationEntity, NotificationEventPayload, NotificationEventType } from './types';
import type { DbExecutor } from '@/lib/db';
import {
  countUnreadNotificationsForUser,
  createNotification,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from './repository';

export interface NotificationDto {
  id: number;
  type: NotificationEventType;
  title: string;
  message: string;
  href: string | null;
  entityType: NotificationEntity | null;
  entityId: number | null;
  readAt: string | null;
  createdAt: string;
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} inválido.`);
  }
}

export async function createNotificationFromEvent(
  type: NotificationEventType,
  payload: NotificationEventPayload,
  tx?: DbExecutor,
) {
  assertPositiveInteger(payload.recipientId, 'recipientId');
  if (payload.actorId !== null) assertPositiveInteger(payload.actorId, 'actorId');

  if (!payload.title.trim()) {
    throw new Error('Título da notificação é obrigatório.');
  }

  if (!payload.message.trim()) {
    throw new Error('Mensagem da notificação é obrigatória.');
  }

  if (payload.recipientId === payload.actorId) {
    return null;
  }

  return createNotification(
    {
      userId: payload.recipientId,
      actorId: payload.actorId,
      type,
      title: payload.title.trim(),
      message: payload.message.trim(),
      href: payload.href ?? null,
      entityType: payload.entityType ?? null,
      entityId: payload.entityId ?? null,
      // Persistence layer stores open jsonb; emit sites use typed NotificationMetadata.
      metadata: (payload.metadata ?? null) as Record<string, unknown> | null,
      dedupeKey: payload.dedupeKey ?? null,
    },
    tx,
  );
}

export async function getNotificationsForUser(userId: number, limit = 20, tx?: DbExecutor) {
  assertPositiveInteger(userId, 'userId');

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const rows = await listNotificationsForUser(userId, safeLimit, tx);
  return rows.map(toNotificationDto);
}

export async function getUnreadNotificationsCountForUser(userId: number, tx?: DbExecutor) {
  assertPositiveInteger(userId, 'userId');
  return countUnreadNotificationsForUser(userId, tx);
}

export async function markNotificationAsReadForUser(
  input: { id: number; userId: number },
  tx?: DbExecutor,
) {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new Error('Notificação inválida.');
  }
  assertPositiveInteger(input.userId, 'userId');
  const updated = await markNotificationRead(input, tx);
  return updated ? toNotificationDto(updated) : null;
}

export async function markAllNotificationsAsReadForUser(userId: number, tx?: DbExecutor) {
  assertPositiveInteger(userId, 'userId');
  const updated = await markAllNotificationsRead(userId, tx);
  return updated.length;
}

export function toNotificationDto(notification: {
  id: number;
  type: NotificationEventType;
  title: string;
  message: string;
  href: string | null;
  entityType: NotificationEntity | null;
  entityId: number | null;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    href: notification.href,
    entityType: notification.entityType,
    entityId: notification.entityId,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  } satisfies NotificationDto;
}
