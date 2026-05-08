'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

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
  const isActive = pathname === href ||
    (href !== '/app' && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={`flex h-[58px] items-center gap-3 pr-9 text-base transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#76AEEA]
        ${isActive
          ? 'border-l-[6px] border-[#76AEEA] bg-[#123d73] pl-[30px] text-white'
          : 'border-l-[6px] border-transparent pl-9 text-white/70 hover:bg-[#0d3260] hover:text-white'
        }`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
