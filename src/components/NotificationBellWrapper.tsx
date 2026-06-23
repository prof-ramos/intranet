'use client';

import { NotificationBell } from './NotificationBell';

interface NotificationBellWrapperProps {
  userId: number;
}

export function NotificationBellWrapper({ userId }: NotificationBellWrapperProps) {
  return (
    <div data-testid="notification-bell-wrapper">
      <NotificationBell userId={userId} />
    </div>
  );
}
