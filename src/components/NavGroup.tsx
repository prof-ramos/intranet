'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { primaryContainerActive, primaryContainerHover, skyBlue } from '@/lib/ui/tokens';

interface NavGroupItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export function NavGroup({
  basePath,
  icon,
  label,
  items,
}: {
  basePath: string;
  icon: ReactNode;
  label: string;
  items: NavGroupItem[];
}) {
  const pathname = usePathname();
  const isGroupActive = pathname === basePath || pathname.startsWith(`${basePath}/`);
  const [expanded, setExpanded] = useState(isGroupActive);

  useEffect(() => {
    if (isGroupActive) setExpanded(true);
  }, [isGroupActive]);

  const sanitizedBasePath = basePath.replace(/^\/+/, '').replace(/\//g, '-') || 'root';
  const menuId = `nav-group-${sanitizedBasePath}`;
  const toggleStyle = {
    '--focus-ring-color': skyBlue,
    '--nav-hover-bg': primaryContainerHover,
    borderLeftColor: isGroupActive ? skyBlue : 'transparent',
    backgroundColor: isGroupActive ? primaryContainerActive : undefined,
  } as CSSProperties;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={[
          'flex min-h-[58px] w-full items-center gap-3 pr-9 text-sm leading-tight font-medium transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring-color)]',
          'border-l-[6px]',
          isGroupActive ? 'pl-[30px] text-white' : 'border-transparent pl-9 text-white/70 hover:text-white hover:bg-[var(--nav-hover-bg)]',
        ].join(' ')}
        style={toggleStyle}
        aria-expanded={expanded}
        aria-controls={menuId}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown
          size={16}
          className={[
            'shrink-0 transition-transform duration-150',
            expanded ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>
      <div id={menuId} className="flex flex-col py-1" hidden={!expanded}>
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const itemStyle = {
              '--focus-ring-color': skyBlue,
              borderLeftColor: isActive ? skyBlue : 'transparent',
              backgroundColor: isActive ? primaryContainerActive : undefined,
            } as CSSProperties;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex min-h-11 items-center gap-3 pr-9 text-sm leading-tight transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring-color)]',
                  'border-l-[6px] pl-[42px]',
                  isActive ? 'text-white' : 'border-transparent text-white/60 hover:text-white',
                ].join(' ')}
                style={itemStyle}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
      </div>
    </div>
  );
}