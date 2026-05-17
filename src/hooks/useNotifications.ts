'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/app/notifications/actions';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  countUnread,
  extractNotifications,
  normalizeNotification,
  removeNotificationById,
  type NotificationItem,
  type NotificationLike,
  upsertNotification,
} from './notifications-normalize';

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

type NotificationsListPayload =
  | NotificationLike[]
  | {
      notifications?: NotificationLike[];
      items?: NotificationLike[];
      data?: NotificationLike[];
      unreadCount?: number;
    };

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
    } catch (error) {
      setNotifications(previous);
      setError('Não foi possível marcar a notificação como lida.');
      throw error;
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

          setNotifications((current) => upsertNotification(current, nextItem));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${String(userId)}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const nextItem = normalizeNotification(payload.new as NotificationLike);
          if (!nextItem) {
            return;
          }

          setNotifications((current) => upsertNotification(current, nextItem));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${String(userId)}`,
        },
        (payload: { old: Record<string, unknown> }) => {
          const removedId = normalizeNotification(payload.old as NotificationLike)?.id;
          if (removedId == null) {
            return;
          }

          setNotifications((current) => removeNotificationById(current, removedId));
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
