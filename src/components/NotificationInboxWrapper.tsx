'use client';

import { NotificationBell } from './NotificationBell';

interface NotificationInboxWrapperProps {
  userId: number;
}

export function NotificationInboxWrapper({ userId }: NotificationInboxWrapperProps) {
  return (
    <div data-testid="notification-inbox">
      <NotificationBell userId={userId} />
    </div>
  );
}
