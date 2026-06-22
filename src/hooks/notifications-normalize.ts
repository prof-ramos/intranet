import { parsePositiveIntParam } from '@/lib/routing/params';

export interface NotificationItem {
  id: number;
  userId: number | null;
  actorId: number | null;
  type: string;
  title: string;
  message: string;
  href: string | null;
  entityType: string | null;
  entityId: number | null;
  readAt: string | null;
  createdAt: string;
}

export type NotificationLike = Omit<
  Partial<NotificationItem>,
  'id' | 'userId' | 'actorId' | 'entityId' | 'createdAt' | 'readAt'
> & {
  id?: string | number | null;
  createdAt?: string | Date | null;
  readAt?: string | Date | null;
  userId?: string | number | null;
  user_id?: string | number | null;
  actorId?: string | number | null;
  actor_id?: string | number | null;
  entityType?: string | null;
  entity_type?: string | null;
  entityId?: string | number | null;
  entity_id?: string | number | null;
  href?: string | null;
  title?: string | null;
  message?: string | null;
  type?: string | null;
};

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString();
}

function toOptionalInt(value: string | number | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  return parsePositiveIntParam(value);
}

export function normalizeNotification(raw: NotificationLike): NotificationItem | null {
  const id = toOptionalInt(raw.id);

  if (id == null) {
    return null;
  }

  const createdAt = toIsoString(raw.createdAt) ?? new Date().toISOString();

  return {
    id,
    userId: toOptionalInt(raw.userId ?? raw.user_id),
    actorId: toOptionalInt(raw.actorId ?? raw.actor_id),
    type: raw.type ?? 'notification',
    title: raw.title ?? 'Notificação',
    message: raw.message ?? '',
    href: raw.href ?? null,
    entityType: raw.entityType ?? raw.entity_type ?? null,
    entityId: toOptionalInt(raw.entityId ?? raw.entity_id),
    readAt: toIsoString(raw.readAt),
    createdAt,
  };
}

export function upsertNotification(
  current: NotificationItem[],
  nextItem: NotificationItem,
): NotificationItem[] {
  const withoutCurrent = current.filter((item) => item.id !== nextItem.id);
  return [nextItem, ...withoutCurrent].sort((left, right) => {
    // Bolt: ISO 8601 strings sort lexicographically. Avoiding Date parsing makes this significantly faster.
    if (left.createdAt < right.createdAt) return 1;
    if (left.createdAt > right.createdAt) return -1;
    return 0;
  });
}

export function removeNotificationById(
  current: NotificationItem[],
  notificationId: number,
): NotificationItem[] {
  return current.filter((item) => item.id !== notificationId);
}

export function countUnread(items: NotificationItem[]) {
  return items.reduce((count, item) => count + (item.readAt ? 0 : 1), 0);
}

export function extractNotifications(
  payload:
    | NotificationLike[]
    | {
        notifications?: NotificationLike[];
        items?: NotificationLike[];
        data?: NotificationLike[];
        unreadCount?: number;
      },
): NotificationItem[] {
  const rawItems = Array.isArray(payload)
    ? payload
    : (payload.notifications ?? payload.items ?? payload.data ?? []);

  return rawItems
    .map(normalizeNotification)
    .filter((item): item is NotificationItem => item !== null)
    .sort((left, right) => {
      // Bolt: ISO 8601 strings sort lexicographically. Avoiding Date parsing makes this significantly faster.
      if (left.createdAt < right.createdAt) return 1;
      if (left.createdAt > right.createdAt) return -1;
      return 0;
    });
}
