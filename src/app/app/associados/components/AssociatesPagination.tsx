import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { hairline, focusRingClass, canvas, textMuted } from '@/lib/ui/tokens';
import { buildAssociatesSearchParams, type AssociatesSearchParams } from '@/lib/associates/search-params';
import { generatePaginationWindow } from '@/lib/pagination';

interface AssociatesPaginationProps {
  page: number;
  totalPages: number;
  searchParams: AssociatesSearchParams;
}

function buildPageHref(params: AssociatesSearchParams, targetPage: number): string {
  const qs = new URLSearchParams(
    buildAssociatesSearchParams(params, { page: targetPage }),
  ).toString();
  return `/app/associados?${qs}`;
}

interface PageButtonProps {
  targetPage?: number;
  label?: string;
  ariaLabel: string;
  disabled?: boolean;
  icon?: typeof ChevronLeft;
  searchParams: AssociatesSearchParams;
}

function PageButton({ targetPage, label, ariaLabel, disabled, icon: Icon, searchParams }: PageButtonProps) {
  const commonClasses =
    'inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-[8px] border text-sm font-medium transition-colors';

  if (disabled || targetPage === undefined) {
    return (
      <span
        className={`${commonClasses} cursor-not-allowed`}
        style={{ borderColor: hairline, backgroundColor: canvas, color: textMuted }}
        aria-label={ariaLabel}
        aria-disabled="true"
      >
        {Icon && <Icon size={16} aria-hidden="true" />}
        {label}
      </span>
    );
  }

  return (
    <Link
      href={buildPageHref(searchParams, targetPage)}
      className={`${commonClasses} bg-white hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
      style={{ borderColor: hairline, color: '#040920' }}
      aria-label={ariaLabel}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      {label}
    </Link>
  );
}

export function AssociatesPagination({ page, totalPages, searchParams }: AssociatesPaginationProps) {
  if (totalPages <= 1) return null;

  const windowItems = generatePaginationWindow(page, totalPages);

  return (
    <nav aria-label="Paginação de oficiais" className="flex flex-wrap items-center gap-1">
      <PageButton
        targetPage={page > 1 ? 1 : undefined}
        icon={ChevronsLeft}
        ariaLabel="Primeira página"
        disabled={page <= 1}
        searchParams={searchParams}
      />
      <PageButton
        targetPage={page > 1 ? page - 1 : undefined}
        icon={ChevronLeft}
        ariaLabel="Página anterior"
        disabled={page <= 1}
        searchParams={searchParams}
      />

      {windowItems.map((item, idx) =>
        typeof item === 'string' ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-1 text-sm"
            style={{ color: textMuted }}
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <Link
            key={item}
            href={buildPageHref(searchParams, item)}
            className={`inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-[8px] border text-sm font-medium transition-colors ${focusRingClass} ${
              item === page
                ? 'border-transparent font-bold text-white'
                : 'bg-white hover:bg-[rgba(4,9,32,0.04)]'
            }`}
            style={
              item === page
                ? { backgroundColor: '#040920' }
                : { borderColor: hairline, color: '#040920' }
            }
            aria-label={`Página ${item}${item === page ? ' (atual)' : ''}`}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </Link>
        ),
      )}

      <PageButton
        targetPage={page < totalPages ? page + 1 : undefined}
        icon={ChevronRight}
        ariaLabel="Próxima página"
        disabled={page >= totalPages}
        searchParams={searchParams}
      />
      <PageButton
        targetPage={page < totalPages ? totalPages : undefined}
        icon={ChevronsRight}
        ariaLabel="Última página"
        disabled={page >= totalPages}
        searchParams={searchParams}
      />
    </nav>
  );
}
