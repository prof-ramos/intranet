'use client';

import dynamic from 'next/dynamic';
import { NotificationInboxSkeleton } from './NotificationInboxSkeleton';

const NotificationInbox = dynamic(() => import('./NotificationInbox').then((mod) => mod.NotificationInbox), {
  ssr: false,
  loading: () => <NotificationInboxSkeleton />,
});

interface NotificationInboxWrapperProps {
  subscriberId?: string | number | null;
}

export function NotificationInboxWrapper({ subscriberId }: NotificationInboxWrapperProps) {
  return <NotificationInbox subscriberId={subscriberId} />;
}
