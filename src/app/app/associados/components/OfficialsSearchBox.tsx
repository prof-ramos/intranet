'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { focusRingClass, textMuted } from '@/lib/ui/tokens';
import {
  ASSOCIATE_SEARCH_MODES,
  associateSearchHelp,
  associateSearchPlaceholder,
  isAssociateSearchReady,
  type AssociateSearchMode,
} from '@/lib/associates/search-params.shared';

interface OfficialsSearchBoxProps {
  initialQuery: string;
  initialSearchBy: AssociateSearchMode;
}

const SEARCH_DEBOUNCE_MS = 250;

function readSearchBy(value: string | null): AssociateSearchMode {
  if (value === 'cpf' || value === 'siape') return value;
  return 'name';
}

export function OfficialsSearchBox({ initialQuery, initialSearchBy }: OfficialsSearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [searchBy, setSearchBy] = useState(initialSearchBy);
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get('q') ?? '';
  const currentSearchBy = readSearchBy(searchParams.get('searchBy'));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextQuery = value.trim();
      const nextStoredQuery = isAssociateSearchReady(nextQuery, searchBy) ? nextQuery : '';

      if (nextStoredQuery === currentQuery && searchBy === currentSearchBy) {
        return;
      }
      if (!nextStoredQuery && !currentQuery && searchBy === currentSearchBy) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      params.delete('show');

      if (searchBy === 'name') {
        params.delete('searchBy');
      } else {
        params.set('searchBy', searchBy);
      }

      if (nextStoredQuery) {
        params.set('q', nextStoredQuery);
      } else {
        params.delete('q');
      }

      const queryString = params.toString();
      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [currentQuery, currentSearchBy, pathname, router, searchBy, searchParams, value]);

  function handleSearchByChange(next: AssociateSearchMode) {
    if (next === searchBy) return;
    setSearchBy(next);
    setValue('');
  }

  return (
    <div className="w-full">
      <div role="radiogroup" aria-label="Buscar por" className="mb-3 flex flex-wrap gap-2">
        {ASSOCIATE_SEARCH_MODES.map((mode) => {
          const selected = searchBy === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSearchByChange(mode.value)}
              className={`inline-flex h-9 items-center rounded-[8px] border px-3 text-sm font-semibold transition-colors ${focusRingClass} ${
                selected
                  ? 'border-[#040920] bg-[#040920] text-white'
                  : 'border-[rgba(4,9,32,0.12)] bg-white text-[#040920] hover:border-[rgba(4,9,32,0.24)] hover:bg-[#f8fafc]'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

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
          placeholder={associateSearchPlaceholder(searchBy)}
          name="q"
          autoComplete="off"
          spellCheck={searchBy === 'name'}
          inputMode={searchBy === 'name' ? 'text' : 'numeric'}
          aria-busy={isPending}
          className={`h-12 w-full rounded-[8px] border ${isPending ? 'border-[#76aeea]' : 'border-[rgba(4,9,32,0.12)]'} bg-white pr-12 pl-11 text-base transition-colors outline-none placeholder:text-[rgba(13,31,60,0.65)] hover:border-[rgba(4,9,32,0.24)] ${focusRingClass}`}
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
        {associateSearchHelp(searchBy)}
      </p>
    </div>
  );
}
