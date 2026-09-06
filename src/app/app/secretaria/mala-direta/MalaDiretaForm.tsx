'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import {
  getAssociateEnumOptions,
  type AssociateEnumFieldKey,
} from '@/lib/associates/field-registry';
import {
  borderMuted,
  elevatedShadow,
  focusRingClass,
  navy,
  textMuted,
  textStrong,
  white,
} from '@/lib/ui/tokens';
import { countMalaDiretaAudienceAction } from './actions';

const COUNT_DEBOUNCE_MS = 300;
const numberFormatter = new Intl.NumberFormat('pt-BR');

type Filters = {
  associationStatus: 'associado' | 'nao_associado' | 'todos';
  functionalStatus: 'ativo' | 'aposentado' | 'cedido' | 'em_licenca' | 'todos';
  location: 'brasil' | 'exterior' | 'todos';
};

const INITIAL_FILTERS: Filters = {
  associationStatus: 'associado',
  functionalStatus: 'todos',
  location: 'todos',
};

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function FilterSelect<K extends keyof Filters>({
  id,
  name,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  name: K;
  label: string;
  value: Filters[K];
  onChange: (value: Filters[K]) => void;
  children: ReactNode;
}) {
  const selectClass = `min-h-12 w-full rounded-[8px] border bg-white px-3 text-base ${focusRingClass}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="flex min-h-8 items-end text-[11px] font-bold tracking-[0.10em] uppercase"
        style={{ color: textMuted }}
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value as Filters[K])}
        className={selectClass}
        style={{ borderColor: borderMuted, color: textStrong }}
      >
        {children}
      </select>
    </div>
  );
}

function EnumFilterSelect<K extends 'associationStatus' | 'functionalStatus'>({
  fieldKey,
  id,
  name,
  label,
  value,
  onChange,
}: {
  fieldKey: AssociateEnumFieldKey;
  id: string;
  name: K;
  label: string;
  value: Filters[K];
  onChange: (value: Filters[K]) => void;
}) {
  return (
    <FilterSelect id={id} name={name} label={label} value={value} onChange={onChange}>
      <option value="todos">Todos</option>
      {getAssociateEnumOptions(fieldKey).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </FilterSelect>
  );
}

export function MalaDiretaForm() {
  const [filters, setFilters] = useState<Filters>({ ...INITIAL_FILTERS });
  const filtersKey = JSON.stringify(filters);
  const [countResult, setCountResult] = useState<{ key: string; count: number } | null>(null);
  const [countFailedKey, setCountFailedKey] = useState<string | null>(null);

  const countLoading = countResult?.key !== filtersKey;
  const countError = countFailedKey === filtersKey;

  useEffect(() => {
    let cancelled = false;

    const handle = window.setTimeout(() => {
      void countMalaDiretaAudienceAction(filters)
        .then((result) => {
          if (cancelled) return;
          setCountFailedKey(null);
          setCountResult({ key: JSON.stringify(filters), count: result.count });
        })
        .catch(() => {
          if (cancelled) return;
          setCountFailedKey(JSON.stringify(filters));
        });
    }, COUNT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [filters]);

  const audienceSummary = countLoading
    ? 'Contatos com e-mail …'
    : `${numberFormatter.format(countResult?.count ?? 0)} ${pluralize(
        countResult?.count ?? 0,
        'contato com e-mail',
        'contatos com e-mail',
      )}`;

  return (
    <form method="GET" action="/app/secretaria/mala-direta/download" className="pb-28">
      <section
        aria-labelledby="mala-direta-filtros-heading"
        className="flex flex-col gap-4 rounded-[16px] border bg-white p-5 sm:p-6"
        style={{ borderColor: borderMuted }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="mala-direta-filtros-heading"
            className="min-w-0 font-serif text-lg font-bold text-pretty"
            style={{ color: navy }}
          >
            Público
          </h2>
          <button
            type="button"
            onClick={() => setFilters({ ...INITIAL_FILTERS })}
            className={`inline-flex min-h-11 items-center rounded-full border px-3 text-xs font-semibold ${focusRingClass}`}
            style={{ borderColor: borderMuted, background: white, color: textStrong }}
          >
            Restaurar padrão
          </button>
        </div>

        <p className="text-sm" style={{ color: textMuted }}>
          Só entram oficiais com nome legível e e-mail principal cadastrado. O CSV usa o formato de
          importação do Google Contacts (cabeçalhos em inglês).
        </p>

        <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <EnumFilterSelect
            fieldKey="associationStatus"
            id="filter-association"
            name="associationStatus"
            label="Vínculo ASOF"
            value={filters.associationStatus}
            onChange={(associationStatus) => setFilters((f) => ({ ...f, associationStatus }))}
          />
          <EnumFilterSelect
            fieldKey="functionalStatus"
            id="filter-functional"
            name="functionalStatus"
            label="Situação funcional"
            value={filters.functionalStatus}
            onChange={(functionalStatus) => setFilters((f) => ({ ...f, functionalStatus }))}
          />
          <FilterSelect
            id="filter-location"
            name="location"
            label="Localização"
            value={filters.location}
            onChange={(location) => setFilters((f) => ({ ...f, location }))}
          >
            <option value="todos">Todas</option>
            <option value="brasil">Brasil</option>
            <option value="exterior">Exterior</option>
          </FilterSelect>
        </div>

        <p className="text-sm font-medium" style={{ color: countError ? '#b42318' : textStrong }}>
          {countError ? 'Não foi possível contar o público.' : audienceSummary}
        </p>
      </section>

      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-10"
        style={{ borderColor: borderMuted, boxShadow: elevatedShadow }}
      >
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-3">
          <p className="text-sm" style={{ color: textMuted }}>
            Exporta Name, First Name, Last Name e Email 1 - Value.
          </p>
          <button
            type="submit"
            className={`inline-flex min-h-12 items-center gap-2 rounded-[10px] px-5 text-sm font-semibold text-white ${focusRingClass}`}
            style={{ background: navy }}
          >
            <Download size={18} aria-hidden />
            Baixar CSV (Gmail)
          </button>
        </div>
      </div>
    </form>
  );
}
