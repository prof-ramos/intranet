'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { ASSOCIATE_EXPORT_FIELDS, type AnnotatedField } from '@/lib/associates/lgpd';

// Group export fields into sections for the form UI
const FIELD_GROUPS: { title: string; fields: AnnotatedField[] }[] = [
  {
    title: 'Dados Pessoais',
    fields: ASSOCIATE_EXPORT_FIELDS.filter((f) =>
      ['fullName', 'sex', 'maritalStatus', 'birthDate', 'birthCity', 'birthState', 'cpf', 'rg', 'rgIssuer', 'rgState', 'primaryEmail', 'secondaryEmail', 'phone', 'whatsapp'].includes(f.key),
    ),
  },
  {
    title: 'Endereço',
    fields: ASSOCIATE_EXPORT_FIELDS.filter((f) =>
      ['address', 'neighborhood', 'addressState', 'zipCode', 'locationCity', 'locationCountry'].includes(f.key),
    ),
  },
  {
    title: 'Administrativo',
    fields: ASSOCIATE_EXPORT_FIELDS.filter((f) =>
      ['siape', 'assignment', 'assignmentStartDate', 'classPattern', 'functionalStatus', 'associationStatus', 'contributionStatus', 'joinedAt', 'associationCategory', 'missionType', 'careerOrigin', 'admissionDate', 'inaugurationDate', 'retirementDate', 'leaveDate', 'cancellationDate', 'paymentMethod', 'ceocMember', 'caocMember'].includes(f.key),
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

export function RelatorioForm() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({ ...INITIAL_FILTERS });

  const isGroupFullySelected = useCallback(
    (groupIndex: number) => FIELD_GROUPS[groupIndex].fields.every((f) => selected.has(f.key)),
    [selected],
  );

  const isAllSelected = allFieldKeys.every((k) => selected.has(k));

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

  function clearAll() {
    setSelected(new Set());
    setFilters({ ...INITIAL_FILTERS });
  }

  function handleSubmit(event: FormEvent) {
    if (selected.size === 0) {
      event.preventDefault();
      return;
    }
    // permite o envio padrão do formulário
  }

  const chipStyle =
    'inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2';
  const chipActive = { borderColor: '#040920', background: '#040920', color: '#fff' };
  const chipInactive = { borderColor: '#c9d2df', background: '#fff', color: '#0d1f3c' };

  return (
    <form method="GET" action="/app/associados/relatorio/download" onSubmit={handleSubmit}>
      {/* Global actions */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={selectAll}
          className={chipStyle}
          style={isAllSelected ? chipActive : chipInactive}
        >
          Selecionar todos os campos
        </button>
        <button type="button" onClick={clearAll} className={chipStyle} style={chipInactive}>
          Limpar seleção
        </button>
      </div>

      {/* Field groups */}
      <div className="grid gap-6 lg:grid-cols-3">
        {FIELD_GROUPS.map((group, groupIndex) => {
          const fullySelected = isGroupFullySelected(groupIndex);
          return (
            <section
              key={group.title}
              className="flex flex-col gap-4 rounded-[16px] border bg-white p-5 sm:p-6"
              style={{ borderColor: '#c9d2df' }}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-lg font-bold" style={{ color: '#040920' }}>
                  {group.title}
                </h2>
                <button
                  type="button"
                  onClick={() => toggleGroup(groupIndex)}
                  className="inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-semibold transition focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 focus-visible:outline-none"
                  style={
                    fullySelected
                      ? { borderColor: '#040920', background: '#040920', color: '#fff' }
                      : { borderColor: '#c9d2df', background: '#fff', color: '#59677a' }
                  }
                >
                  {fullySelected ? 'Remover todos' : 'Selecionar todos'}
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {group.fields.map((field) => {
                  const checked = selected.has(field.key);
                  return (
                    <label key={field.key} className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        name="fields"
                        value={field.key}
                        checked={checked}
                        onChange={() => toggleField(field.key)}
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                      <span className="text-sm" style={{ color: '#0d1f3c' }}>
                        {field.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Filters */}
      <section
        className="mt-6 flex flex-col gap-4 rounded-[16px] border bg-white p-5 sm:p-6"
        style={{ borderColor: '#c9d2df' }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-bold" style={{ color: '#040920' }}>
            Filtros
          </h2>
          <button
            type="button"
            onClick={() => setFilters({ ...INITIAL_FILTERS })}
            className="inline-flex h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold transition focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 focus-visible:outline-none"
            style={{ borderColor: '#c9d2df', background: '#fff', color: '#59677a' }}
          >
            Limpar filtros
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-functional"
              className="text-[11px] font-bold tracking-[0.10em] uppercase"
              style={{ color: '#59677a' }}
            >
              Situação Funcional
            </label>
            <select
              id="filter-functional"
              name="functionalStatus"
              value={filters.functionalStatus}
              onChange={(e) => setFilters((f) => ({ ...f, functionalStatus: e.target.value }))}
              className="h-12 w-full rounded-[8px] border bg-white px-3 text-sm"
              style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="aposentado">Aposentado</option>
              <option value="cedido">Cedido</option>
              <option value="em_licenca">Em Licença</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-association"
              className="text-[11px] font-bold tracking-[0.10em] uppercase"
              style={{ color: '#59677a' }}
            >
              Vínculo ASOF
            </label>
            <select
              id="filter-association"
              name="associationStatus"
              value={filters.associationStatus}
              onChange={(e) => setFilters((f) => ({ ...f, associationStatus: e.target.value }))}
              className="h-12 w-full rounded-[8px] border bg-white px-3 text-sm"
              style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
            >
              <option value="todos">Todos</option>
              <option value="associado">Associado</option>
              <option value="nao_associado">Não associado</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-contribution"
              className="text-[11px] font-bold tracking-[0.10em] uppercase"
              style={{ color: '#59677a' }}
            >
              Contribuição
            </label>
            <select
              id="filter-contribution"
              name="contributionStatus"
              value={filters.contributionStatus}
              onChange={(e) => setFilters((f) => ({ ...f, contributionStatus: e.target.value }))}
              className="h-12 w-full rounded-[8px] border bg-white px-3 text-sm"
              style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
            >
              <option value="todos">Todos</option>
              <option value="em_dia">Em Dia</option>
              <option value="inadimplente">Inadimplente</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-mission-type"
              className="text-[11px] font-bold tracking-[0.10em] uppercase"
              style={{ color: '#59677a' }}
            >
              Tipo de Missão
            </label>
            <select
              id="filter-mission-type"
              name="missionType"
              value={filters.missionType}
              onChange={(e) => setFilters((f) => ({ ...f, missionType: e.target.value }))}
              className="h-12 w-full rounded-[8px] border bg-white px-3 text-sm"
              style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
            >
              <option value="todos">Todos</option>
              <option value="permanente">Permanente</option>
              <option value="transitoria">Transitória</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-career-origin"
              className="text-[11px] font-bold tracking-[0.10em] uppercase"
              style={{ color: '#59677a' }}
            >
              Origem de Carreira
            </label>
            <select
              id="filter-career-origin"
              name="careerOrigin"
              value={filters.careerOrigin}
              onChange={(e) => setFilters((f) => ({ ...f, careerOrigin: e.target.value }))}
              className="h-12 w-full rounded-[8px] border bg-white px-3 text-sm"
              style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
            >
              <option value="todos">Todos</option>
              <option value="brasil">Brasil</option>
              <option value="exterior">Exterior</option>
              <option value="outros_orgaos">Outros Órgãos</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-payment-method"
              className="text-[11px] font-bold tracking-[0.10em] uppercase"
              style={{ color: '#59677a' }}
            >
              Forma de Pagamento
            </label>
            <select
              id="filter-payment-method"
              name="paymentMethod"
              value={filters.paymentMethod}
              onChange={(e) => setFilters((f) => ({ ...f, paymentMethod: e.target.value }))}
              className="h-12 w-full rounded-[8px] border bg-white px-3 text-sm"
              style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
            >
              <option value="todos">Todos</option>
              <option value="folha">Folha</option>
              <option value="boleto">Boleto</option>
              <option value="pix">PIX</option>
              <option value="transferencia">Transferência</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-birth-month"
              className="text-[11px] font-bold tracking-[0.10em] uppercase"
              style={{ color: '#59677a' }}
            >
              Aniversariantes do Mês
            </label>
            <select
              id="filter-birth-month"
              name="birthMonth"
              value={filters.birthMonth}
              onChange={(e) => setFilters((f) => ({ ...f, birthMonth: e.target.value }))}
              className="h-12 w-full rounded-[8px] border bg-white px-3 text-sm"
              style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
            >
              <option value="todos">Todos os meses</option>
              <option value="1">Janeiro</option>
              <option value="2">Fevereiro</option>
              <option value="3">Março</option>
              <option value="4">Abril</option>
              <option value="5">Maio</option>
              <option value="6">Junho</option>
              <option value="7">Julho</option>
              <option value="8">Agosto</option>
              <option value="9">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={selected.size === 0}
          className="inline-flex h-10 items-center gap-2 rounded-[8px] px-5 text-[13px] font-semibold text-white transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: '#040920' }}
        >
          <FileSpreadsheet size={18} aria-hidden="true" />
          Gerar Relatório
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex h-10 items-center rounded-[8px] border px-4 text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 focus-visible:outline-none"
          style={{ color: '#0d1f3c', borderColor: '#c9d2df', background: '#fff' }}
        >
          Limpar
        </button>
      </div>
    </form>
  );
}
