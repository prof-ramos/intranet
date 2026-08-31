'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { ASSOCIATE_EXPORT_FIELDS, type AnnotatedField } from '@/lib/associates/lgpd';
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
  warningText,
  white,
} from '@/lib/ui/tokens';
import { countReportAssociatesAction } from './actions';

const COUNT_DEBOUNCE_MS = 300;
const numberFormatter = new Intl.NumberFormat('pt-BR');

const FIELD_GROUPS: { title: string; fields: AnnotatedField[] }[] = [
  {
    title: 'Dados pessoais',
    fields: ASSOCIATE_EXPORT_FIELDS.filter((f) =>
      [
        'fullName',
        'sex',
        'maritalStatus',
        'birthDate',
        'birthCity',
        'birthState',
        'cpf',
        'rg',
        'rgIssuer',
        'rgState',
        'rgExpeditionDate',
        'primaryEmail',
        'secondaryEmail',
        'phone',
        'whatsapp',
      ].includes(f.key),
    ),
  },
  {
    title: 'Endereço',
    fields: ASSOCIATE_EXPORT_FIELDS.filter((f) =>
      [
        'address',
        'neighborhood',
        'addressState',
        'zipCode',
        'locationCity',
        'locationCountry',
      ].includes(f.key),
    ),
  },
  {
    title: 'Administrativo',
    fields: ASSOCIATE_EXPORT_FIELDS.filter((f) =>
      [
        'siape',
        'assignment',
        'assignmentStartDate',
        'classPattern',
        'functionalStatus',
        'associationStatus',
        'contributionStatus',
        'joinedAt',
        'associationCategory',
        'missionType',
        'careerOrigin',
        'admissionDate',
        'inaugurationDate',
        'retirementDate',
        'leaveDate',
        'cancellationDate',
        'paymentMethod',
        'ceocMember',
        'caocMember',
      ].includes(f.key),
    ),
  },
];

const allFieldKeys = FIELD_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

type Filters = {
  functionalStatus: string;
  associationStatus: string;
  contributionStatus: string;
  missionType: string;
  careerOrigin: string;
  paymentMethod: string;
  birthMonth: string;
};

const INITIAL_FILTERS: Filters = {
  functionalStatus: 'todos',
  associationStatus: 'todos',
  contributionStatus: 'todos',
  missionType: 'todos',
  careerOrigin: 'todos',
  paymentMethod: 'todos',
  birthMonth: 'todos',
};

const BIRTH_MONTH_OPTIONS = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
] as const;

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function FilterSelect({
  id,
  name,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  name: keyof Filters;
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
        style={{ borderColor: borderMuted, color: textStrong }}
      >
        {children}
      </select>
    </div>
  );
}

