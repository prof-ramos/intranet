'use client';

import { memo } from 'react';
import { Search } from 'lucide-react';
import {
  borderSoft,
  buttonPrimaryText,
  dangerText,
  desktopDenseControlClass,
  focusRingClass,
  focusWithinClass,
  hairline,
  iconMuted,
  inputBg,
  navy,
  priorityStyles,
  textSecondary,
  textSubtle,
} from '@/lib/ui/tokens';
import type { BoardAssociate, BoardPerson, Filters } from './types';
import { defaultFilters } from './constants';
import { ACTIVITY_STATUS_OPTIONS } from '@/lib/activities/status';

function isPriorityFilter(value: string): value is Filters['priority'] {
  return value === '' || value in priorityStyles;
}

export const FilterBar = memo(function FilterBar({
  filters,
  people,
  associates,
  compact,
  setCompact,
  setFilters,
}: {
  filters: Filters;
  people: BoardPerson[];
  associates: BoardAssociate[];
  compact: boolean;
  setCompact: (compact: boolean) => void;
  setFilters: (filters: Filters) => void;
}) {
  const hasFilters =
    filters.scope !== 'todas' ||
    filters.query ||
    filters.assignee ||
    filters.priority ||
    filters.status ||
    filters.associate ||
    filters.dueWeek ||
    filters.dueLate ||
    filters.openOnly;

  const chipClass = [
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition',
    desktopDenseControlClass,
    focusRingClass,
  ].join(' ');

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div
        className="inline-flex min-h-11 overflow-hidden rounded-[8px] border bg-white lg:min-h-8"
        style={{ borderColor: hairline }}
      >
        {(['todas', 'minhas'] as const).map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => setFilters({ ...filters, scope })}
            className={[
              'px-3 text-xs font-semibold capitalize',
              focusRingClass,
              filters.scope === scope ? '' : 'bg-white',
            ].join(' ')}
            style={{
              background: filters.scope === scope ? navy : undefined,
              color: filters.scope === scope ? buttonPrimaryText : textSecondary,
            }}
          >
            {scope === 'todas' ? 'Todas' : 'Minhas'}
          </button>
        ))}
      </div>

      <label
        className={[
          'inline-flex min-h-11 min-w-[220px] items-center gap-2 rounded-[8px] border bg-white px-3 lg:min-h-8',
          focusWithinClass,
        ].join(' ')}
        style={{ borderColor: hairline }}
      >
        <span className="sr-only">Buscar atividade por título</span>
        <Search size={14} style={{ color: iconMuted }} aria-hidden="true" />
        <input
          value={filters.query}
          onChange={(event) => setFilters({ ...filters, query: event.target.value })}
          placeholder="Buscar por título..."
          className="min-w-0 flex-1 bg-transparent text-[13px] focus:outline-none"
        />
      </label>

      <select
        aria-label="Filtrar por responsável"
        value={filters.assignee}
        onChange={(event) => setFilters({ ...filters, assignee: event.target.value })}
        className={[
          'rounded-[8px] border bg-white px-2 text-xs',
          desktopDenseControlClass,
          focusRingClass,
        ].join(' ')}
        style={{ borderColor: hairline }}
      >
        <option value="">Todos os responsáveis</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por status"
        value={filters.status}
        onChange={(event) => {
          const status = event.target.value;
          setFilters({
            ...filters,
            status: ACTIVITY_STATUS_OPTIONS.some((option) => option.value === status)
              ? (status as Filters['status'])
              : '',
          });
        }}
        className={[
          'rounded-[8px] border bg-white px-2 text-xs',
          desktopDenseControlClass,
          focusRingClass,
        ].join(' ')}
        style={{ borderColor: hairline }}
      >
        <option value="">Qualquer status</option>
        {ACTIVITY_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por prioridade"
        value={filters.priority}
        onChange={(event) => {
          const priority = event.target.value;
          if (isPriorityFilter(priority)) setFilters({ ...filters, priority });
        }}
        className={[
          'rounded-[8px] border bg-white px-2 text-xs',
          desktopDenseControlClass,
          focusRingClass,
        ].join(' ')}
        style={{ borderColor: hairline }}
      >
        <option value="">Qualquer prioridade</option>
        {Object.entries(priorityStyles).map(([key, tone]) => (
          <option key={key} value={key}>
            {tone.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por associado"
        value={filters.associate}
        onChange={(event) => setFilters({ ...filters, associate: event.target.value })}
        className={[
          'rounded-[8px] border bg-white px-2 text-xs',
          desktopDenseControlClass,
          focusRingClass,
        ].join(' ')}
        style={{ borderColor: hairline }}
      >
        <option value="">Qualquer associado</option>
        <option value="__any">Vinculadas a associado</option>
        {associates.map((associate) => (
          <option key={associate.id} value={associate.id}>
            {associate.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setFilters({ ...filters, dueWeek: !filters.dueWeek, dueLate: false })}
        className={chipClass}
        style={{
          borderColor: filters.dueWeek ? navy : borderSoft,
          background: filters.dueWeek ? navy : inputBg,
          color: filters.dueWeek ? buttonPrimaryText : undefined,
        }}
      >
        Esta semana
      </button>
      <button
        type="button"
        onClick={() => setFilters({ ...filters, dueLate: !filters.dueLate, dueWeek: false })}
        className={chipClass}
        style={{
          borderColor: filters.dueLate ? dangerText : borderSoft,
          background: filters.dueLate ? dangerText : inputBg,
          color: filters.dueLate ? buttonPrimaryText : undefined,
        }}
      >
        <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
        Atrasadas
      </button>
      {filters.openOnly && (
        <button
          type="button"
          onClick={() => setFilters({ ...filters, openOnly: false })}
          className={chipClass}
          style={{ borderColor: navy, background: navy, color: buttonPrimaryText }}
        >
          Em aberto
        </button>
      )}

      <div
        className="inline-flex min-h-11 overflow-hidden rounded-[8px] border bg-white lg:min-h-8"
        style={{ borderColor: hairline }}
      >
        {[
          { value: false, label: 'Confortável' },
          { value: true, label: 'Compacto' },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setCompact(option.value)}
            className={[
              'px-3 text-xs font-semibold',
              focusRingClass,
              compact === option.value ? '' : 'bg-white',
            ].join(' ')}
            style={{
              background: compact === option.value ? navy : undefined,
              color: compact === option.value ? buttonPrimaryText : textSecondary,
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => setFilters(defaultFilters)}
          className={[
            'inline-flex items-center gap-1 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition',
            desktopDenseControlClass,
            focusRingClass,
          ].join(' ')}
          style={{ borderColor: textSubtle, color: textSubtle }}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
});
