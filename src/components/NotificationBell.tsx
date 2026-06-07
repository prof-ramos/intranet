'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import {
  canvas,
  elevatedShadow,
  error,
  focusRingClass,
  hairline,
  navy,
  skyBlue,
  textMuted,
  white,
} from '@/lib/ui/tokens';

interface NotificationBellProps {
  userId: number;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 1) {
    return 'Agora';
  }

  if (Math.abs(diffMinutes) < 60) {
    return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);

  if (Math.abs(diffDays) < 7) {
    return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(diffDays, 'day');
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getSafeInternalHref(href: string | null) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) {
    return null;
  }

  return href;
}

export async function processNotificationClick(input: {
  notificationId: number;
  href: string | null;
  markAsRead: (id: number) => Promise<void>;
  navigate: (href: string) => void;
  close: () => void;
}): Promise<boolean> {
  await input.markAsRead(input.notificationId);

  const safeHref = getSafeInternalHref(input.href);
  if (safeHref) {
    input.navigate(safeHref);
  }

  input.close();
  return Boolean(safeHref);
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const {
    notifications,
    unreadCount,
    loading,
    error: loadError,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ userId });

  const buttonLabel = useMemo(() => {
    if (unreadCount > 0) {
      return `Notificações - ${unreadCount} não lidas`;
    }

    return 'Notificações';
  }, [unreadCount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  async function handleNotificationClick(notificationId: number, href: string | null) {
    setPendingId(notificationId);

    try {
      await processNotificationClick({
        notificationId,
        href,
        markAsRead,
        navigate: (safeHref) => router.push(safeHref),
        close: () => setOpen(false),
      });
    } finally {
      setPendingId(null);
    }
  }

  async function handleMarkAllAsRead() {
    await markAllAsRead();
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        data-testid="notification-bell"
        aria-label={buttonLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className={`relative grid h-11 w-11 place-items-center rounded-full border bg-white transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
        style={{
          borderColor: hairline,
          boxShadow: unreadCount > 0 ? `0 0 0 3px ${skyBlue}24` : undefined,
        }}
      >
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 z-10 grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: error, boxShadow: `0 0 0 2px ${white}` }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        <Bell size={18} aria-hidden="true" style={{ color: navy }} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Painel de notificações"
          aria-modal="true"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[8px] border bg-white"
          style={{ borderColor: hairline, boxShadow: elevatedShadow }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: hairline }}
          >
            <div>
              <p className="text-sm font-semibold text-[#0d1f3c]">Notificações</p>
              <p className="text-xs" style={{ color: textMuted }}>
                {unreadCount > 0 ? `${unreadCount} pendente(s)` : 'Tudo em dia'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={loading || unreadCount === 0}
              className={`inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-xs font-semibold transition-colors hover:bg-[rgba(4,9,32,0.04)] disabled:cursor-not-allowed disabled:opacity-50 ${focusRingClass}`}
              style={{ color: navy, backgroundColor: unreadCount > 0 ? canvas : 'transparent' }}
            >
              <CheckCheck size={14} aria-hidden="true" />
              Marcar tudo
            </button>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {loading ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 px-4 py-6 text-sm"
                style={{ color: textMuted }}
              >
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Carregando notificações...
              </div>
            ) : loadError ? (
              <div role="alert" className="px-4 py-6 text-sm" style={{ color: textMuted }}>
                {loadError}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-sm" style={{ color: textMuted }}>
                Nenhuma notificação encontrada.
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: hairline }}>
                {notifications.map((notification) => {
                  const safeHref = getSafeInternalHref(notification.href);
                  const isPending = pendingId === notification.id;

                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification.id, safeHref)}
                        disabled={isPending}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f8fafc] disabled:cursor-wait ${focusRingClass}`}
                        style={{
                          backgroundColor: notification.readAt ? white : '#f5f9ff',
                          borderLeft: notification.readAt
                            ? `3px solid transparent`
                            : `3px solid ${skyBlue}`,
                        }}
                      >
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: notification.readAt ? 'rgba(13,31,60,0.18)' : skyBlue,
                          }}
                          aria-hidden="true"
                        />

                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-[#0d1f3c]">
                                {notification.title}
                              </span>
                              <span
                                className="mt-1 block text-sm leading-5"
                                style={{ color: textMuted }}
                              >
                                {notification.message || 'Sem detalhes adicionais.'}
                              </span>
                            </span>

                            <span
                              className="shrink-0 text-[11px] font-medium"
                              style={{ color: textMuted }}
                            >
                              {formatTimestamp(notification.createdAt)}
                            </span>
                          </span>

                          {!safeHref && (
                            <span
                              className="mt-2 block text-[11px] font-medium tracking-[0.06em] uppercase"
                              style={{ color: textMuted }}
                            >
                              Sem atalho interno
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
