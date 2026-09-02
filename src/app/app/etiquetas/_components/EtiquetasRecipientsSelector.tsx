'use client';

import { Loader2, Search } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import {
  buttonOutlineBorder,
  focusRingClass,
  hairline,
  mobileTouchTargetClass,
  textMuted,
} from '@/lib/ui/tokens';
import { fetchAssociatesForEtiquetas, type EtiquetaAssociateOption } from '../actions';

export function EtiquetasRecipientsSelector({
  initialAssociates,
  selectedIds,
  onChange,
}: {
  initialAssociates: EtiquetaAssociateOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [associates, setAssociates] = useState(initialAssociates);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(async () => {
        setAssociates(await fetchAssociatesForEtiquetas(query));
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function toggle(id: number) {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id],
    );
  }

  function toggleVisible() {
    const visibleIds = associates.map((associate) => associate.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allVisibleSelected) {
      onChange(selectedIds.filter((id) => !visibleIds.includes(id)));
    } else {
      onChange(Array.from(new Set([...selectedIds, ...visibleIds])));
    }
  }

  return (
    <fieldset>
      <legend className="text-sm font-semibold" style={{ color: textMuted }}>
        Associados
      </legend>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Buscar associado por nome</span>
          <Search
            className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            style={{ color: textMuted }}
            aria-hidden="true"
          />
          <input
            type="search"
            className={`${mobileTouchTargetClass} w-full rounded-[8px] border bg-white pr-3 pl-10 text-sm ${focusRingClass}`}
            style={{ borderColor: hairline }}
            placeholder="Buscar por nome..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="flex items-center gap-3">
          {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
          <button
            type="button"
            className={`${mobileTouchTargetClass} rounded-[8px] border bg-white px-4 text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
            style={{ borderColor: buttonOutlineBorder }}
            onClick={toggleVisible}
            disabled={associates.length === 0}
          >
            Selecionar visíveis
          </button>
          <span className="text-sm font-semibold">{selectedIds.length} selecionado(s)</span>
        </div>
      </div>
      <div
        className="mt-3 max-h-72 overflow-y-auto rounded-[8px] border"
        style={{ borderColor: hairline }}
      >
        {associates.length === 0 ? (
          <p className="p-4 text-center text-sm" style={{ color: textMuted }}>
            Nenhum associado encontrado.
          </p>
        ) : (
          <ul>
            {associates.map((associate) => (
              <li
                key={associate.id}
                className="border-b last:border-b-0"
                style={{ borderColor: hairline }}
              >
                <label
                  className={`${mobileTouchTargetClass} flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-[rgba(4,9,32,0.02)]`}
                >
                  <input
                    type="checkbox"
                    className={`mt-1 h-4 w-4 shrink-0 rounded-[4px] border ${focusRingClass}`}
                    style={{ borderColor: hairline, accentColor: '#040920' }}
                    checked={selectedIds.includes(associate.id)}
                    onChange={() => toggle(associate.id)}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{associate.nome}</p>
                    <p className="truncate text-xs" style={{ color: textMuted }}>
                      {[associate.lotacao, associate.cidade, associate.uf]
                        .filter(Boolean)
                        .join(' · ') || 'Sem lotação informada'}
                    </p>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </fieldset>
  );
}
