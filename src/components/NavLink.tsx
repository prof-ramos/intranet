'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { primaryContainerActive, primaryContainerHover, skyBlue } from '@/lib/ui/tokens';

export function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);

  const isActive = pathname === href ||
    (href !== '/app' && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        'flex h-[58px] items-center gap-3 pr-9 text-base transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring-color)]',
        isActive ? 'border-l-[6px] pl-[30px] text-white' : 'border-l-[6px] border-transparent pl-9 text-white/70',
        !isActive && hovered ? 'text-white' : '',
      ].join(' ')}
      style={{
        '--focus-ring-color': skyBlue,
        borderLeftColor: isActive ? skyBlue : 'transparent',
        backgroundColor: isActive ? primaryContainerActive : hovered ? primaryContainerHover : undefined,
      } as React.CSSProperties}
    >
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
