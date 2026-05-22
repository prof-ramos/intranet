'use client';

import { Kanban, Loader2, Search, Users, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  focusRingClass,
  navy,
  skyBlue,
  textMuted,
  hairline,
  elevatedShadow,
} from '@/lib/ui/tokens';
import { globalSearchAction, type GlobalSearchResults } from '@/app/app/search/actions';

type FlatResult = {
  id: number;
  title: string;
  subtitle: string | null;
  href: string;
  type: 'associate' | 'activity';
};

function ResultItem({
  item,
  index,
  isFocused,
  onSelect,
}: {
  item: FlatResult;
  index: number;
  isFocused: boolean;
  onSelect: (href: string) => void;
}) {
  const isAssociate = item.type === 'associate';
  const initials = item.title
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <button
      id={`gs-result-${index}`}
      role="option"
      aria-selected={isFocused}
      type="button"
      onClick={() => onSelect(item.href)}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
      style={{ background: isFocused ? 'rgba(118,174,234,0.10)' : 'transparent' }}
    >
      {isAssociate ? (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: navy }}
          aria-hidden="true"
        >
          {initials}
        </div>
      ) : (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px]"
          style={{ background: 'rgba(118,174,234,0.15)' }}
          aria-hidden="true"
        >
          <Kanban size={14} style={{ color: skyBlue }} aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" style={{ color: navy }}>
          {item.title}
        </p>
        {item.subtitle && (
          <p className="truncate text-xs" style={{ color: textMuted }}>
            {item.subtitle}
          </p>
        )}
      </div>
    </button>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();

  const flatResults: FlatResult[] = [
    ...(results?.associates ?? []).map((r) => ({ ...r, type: 'associate' as const })),
    ...(results?.activities ?? []).map((r) => ({ ...r, type: 'activity' as const })),
  ];

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const data = await globalSearchAction(trimmed);
        setResults(data);
        setIsOpen(true);
        setFocusedIndex(-1);
      });
    }, 300);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    runSearch(value);
  }

  function handleClear() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery('');
    setResults(null);
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  }

  const navigateTo = useCallback(
    (href: string) => {
      setIsOpen(false);
      setQuery('');
      setResults(null);
      setFocusedIndex(-1);
      router.push(href);
    },
    [router],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
      inputRef.current?.blur();
      return;
    }
    if (!isOpen || flatResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      navigateTo(flatResults[focusedIndex].href);
    }
  }

  const showDropdown = isOpen && query.trim().length >= 2;
  const hasResults = flatResults.length > 0;
  const assocCount = results?.associates.length ?? 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="relative flex items-center rounded-[8px] bg-white"
        style={{ border: `1px solid ${hairline}`, boxShadow: '0 1px 2px rgba(4,9,32,0.04)' }}
      >
        <div className="pointer-events-none absolute left-3 flex shrink-0 items-center">
          {isPending ? (
            <Loader2
              size={16}
              className="motion-safe:animate-spin"
              style={{ color: skyBlue }}
              aria-hidden="true"
            />
          ) : (
            <Search size={16} style={{ color: textMuted }} aria-hidden="true" />
          )}
        </div>

        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="gs-results"
          aria-autocomplete="list"
          aria-activedescendant={focusedIndex >= 0 ? `gs-result-${focusedIndex}` : undefined}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results && query.trim().length >= 2) setIsOpen(true);
          }}
          placeholder="Buscar associados ou tarefas…"
          spellCheck={false}
          autoComplete="off"
          className={[
            'w-full bg-transparent py-2.5 pr-8 pl-9 text-sm outline-none',
            'placeholder:text-[rgba(13,31,60,0.38)]',
            focusRingClass,
          ].join(' ')}
          style={{ borderRadius: '8px', minHeight: '40px' }}
        />

        {query ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpar busca"
            className={[
              'absolute right-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[rgba(4,9,32,0.06)]',
              focusRingClass,
            ].join(' ')}
          >
            <X size={14} style={{ color: textMuted }} aria-hidden="true" />
          </button>
        ) : (
          <div
            className="pointer-events-none absolute right-3 hidden items-center lg:flex"
            aria-hidden="true"
          >
            <kbd
              className="rounded border px-1.5 py-0.5 font-sans text-[10px]"
              style={{
                borderColor: hairline,
                background: 'rgba(4,9,32,0.03)',
                color: textMuted,
              }}
            >
              Ctrl K
            </kbd>
          </div>
        )}
      </div>

      {showDropdown && (
        <div
          id="gs-results"
          role="listbox"
          aria-label="Resultados da busca"
          className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-[10px] bg-white py-1"
          style={{ boxShadow: elevatedShadow, border: `1px solid ${hairline}` }}
        >
          {isPending && !hasResults ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-center gap-2 py-8 text-sm"
              style={{ color: textMuted }}
            >
              <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />
              Buscando…
            </div>
          ) : !hasResults ? (
            <div className="py-6 text-center text-sm" style={{ color: textMuted }}>
              Nenhum resultado encontrado
            </div>
          ) : (
            <>
              {results!.associates.length > 0 && (
                <section aria-label="Associados">
                  <div
                    className="flex items-center gap-1.5 px-4 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase"
                    style={{ color: textMuted }}
                    aria-hidden="true"
                  >
                    <Users size={11} />
                    Associados
                  </div>
                  {results!.associates.map((item, idx) => (
                    <ResultItem
                      key={`assoc-${item.id}`}
                      item={{ ...item, type: 'associate' }}
                      index={idx}
                      isFocused={focusedIndex === idx}
                      onSelect={navigateTo}
                    />
                  ))}
                </section>
              )}

              {results!.activities.length > 0 && (
                <section aria-label="Atividades">
                  {results!.associates.length > 0 && (
                    <div className="my-1 border-t" style={{ borderColor: hairline }} />
                  )}
                  <div
                    className="flex items-center gap-1.5 px-4 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase"
                    style={{ color: textMuted }}
                    aria-hidden="true"
                  >
                    <Kanban size={11} />
                    Atividades
                  </div>
                  {results!.activities.map((item, idx) => (
                    <ResultItem
                      key={`activ-${item.id}`}
                      item={{ ...item, type: 'activity' }}
                      index={assocCount + idx}
                      isFocused={focusedIndex === assocCount + idx}
                      onSelect={navigateTo}
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
