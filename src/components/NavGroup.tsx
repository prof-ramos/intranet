'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { primaryContainerActive, primaryContainerHover, skyBlue } from '@/lib/ui/tokens';

interface NavGroupItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export function NavGroup({
  basePath,
  activePaths = [],
  icon,
  label,
  items,
}: {
  basePath: string;
  activePaths?: string[];
  icon: ReactNode;
  label: string;
  items: NavGroupItem[];
}) {
  const pathname = usePathname();
  const isPathActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const isGroupActive = [basePath, ...activePaths].some(isPathActive);
  const activeItemHref = items
    .filter((item) => isPathActive(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const [expanded, setExpanded] = useState(isGroupActive);
  const isExpanded = isGroupActive || expanded;

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
          'focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:outline-none focus-visible:ring-inset',
          'border-l-[6px]',
          isGroupActive
            ? 'pl-[30px] text-white'
            : 'border-transparent pl-9 text-white/70 hover:bg-[var(--nav-hover-bg)] hover:text-white',
        ].join(' ')}
        style={toggleStyle}
        aria-expanded={isExpanded}
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
            isExpanded ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>
      <div id={menuId} className="flex flex-col py-1" hidden={!isExpanded}>
        {items.map((item) => {
          const isActive = activeItemHref === item.href;
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
                'focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:outline-none focus-visible:ring-inset',
                'border-l-[6px] pl-[42px]',
                isActive ? 'text-white' : 'border-transparent text-white/60 hover:text-white',
              ].join(' ')}
              style={itemStyle}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center"
                aria-hidden="true"
              >
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
