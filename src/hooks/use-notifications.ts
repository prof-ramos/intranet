'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/app/notifications/actions';
import {
  countUnread,
  extractNotifications,
  type NotificationItem,
  type NotificationLike,
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

export function useNotifications({ userId: _userId }: UseNotificationsOptions): UseNotificationsResult {
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

  const markAsRead = useCallback(
    async (id: number) => {
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
    },
    [notifications],
  );

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
    let intervalId: number | undefined;

    const tick = () => {
      if (document.visibilityState === 'visible') {
        void loadNotifications().catch(() => {
          setError('Não foi possível atualizar as notificações.');
        });
      }
    };

    const startTimer = () => {
      if (!intervalId) intervalId = window.setInterval(tick, 60_000);
    };

    const stopTimer = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadNotifications().catch(() => {
          setError('Não foi possível atualizar as notificações.');
        });
        startTimer();
      } else {
        stopTimer();
      }
    };

    if (document.visibilityState === 'visible') {
      startTimer();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadNotifications]);

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
