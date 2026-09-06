'use client';

import dynamic from 'next/dynamic';
import { Bell } from 'lucide-react';
import { focusRingClass, hairline, navy } from '@/lib/ui/tokens';

function NotificationBellSkeleton() {
  return (
    <button
      type="button"
      data-testid="notification-bell"
      aria-label="Notificações"
      disabled
      className={`relative grid h-11 w-11 place-items-center rounded-full border bg-white ${focusRingClass}`}
      style={{ borderColor: hairline }}
    >
      <Bell size={18} aria-hidden="true" style={{ color: navy }} />
    </button>
  );
}

const NotificationBell = dynamic(
  () => import('./NotificationBell').then((mod) => mod.NotificationBell),
  {
    ssr: false,
    loading: () => <NotificationBellSkeleton />,
  },
);

interface NotificationBellWrapperProps {
  userId: number;
}

/**
 * Isolates the Bell + server-action graph from the authenticated layout compile.
 * The previous Novu wrapper returned null in E2E; a static Bell import made
 * webpack compile use-notifications/actions on every /app page and killed the
 * :3001 process mid-suite.
 */
export function NotificationBellWrapper({ userId }: NotificationBellWrapperProps) {
  return <NotificationBell userId={userId} />;
}
