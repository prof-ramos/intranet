'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type CSSProperties, type ReactNode } from 'react';
import { primaryContainerActive, primaryContainerHover, skyBlue } from '@/lib/ui/tokens';

export function isNavLinkActive(
  pathname: string,
  href: string,
  exclude: readonly string[] = [],
): boolean {
  if (pathname === href) return true;
  if (href === '/app') return false;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !exclude.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function NavLink({
  href,
  icon,
  children,
  exclude,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  exclude?: readonly string[];
}) {
  const pathname = usePathname();

  const isActive = isNavLinkActive(pathname, href, exclude);
  const className = [
    'flex min-h-[58px] items-center gap-3 pr-9 text-sm leading-tight font-medium transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring-color)]',
    isActive
      ? 'border-l-[6px] pl-[30px] text-white'
      : 'border-l-[6px] border-transparent pl-9 text-white/70 hover:text-white hover:bg-[var(--nav-hover-bg)]',
  ].join(' ');
  const style = {
    '--focus-ring-color': skyBlue,
    '--nav-hover-bg': primaryContainerHover,
    borderLeftColor: isActive ? skyBlue : 'transparent',
    backgroundColor: isActive ? primaryContainerActive : undefined,
  } as CSSProperties;

  return (
    <Link
      href={href}
      className={className}
      style={style}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </Link>
  );
}
