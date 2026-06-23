'use client';

import { Inbox } from '@novu/react';
import {
  canvas,
  elevatedShadow,
  error,
  hairline,
  navy,
  skyBlue,
  textStrong,
  white,
} from '@/lib/ui/tokens';

interface NotificationInboxProps {
  subscriberId?: string | number | null;
}

export function NotificationInbox({ subscriberId }: NotificationInboxProps) {
  const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER?.trim();
  const backendUrl = process.env.NEXT_PUBLIC_NOVU_BACKEND_URL;
  const socketUrl = process.env.NEXT_PUBLIC_NOVU_SOCKET_URL;
  const subscriber =
    subscriberId === null || subscriberId === undefined ? '' : String(subscriberId).trim();

  if (!applicationIdentifier || !subscriber) {
    return null;
  }

  return (
    <Inbox
      applicationIdentifier={applicationIdentifier}
      subscriber={subscriber}
      {...(backendUrl ? { backendUrl } : {})}
      {...(socketUrl ? { socketUrl } : {})}
      appearance={{
        variables: {
          colorBackground: white,
          colorForeground: textStrong,
          colorPrimary: navy,
          colorPrimaryForeground: white,
          colorSecondary: canvas,
          colorSecondaryForeground: textStrong,
          colorCounter: error,
          colorCounterForeground: white,
          colorNeutral: hairline,
          colorRing: skyBlue,
          colorShadow: elevatedShadow,
          fontSize: '14px',
        },
        elements: {
          bellIcon: {
            color: navy,
          },
        },
      }}
      placement="bottom-end"
      placementOffset={8}
    />
  );
}
