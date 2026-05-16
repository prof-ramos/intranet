'use client';

import { useState } from 'react';
import type { BoardAssociate } from '../AtividadesBoard';
import { focusRingClass } from '@/lib/ui/tokens';

export function AssociatePicker({
  id,
  describedBy,
  associates,
  value,
  onChange,
}: {
  id: string;
  describedBy?: string;
  associates: BoardAssociate[];
  value: BoardAssociate | null;
  onChange: (associate: BoardAssociate | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = associates
    .filter((associate) => associate.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  if (value) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-[8px] border bg-white px-3 py-2.5"
        style={{ borderColor: '#c9d2df' }}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: '#0d1f3c' }}>{value.name}</p>
          <p className="mt-0.5 text-xs" style={{ color: '#59677a' }}>Associado vinculado</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={['min-h-11 px-2 text-xs underline lg:min-h-8', focusRingClass].join(' ')}
          style={{ color: '#59677a' }}
        >
          Remover
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        id={id}
        aria-describedby={describedBy}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar associado..."
        className={`min-h-11 w-full rounded-[8px] border bg-white px-3 text-sm ${focusRingClass}`}
        style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
      />
      {open && (
        <div
          className="absolute top-full right-0 left-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-[8px] border bg-white p-1"
          style={{ borderColor: '#c9d2df', boxShadow: '0 8px 20px rgba(4,9,32,0.08)' }}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm" style={{ color: '#59677a' }}>Nenhum associado encontrado.</p>
          ) : (
            filtered.map((associate) => (
              <button
                key={associate.id}
                type="button"
                onClick={() => {
                  onChange(associate);
                  setQuery('');
                  setOpen(false);
                }}
                className={[
                  'block w-full rounded-md px-3 py-3 text-left lg:py-2 hover:bg-[#f8fafc]',
                  focusRingClass,
                ].join(' ')}
                style={{ color: '#0d1f3c' }}
              >
                <p className="text-sm font-semibold">{associate.name}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}