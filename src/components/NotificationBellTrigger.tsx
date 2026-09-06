'use client';

import { forwardRef } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { error, focusRingClass, hairline, navy, skyBlue, white } from '@/lib/ui/tokens';

interface NotificationBellTriggerProps {
  open: boolean;
  busy?: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export const NotificationBellTrigger = forwardRef<HTMLButtonElement, NotificationBellTriggerProps>(
  function NotificationBellTrigger({ open, busy = false, unreadCount = 0, onClick }, ref) {
    const label = busy
      ? 'Carregando notificações'
      : unreadCount > 0
        ? `Notificações - ${unreadCount} não lidas`
        : 'Notificações';

    return (
      <button
        ref={ref}
        type="button"
        data-testid="notification-bell"
        aria-label={label}
        aria-expanded={open}
        aria-busy={busy || undefined}
        aria-haspopup="dialog"
        disabled={busy}
        onClick={onClick}
        className={`relative grid h-11 w-11 place-items-center rounded-full border bg-white transition-colors hover:bg-[rgba(4,9,32,0.04)] disabled:cursor-wait ${focusRingClass}`}
        style={{
          borderColor: hairline,
          boxShadow: unreadCount > 0 && !busy ? `0 0 0 3px ${skyBlue}24` : undefined,
        }}
      >
        {unreadCount > 0 && !busy ? (
          <span
            className="absolute -top-1 -right-1 z-10 grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: error, boxShadow: `0 0 0 2px ${white}` }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
        {busy ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" style={{ color: navy }} />
        ) : (
          <Bell size={18} aria-hidden="true" style={{ color: navy }} />
        )}
      </button>
    );
  },
);
