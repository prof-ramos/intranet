import Image from 'next/image';
import type { ReactNode } from 'react';
import {
  elevatedShadow,
  focusRingClass,
  sidebarAccentBorder,
  sidebarEyebrowText,
  sidebarGradientEnd,
  sidebarGradientStart,
  white,
} from '@/lib/ui/tokens';

interface AuthShellProps {
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md';
}

const maxWidthClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
} as const;

export function AuthShell({ title, children, maxWidth = 'sm' }: AuthShellProps) {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background: `linear-gradient(180deg, ${sidebarGradientStart} 0%, ${sidebarGradientEnd} 100%)`,
      }}
    >
      <div
        className={`w-full rounded-[10px] ${maxWidthClass[maxWidth]}`}
        style={{ backgroundColor: white, boxShadow: elevatedShadow }}
      >
        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/logo.svg"
              alt="ASOF — Associação de Oficiais de Chancelaria"
              width={200}
              height={60}
              className="h-[52px] w-[180px]"
              priority
              unoptimized
            />
            <p
              className="mt-2 font-sans text-[9px] tracking-[0.18em] uppercase"
              style={{ color: sidebarEyebrowText }}
            >
              Intranet
            </p>
            <p
              className="mt-4 border-t pt-4 text-sm font-semibold"
              style={{ borderColor: sidebarAccentBorder, color: sidebarEyebrowText }}
            >
              {title}
            </p>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}

export const authLinkClass = `text-center text-sm underline ${focusRingClass} rounded-[4px]`;
