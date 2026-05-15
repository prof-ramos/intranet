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
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(isGroupActive);

  // Correctly handle state transitions during render
  const [prevIsGroupActive, setPrevIsGroupActive] = useState(isGroupActive);
  if (isGroupActive !== prevIsGroupActive) {
    setPrevIsGroupActive(isGroupActive);
    if (isGroupActive) {
      setExpanded(true);
    }
  }

  const menuId = `nav-group-${basePath.replace(/\//g, '-')}`;
  const toggleStyle = {
    '--focus-ring-color': skyBlue,
    borderLeftColor: isGroupActive ? skyBlue : 'transparent',
    backgroundColor: isGroupActive ? primaryContainerActive : hovered ? primaryContainerHover : undefined,
  } as CSSProperties;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={[
          'flex h-[58px] w-full items-center gap-3 pr-9 text-base transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring-color)]',
          'border-l-[6px]',
          isGroupActive ? 'pl-[30px] text-white' : 'border-transparent pl-9 text-white/70',
          !isGroupActive && hovered ? 'text-white' : '',
        ].join(' ')}
        style={toggleStyle}
        aria-expanded={expanded}
        aria-controls={menuId}
        aria-current={isGroupActive ? 'page' : undefined}
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          size={16}
          className={[
            'shrink-0 transition-transform duration-150',
            expanded ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div id={menuId} className="flex flex-col">
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
                  'flex h-[46px] items-center gap-3 pr-9 text-sm transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring-color)]',
                  'border-l-[6px] pl-[42px]',
                  isActive ? 'text-white' : 'border-transparent text-white/60 hover:text-white',
                ].join(' ')}
                style={itemStyle}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}