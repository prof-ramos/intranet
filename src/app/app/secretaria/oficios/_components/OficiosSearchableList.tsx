'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { OficiosTable } from './OficiosTable';
import { hairline, textMuted, focusRingClass } from '@/lib/ui/tokens';

interface OficioRow {
  id: number;
  number: string;
  status: string;
  recipient: string;
  letterDate: string;
  subject: string;
  signatoryName: string;
  assinafyDocumentId: string | null;
  assinafyStatus: string | null;
  assinafySigningUrl: string | null;
}

export function OficiosSearchableList({ oficios }: { oficios: OficioRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return oficios;
    const q = query.toLowerCase();
    return oficios.filter(
      (o) =>
        o.number.toLowerCase().includes(q) ||
        o.recipient.toLowerCase().includes(q) ||
        o.subject.toLowerCase().includes(q),
    );
  }, [oficios, query]);

  return (
    <>
      <div
        className="mb-6 flex items-center gap-3 rounded-[12px] border bg-white px-4 py-2"
        style={{ borderColor: hairline }}
      >
        <Search size={18} style={{ color: textMuted }} aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por número, destinatário ou assunto…"
          aria-label="Buscar ofícios"
          className={`flex-1 text-sm outline-none ${focusRingClass}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-xs text-[rgba(13,31,60,0.45)] transition-colors hover:text-[#040920]"
            aria-label="Limpar busca"
          >
            Limpar
          </button>
        )}
      </div>

      {query.trim() && filtered.length === 0 && oficios.length > 0 && (
        <p className="mb-4 text-sm text-[rgba(13,31,60,0.45)]">
          Nenhum ofício corresponde a &ldquo;{query}&rdquo;.
        </p>
      )}

      <OficiosTable oficios={filtered} />
    </>
  );
}
