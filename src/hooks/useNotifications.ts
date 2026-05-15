'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/app/notifications/actions';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
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

interface UseNotificationsOptions {
  userId: number;
}

interface UseNotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

type NotificationLike = Partial<NotificationItem> & {
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

type NotificationsListPayload =
  | NotificationLike[]
  | {
      notifications?: NotificationLike[];
      items?: NotificationLike[];
      data?: NotificationLike[];
      unreadCount?: number;
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

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNotification(raw: NotificationLike): NotificationItem | null {
  const id = toNumber(raw.id);

  if (!id) {
    return null;
  }

  const createdAt = toIsoString(raw.createdAt) ?? new Date().toISOString();

  return {
    id,
    userId: toNumber(raw.userId ?? raw.user_id),
    actorId: toNumber(raw.actorId ?? raw.actor_id),
    type: raw.type ?? 'notification',
    title: raw.title ?? 'Notificação',
    message: raw.message ?? '',
    href: raw.href ?? null,
    entityType: raw.entityType ?? raw.entity_type ?? null,
    entityId: toNumber(raw.entityId ?? raw.entity_id),
    readAt: toIsoString(raw.readAt),
    createdAt,
  };
}

function sortNotifications(items: NotificationItem[]) {
  return [...items].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function countUnread(items: NotificationItem[]) {
  return items.reduce((count, item) => count + (item.readAt ? 0 : 1), 0);
}

function extractNotifications(payload: NotificationsListPayload): NotificationItem[] {
  const rawItems = Array.isArray(payload)
    ? payload
    : payload.notifications ?? payload.items ?? payload.data ?? [];

  return sortNotifications(rawItems.map(normalizeNotification).filter((item): item is NotificationItem => item !== null));
}

export function useNotifications({ userId }: UseNotificationsOptions): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(() => countUnread(notifications), [notifications]);

  const loadNotifications = useCallback(async () => {
    const payload = (await listNotificationsAction()) as NotificationsListPayload;
    const nextNotifications = extractNotifications(payload);
    setNotifications(nextNotifications);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await loadNotifications();
    } catch {
      setError('Não foi possível carregar as notificações.');
    } finally {
      setLoading(false);
    }
  }, [loadNotifications]);

  const markAsRead = useCallback(async (id: number) => {
    const previous = notifications;

    setNotifications((current) =>
      current.map((item) =>
        item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );

    try {
      await markNotificationReadAction(id);
      setError(null);
    } catch {
      setNotifications(previous);
      setError('Não foi possível marcar a notificação como lida.');
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    const previous = notifications;
    const now = new Date().toISOString();

    setNotifications((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt: now })),
    );

    try {
      await markAllNotificationsReadAction();
      setError(null);
    } catch {
      setNotifications(previous);
      setError('Não foi possível marcar todas as notificações como lidas.');
    }
  }, [notifications]);

  useEffect(() => {
    let active = true;

    async function loadInitialNotifications() {
      try {
        await loadNotifications();
      } catch {
        if (active) {
          setError('Não foi possível carregar as notificações.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialNotifications();

    return () => {
      active = false;
    };
  }, [loadNotifications]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${String(userId)}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const nextItem = normalizeNotification(payload.new as NotificationLike);

          if (!nextItem) {
            return;
          }

          setNotifications((current) => {
            if (current.some((item) => item.id === nextItem.id)) {
              return current;
            }

            return sortNotifications([nextItem, ...current]);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
