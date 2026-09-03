'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { NotificationInboxSkeleton } from './NotificationInboxSkeleton';
import { focusRingClass, navy } from '@/lib/ui/tokens';

const NotificationInbox = dynamic(
  () => import('./NotificationInbox').then((mod) => mod.NotificationInbox),
  {
    ssr: false,
    loading: () => <NotificationInboxSkeleton />,
  },
);

interface NotificationInboxWrapperProps {
  subscriberId?: string | number | null;
}

/**
 * Loads the Novu Inbox SDK only after the user opens notifications,
 * avoiding ~138 KiB gzip on every authenticated page hydration.
 */
export function NotificationInboxWrapper({ subscriberId }: NotificationInboxWrapperProps) {
  const [opened, setOpened] = useState(false);
  const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER?.trim();
  const subscriber =
    subscriberId === null || subscriberId === undefined ? '' : String(subscriberId).trim();
  const configured = Boolean(applicationIdentifier && subscriber);

  if (!configured) {
    return null;
  }

  if (!opened) {
    return (
      <div data-testid="notification-inbox">
        <button
          type="button"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-[8px] transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
          aria-label="Abrir notificações"
          onClick={() => setOpened(true)}
        >
          <Bell size={20} color={navy} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div data-testid="notification-inbox">
      <NotificationInbox subscriberId={subscriberId} />
    </div>
  );
}
