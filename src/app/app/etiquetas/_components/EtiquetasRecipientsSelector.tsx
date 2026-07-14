'use client';

import { Search } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
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
    onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
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
      <legend className="text-sm font-semibold">Associados</legend>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Buscar associado por nome</span>
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
          <input
            type="search"
            className="input input-bordered w-full pl-10"
            placeholder="Buscar por nome..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="flex items-center gap-3">
          {isPending && <span className="loading loading-spinner loading-sm" />}
          <button type="button" className="btn btn-outline btn-sm" onClick={toggleVisible} disabled={associates.length === 0}>
            Selecionar visíveis
          </button>
          <span className="text-sm font-semibold">{selectedIds.length} selecionado(s)</span>
        </div>
      </div>
      <div className="mt-3 max-h-72 overflow-y-auto rounded-[8px] border border-base-300">
        {associates.length === 0 ? (
          <p className="p-4 text-center text-sm opacity-70">Nenhum associado encontrado.</p>
        ) : (
          <ul className="divide-y divide-base-300">
            {associates.map((associate) => (
              <li key={associate.id} className="p-0">
                <label className="flex w-full cursor-pointer items-start gap-3 p-3 hover:bg-base-200/50">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm mt-1"
                    checked={selectedIds.includes(associate.id)}
                    onChange={() => toggle(associate.id)}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{associate.nome}</p>
                    <p className="truncate text-xs opacity-70">
                      {[associate.lotacao, associate.cidade, associate.uf].filter(Boolean).join(' · ') || 'Sem lotação informada'}
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
