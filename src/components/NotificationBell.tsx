'use client';

import { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { CheckCheck, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/use-notifications';
import { getSafeInternalHref } from '@/lib/notifications/safe-href';
import { NotificationBellTrigger } from './NotificationBellTrigger';
import {
  canvas,
  elevatedShadow,
  focusRingClass,
  hairline,
  navy,
  skyBlue,
  textMuted,
  white,
} from '@/lib/ui/tokens';

interface NotificationBellProps {
  userId: number;
  defaultOpen?: boolean;
}

// ⚡ Bolt: Cache Intl instances to avoid expensive object creation on every render
const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const dtf = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatTimestamp(value: string) {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 1) {
    return 'Agora';
  }

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);

  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day');
  }

  return dtf.format(date);
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

export function NotificationBell({ userId, defaultOpen = false }: NotificationBellProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const {
    notifications,
    unreadCount,
    loading,
    error: loadError,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ userId });

  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (defaultOpen) {
      triggerRef.current?.focus();
    }
  }, [defaultOpen]);

  useEscapeKey(() => setOpen(false), open);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
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
    } catch {
      // O hook já fez rollback e setou o erro; o painel permanece aberto.
    } finally {
      setPendingId(null);
    }
  }

  async function handleMarkAllAsRead() {
    await markAllAsRead();
  }

  return (
    <div ref={panelRef} className="relative">
      <NotificationBellTrigger
        ref={triggerRef}
        open={open}
        unreadCount={unreadCount}
        onClick={() => setOpen((current) => !current)}
      />

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
            {loading && notifications.length === 0 ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 px-4 py-6 text-sm"
                style={{ color: textMuted }}
              >
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Carregando notificações...
              </div>
            ) : (
              <>
                {loadError ? (
                  <div
                    role="alert"
                    className={
                      notifications.length > 0 ? 'border-b px-4 py-3 text-sm' : 'px-4 py-6 text-sm'
                    }
                    style={{ color: textMuted, borderColor: hairline }}
                  >
                    {loadError}
                  </div>
                ) : null}

                {notifications.length === 0 && !loadError ? (
                  <div className="px-4 py-8 text-sm" style={{ color: textMuted }}>
                    Nenhuma notificação encontrada.
                  </div>
                ) : null}

                {notifications.length > 0 ? (
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
                                backgroundColor: notification.readAt
                                  ? 'rgba(13,31,60,0.18)'
                                  : skyBlue,
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
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
