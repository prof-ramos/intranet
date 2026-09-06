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

/**
 * Loads the Bell + server-action graph only after the user opens the panel.
 * Identity comes from the session inside the server actions, not a client prop.
 * A static import (or eager dynamic import) made webpack compile
 * use-notifications/actions on every /app page and killed the E2E :3001 process.
 */
export function NotificationBellWrapper() {
  const [opened, setOpened] = useState(false);

  if (!opened) {
    return <NotificationBellTrigger open={false} onClick={() => setOpened(true)} />;
  }

  return <NotificationBell defaultOpen />;
}
