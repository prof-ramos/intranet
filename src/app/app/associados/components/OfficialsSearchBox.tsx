'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { focusRingClass, textMuted } from '@/lib/ui/tokens';
import { MIN_SEARCH_CHARS } from '@/lib/associates/search-params';

interface OfficialsSearchBoxProps {
  initialQuery: string;
}

const SEARCH_DEBOUNCE_MS = 250;

export function OfficialsSearchBox({ initialQuery }: OfficialsSearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get('q') ?? '';

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextQuery = value.trim();

      if (nextQuery === currentQuery) {
        return;
      }
      // Avoid a no-op navigation when typing below threshold with no active query.
      if (nextQuery.length < MIN_SEARCH_CHARS && !currentQuery) {
        return;
      }

      // Keep this list in sync with parseAssociatesSearchParams when new filters are added.
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      params.delete('searchBy');
      params.delete('contributionStatus');
      params.delete('functionalStatus');
      params.delete('associationStatus');
      params.delete('show');

      if (nextQuery.length >= MIN_SEARCH_CHARS) {
        params.set('q', nextQuery);
      } else {
        params.delete('q');
      }

      const queryString = params.toString();
      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [currentQuery, pathname, router, searchParams, value]);

  return (
    <div className="w-full">
      <label htmlFor="official-search" className="mb-2 block text-sm font-semibold">
        Pesquisar oficial
      </label>
      <div className="relative">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[rgba(13,31,60,0.48)]"
        />
        <input
          id="official-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Digite o nome ou parte do nome…"
          name="q"
          autoComplete="off"
          aria-busy={isPending}
          className={`h-12 w-full rounded-[8px] border ${isPending ? 'border-[#76aeea]' : 'border-[rgba(4,9,32,0.12)]'} bg-white pr-12 pl-11 text-base outline-none transition-colors placeholder:text-[rgba(13,31,60,0.65)] hover:border-[rgba(4,9,32,0.24)] ${focusRingClass}`}
          aria-describedby="official-search-help"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            className={`absolute top-1/2 right-3 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[8px] text-[rgba(13,31,60,0.58)] transition-colors hover:bg-[#f8fafc] hover:text-[#040920] ${focusRingClass}`}
            aria-label="Limpar busca"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <p id="official-search-help" className="mt-2 text-sm" style={{ color: textMuted }}>
        Digite pelo menos {MIN_SEARCH_CHARS} caracteres.
      </p>
    </div>
  );
}
