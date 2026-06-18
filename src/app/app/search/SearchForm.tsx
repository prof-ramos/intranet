'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { focusRingClass } from '@/lib/ui/tokens';

export function SearchForm({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? '';
    if (q.length < 2) return;
    router.push(`/app/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex gap-2">
      <div className="relative flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          style={{ color: 'rgba(13,31,60,0.40)' }}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Buscar oficiais, atividades…"
          autoFocus
          minLength={2}
          maxLength={80}
          className={`h-11 w-full rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white pl-9 pr-4 text-sm text-[#040920] placeholder:text-[rgba(13,31,60,0.40)] focus:border-[#76AEEA] focus:outline-none ${focusRingClass}`}
        />
      </div>
      <button
        type="submit"
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
      >
        Buscar
      </button>
    </form>
  );
}