function EnumFilterSelect({
  fieldKey,
  id,
  name,
  label,
  value,
  onChange,
}: {
  fieldKey: AssociateEnumFieldKey;
  id: string;
  name: keyof Filters;
  label: string;
  value: string;
  onChange: (value: string) => void;
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

export function RelatorioForm() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({ ...INITIAL_FILTERS });
  const filtersKey = JSON.stringify(filters);
  const [countResult, setCountResult] = useState<{
    key: string;
    count: number;
  } | null>(null);
  const [countFailedKey, setCountFailedKey] = useState<string | null>(null);

  const isGroupFullySelected = useCallback(
    (groupIndex: number) => FIELD_GROUPS[groupIndex].fields.every((f) => selected.has(f.key)),
    [selected],
  );

  const isAllSelected = allFieldKeys.every((k) => selected.has(k));
  const selectedFields = ASSOCIATE_EXPORT_FIELDS.filter((field) => selected.has(field.key));
  const selectedCount = selectedFields.length;
  const sensitiveCount = selectedFields.filter((field) => field.sensitivity === 'sensitive').length;
  const countLoading = countResult?.key !== filtersKey;
  const countError = countFailedKey === filtersKey;

  useEffect(() => {
    let cancelled = false;

    const handle = window.setTimeout(() => {
      void countReportAssociatesAction(filters)
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

  function toggleField(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(groupIndex: number) {
    const keys = FIELD_GROUPS[groupIndex].fields.map((f) => f.key);
    const allInGroupSelected = keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allInGroupSelected) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allFieldKeys));
  }

  function clearFields() {
    setSelected(new Set());
  }

  function handleSubmit(event: FormEvent) {
    if (selected.size === 0) {
      event.preventDefault();
    }
  }

  const chipStyle = `inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition-colors hover:bg-[rgba(4,9,32,0.04)] touch-manipulation ${focusRingClass}`;
  const chipActive = { borderColor: navy, background: navy, color: white };
  const chipInactive = { borderColor: borderMuted, background: white, color: textStrong };
  const checkboxClass = `size-4 shrink-0 cursor-pointer rounded-[3px] border border-solid bg-white accent-[#040920] ${focusRingClass}`;
  const emptySelection = selected.size === 0;

  const officialsSummary = countLoading
    ? 'Oficiais no recorte …'
    : `${numberFormatter.format(countResult?.count ?? 0)} ${pluralize(countResult?.count ?? 0, 'oficial', 'oficiais')} no recorte`;

  return (
    <form
      method="GET"
      action="/app/associados/relatorio/download"
      onSubmit={handleSubmit}
      className="pb-32"
    >
      <section
        aria-labelledby="relatorio-filtros-heading"
        className="flex flex-col gap-4 rounded-[16px] border bg-white p-5 sm:p-6"
        style={{ borderColor: borderMuted }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="relatorio-filtros-heading"
            className="min-w-0 font-serif text-lg font-bold text-pretty"
            style={{ color: navy }}
          >
            Filtros
          </h2>
          <button
            type="button"
            onClick={() => setFilters({ ...INITIAL_FILTERS })}
            className={chipStyle}
            style={chipInactive}
          >
            Limpar filtros
          </button>
        </div>

        <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <EnumFilterSelect
            fieldKey="functionalStatus"
            id="filter-functional"
            name="functionalStatus"
            label="Situação funcional"
            value={filters.functionalStatus}
            onChange={(functionalStatus) => setFilters((f) => ({ ...f, functionalStatus }))}
          />
          <EnumFilterSelect
            fieldKey="associationStatus"
            id="filter-association"
            name="associationStatus"
            label="Vínculo ASOF"
            value={filters.associationStatus}
            onChange={(associationStatus) => setFilters((f) => ({ ...f, associationStatus }))}
          />
          <EnumFilterSelect
            fieldKey="contributionStatus"
            id="filter-contribution"
            name="contributionStatus"
            label="Contribuição"
            value={filters.contributionStatus}
            onChange={(contributionStatus) => setFilters((f) => ({ ...f, contributionStatus }))}
          />
          <EnumFilterSelect
            fieldKey="missionType"
            id="filter-mission-type"
            name="missionType"
            label="Tipo de missão"
            value={filters.missionType}
            onChange={(missionType) => setFilters((f) => ({ ...f, missionType }))}
          />
          <EnumFilterSelect
            fieldKey="careerOrigin"
            id="filter-career-origin"
            name="careerOrigin"
            label="Origem de carreira"
            value={filters.careerOrigin}
            onChange={(careerOrigin) => setFilters((f) => ({ ...f, careerOrigin }))}
          />
          <EnumFilterSelect
            fieldKey="paymentMethod"
            id="filter-payment-method"
            name="paymentMethod"
            label="Forma de pagamento"
            value={filters.paymentMethod}
            onChange={(paymentMethod) => setFilters((f) => ({ ...f, paymentMethod }))}
          />
          <FilterSelect
            id="filter-birth-month"
            name="birthMonth"
            label="Aniversariantes do mês"
            value={filters.birthMonth}
            onChange={(birthMonth) => setFilters((f) => ({ ...f, birthMonth }))}
          >
            <option value="todos">Todos os meses</option>
            {BIRTH_MONTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </div>
      </section>

      <div className="mt-6 mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={selectAll}
          className={chipStyle}
          style={isAllSelected ? chipActive : chipInactive}
        >
          Selecionar todos os campos
        </button>
        <button type="button" onClick={clearFields} className={chipStyle} style={chipInactive}>
          Limpar campos
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {FIELD_GROUPS.map((group, groupIndex) => {
          const fullySelected = isGroupFullySelected(groupIndex);
          return (
            <fieldset
              key={group.title}
              className="m-0 flex min-w-0 flex-col gap-4 rounded-[16px] border bg-white p-5 sm:p-6"
              style={{ borderColor: borderMuted }}
            >
              <legend className="float-none w-full p-0">
                <span className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className="min-w-0 font-serif text-lg font-bold text-pretty"
                    style={{ color: navy }}
                  >
                    {group.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupIndex)}
                    className={chipStyle}
                    style={fullySelected ? chipActive : chipInactive}
                  >
                    {fullySelected ? 'Remover todos' : 'Selecionar todos'}
                  </button>
                </span>
              </legend>

              <div className="flex flex-col gap-2.5">
                {group.fields.map((field) => {
                  const checked = selected.has(field.key);
                  const sensitive = field.sensitivity === 'sensitive';
                  return (
                    <label
                      key={field.key}
                      className="flex min-h-11 cursor-pointer scroll-mt-14 scroll-mb-32 items-center gap-3 py-1"
                    >
                      <input
                        type="checkbox"
                        name="fields"
                        value={field.key}
                        checked={checked}
                        onChange={() => toggleField(field.key)}
                        className={checkboxClass}
                        style={{ borderColor: navy, accentColor: navy }}
                        aria-label={sensitive ? `${field.label} dado pessoal` : undefined}
                      />
                      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-sm" style={{ color: textStrong }}>
                          {field.label}
                        </span>
                        {sensitive ? (
                          <span className="text-xs" style={{ color: warningText }}>
                            dado pessoal
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div
        role="region"
        aria-label="Resumo da exportação"
        className="fixed right-0 bottom-0 left-0 z-20 border-t md:left-72"
        style={{
          borderColor: borderMuted,
          background: white,
          boxShadow: elevatedShadow,
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <div
            aria-live="polite"
            aria-atomic="true"
            className="min-w-0 text-sm tabular-nums"
            style={{ color: textStrong }}
          >
            {countError ? (
              <p className="m-0">
                Não foi possível contar os oficiais neste recorte. Tente de novo.
              </p>
            ) : (
              <p className="m-0">
                {officialsSummary}
                {' · '}
                {numberFormatter.format(selectedCount)}{' '}
                {pluralize(selectedCount, 'campo', 'campos')}
                {' · '}
                {numberFormatter.format(sensitiveCount)}{' '}
                {pluralize(sensitiveCount, 'dado pessoal', 'dados pessoais')}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="submit"
              disabled={emptySelection}
              aria-describedby={emptySelection ? 'relatorio-empty-hint' : undefined}
              className={`inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[8px] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] ${focusRingClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#040920]`}
              style={{ background: navy }}
            >
              <FileSpreadsheet size={18} aria-hidden="true" />
              Baixar CSV
            </button>
            {emptySelection ? (
              <p id="relatorio-empty-hint" className="m-0 text-sm" style={{ color: textMuted }}>
                Selecione ao menos um campo para baixar o CSV.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
