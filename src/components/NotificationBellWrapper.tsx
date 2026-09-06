'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { NotificationBellTrigger } from './NotificationBellTrigger';

const NotificationBell = dynamic(
  () => import('./NotificationBell').then((mod) => mod.NotificationBell),
  {
    ssr: false,
    loading: () => <NotificationBellTrigger open={false} busy onClick={() => undefined} />,
  },
);

interface NotificationBellWrapperProps {
  initialUnreadCount?: number;
}

/**
 * Loads the Bell + server-action graph only after the user opens the panel.
 * The unread badge comes from the server layout so the closed shell stays light.
 */
export function NotificationBellWrapper({ initialUnreadCount = 0 }: NotificationBellWrapperProps) {
  const [opened, setOpened] = useState(false);

  if (!opened) {
    return (
      <NotificationBellTrigger
        open={false}
        unreadCount={initialUnreadCount}
        onClick={() => setOpened(true)}
      />
    );
  }

  return <NotificationBell defaultOpen />;
}
