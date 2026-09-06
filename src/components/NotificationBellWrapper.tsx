'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { focusRingClass, hairline, navy } from '@/lib/ui/tokens';

const NotificationBell = dynamic(
  () => import('./NotificationBell').then((mod) => mod.NotificationBell),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        data-testid="notification-bell"
        aria-label="Notificações"
        aria-haspopup="dialog"
        aria-expanded={true}
        className={`relative grid h-11 w-11 place-items-center rounded-full border bg-white ${focusRingClass}`}
        style={{ borderColor: hairline }}
      >
        <Bell size={18} aria-hidden="true" style={{ color: navy }} />
      </button>
    ),
  },
);

interface NotificationBellWrapperProps {
  userId: number;
}

/**
 * Loads the Bell + server-action graph only after the user opens the panel.
 * A static import (or eager dynamic import) made webpack compile
 * use-notifications/actions on every /app page and killed the E2E :3001 process.
 */
export function NotificationBellWrapper({ userId }: NotificationBellWrapperProps) {
  const [opened, setOpened] = useState(false);

  if (!opened) {
    return (
      <button
        type="button"
        data-testid="notification-bell"
        aria-label="Notificações"
        aria-haspopup="dialog"
        aria-expanded={false}
        onClick={() => setOpened(true)}
        className={`relative grid h-11 w-11 place-items-center rounded-full border bg-white transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
        style={{ borderColor: hairline }}
      >
        <Bell size={18} aria-hidden="true" style={{ color: navy }} />
      </button>
    );
  }

  return <NotificationBell userId={userId} defaultOpen />;
}
