'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, Calendar, Check, ChevronDown, Clock, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Kanban } from 'react-kanban-kit';
import type { BoardData } from 'react-kanban-kit';
import {
  compactActionClass,
  desktopDenseControlClass,
  focusRingClass,
  focusWithinClass,
  hairline,
  mobileTouchTargetClass,
  navy,
  priorityStyles,
  statusStyles,
} from '@/lib/ui/tokens';

const ReassignModal = dynamic(() =>
  import('./ReassignModal').then((mod) => ({ default: mod.ReassignModal })),
);

const columns = [
  { key: 'a_fazer', title: statusStyles.a_fazer.label, accent: statusStyles.a_fazer.accent },
  {
    key: 'em_andamento',
    title: statusStyles.em_andamento.label,
    accent: statusStyles.em_andamento.accent,
  },
  {
    key: 'aguardando_terceiros',
    title: statusStyles.aguardando_terceiros.label,
    accent: statusStyles.aguardando_terceiros.accent,
  },
  { key: 'concluido', title: statusStyles.concluido.label, accent: statusStyles.concluido.accent },
] as const;

const priorityTone = priorityStyles;

type Status = (typeof columns)[number]['key'];
type Priority = keyof typeof priorityTone;

export interface BoardPerson {
  id: number;
  name: string;
  role: string;
}

export interface BoardAssociate {
  id: number;
  name: string;
}

export interface BoardActivity {
  id: number;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  dueDate: string | null;
  completedAt: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  associateId: number | null;
  associateName: string | null;
  tags: string[];
  dueOffset: number | null;
}

interface PendingReassignment {
  id: string;
  activityId: number;
  fromUserId: number;
  toUserId: number;
  message: string;
}

interface Filters {
  scope: 'todas' | 'minhas';
  query: string;
  assignee: string;
  priority: '' | Priority;
  associate: string;
  dueWeek: boolean;
  dueLate: boolean;
}

interface AtividadesBoardProps {
  initialActivities: BoardActivity[];
  people: BoardPerson[];
  associates: BoardAssociate[];
  currentUser: BoardPerson;
}

function todayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function dateOnly(value: string | null) {
  if (!value) return null;
  return value.split(/[ T]/)[0] ?? value;
}

function dateFromValue(value: string | null) {
  const date = dateOnly(value);
  if (!date) return null;
  return new Date(`${date}T00:00:00`);
}

function daysFromToday(value: string | null) {
  const date = dateFromValue(value);
  if (!date) return null;
  return Math.round((date.getTime() - todayStart().getTime()) / 86_400_000);
}

function formatDueDate(value: string | null) {
  const date = dateFromValue(value);
  if (!date) return null;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function normalizeActivity(activity: BoardActivity): BoardActivity {
  const dueDate = dateOnly(activity.dueDate);
  return {
    ...activity,
    dueDate,
    completedAt: dateOnly(activity.completedAt),
    tags: Array.isArray(activity.tags) ? activity.tags : [],
    dueOffset: daysFromToday(dueDate),
  };
}

function Avatar({ person, compact = false }: { person?: BoardPerson; compact?: boolean }) {
  if (!person)
    return <span className="h-5 w-5 shrink-0 rounded-full" style={{ background: '#c9d2df' }} aria-hidden="true" />;

  return (
    <span
      title={person.name}
      className={[
        'grid shrink-0 place-items-center rounded-full text-white',
        compact ? 'h-5 w-5 text-[8px]' : 'h-6 w-6 text-[9px]',
      ].join(' ')}
      style={{ background: '#040920' }}
    >
      {initials(person.name)}
    </span>
  );
}

function ActivityCardContent({
  activity,
  peopleById,
  compact,
  hasPending,
}: {
  activity: BoardActivity;
  peopleById: Map<number, BoardPerson>;
  compact: boolean;
  hasPending: boolean;
}) {
  const dueOffset = activity.dueOffset;
  const isLate = dueOffset !== null && dueOffset < 0 && activity.status !== 'concluido';
  const isSoon =
    dueOffset !== null && dueOffset >= 0 && dueOffset <= 3 && activity.status !== 'concluido';
  const priority = priorityTone[activity.priority];

  return (
    <div
      className={[
        'relative flex flex-col rounded-[8px] bg-white transition',
        compact ? 'gap-2 p-3' : 'gap-2.5 p-3.5',
      ].join(' ')}
      style={{ border: `1px solid ${hairline}`, borderLeft: `3px solid ${priority.fg}` }}
    >
      {hasPending && (
        <span
          title="Reatribuição pendente"
          className="absolute -top-1.5 -right-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-[#a16207] text-[10px] font-bold text-white shadow-[0_0_0_2px_#fff]"
        >
          !
        </span>
      )}

      <p
        className={[
          'm-0 text-left leading-snug font-semibold [overflow-wrap:anywhere]',
          compact ? 'text-[13px]' : 'text-sm',
        ].join(' ')}
        style={{ color: '#0d1f3c' }}
      >
        {activity.title}
      </p>

      {!compact && activity.associateName && (
        <p className="m-0 text-[11px]" style={{ color: '#59677a' }}>
          &#x21B3; {activity.associateName}
        </p>
      )}

      {!compact && activity.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activity.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
              style={{ color: '#59677a', borderColor: '#dde3ec', background: '#f8fafc' }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div
        className="mt-1 flex items-center justify-between gap-2 border-t pt-2"
        style={{ borderColor: 'rgba(4,9,32,0.05)' }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {activity.priority !== 'normal' && (
            <span
              className="inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold tracking-[0.08em] uppercase"
              style={{ color: priority.fg, background: priority.bg }}
            >
              {priority.label}
            </span>
          )}
          {activity.dueDate && !activity.completedAt && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium"
              style={{ color: isLate ? '#b91c1c' : isSoon ? '#a16207' : '#59677a' }}
            >
              <Calendar size={12} aria-hidden="true" />
              {formatDueDate(activity.dueDate)}
            </span>
          )}
          {activity.completedAt && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#15803d' }}>
              <Check size={12} aria-hidden="true" />
              {formatDueDate(activity.completedAt)}
            </span>
          )}
        </div>
        <Avatar
          person={activity.assigneeId ? peopleById.get(activity.assigneeId) : undefined}
          compact={compact}
        />
      </div>
    </div>
  );
}

function QuickAdd({
  columnKey,
  onAdd,
}: {
  columnKey: Status;
  onAdd: (title: string, status: Status) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, columnKey);
    setTitle('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          'mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-dashed text-xs font-medium',
          mobileTouchTargetClass,
          focusRingClass,
        ].join(' ')}
        style={{ color: '#59677a', borderColor: '#c9d2df' }}
      >
        <Plus size={14} aria-hidden="true" />
        Adicionar
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-[8px] border bg-white p-2" style={{ borderColor: '#c9d2df' }}>
      <textarea
        ref={inputRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
          if (event.key === 'Escape') {
            setOpen(false);
            setTitle('');
          }
        }}
        placeholder="Título da atividade..."
        aria-label="Título da nova atividade"
        className={[
          'min-h-14 w-full resize-none rounded-[6px] bg-transparent text-[13px]',
          focusRingClass,
        ].join(' ')}
        style={{ color: '#0d1f3c' }}
      />
      <div className="mt-1 flex gap-1.5">
        <button
          type="button"
          onClick={submit}
          className="min-h-10 flex-1 rounded-[8px] px-4 text-[13px] font-semibold text-white"
          style={{ background: '#040920' }}
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle('');
          }}
          className="min-h-10 rounded-[8px] border px-4 text-[13px] font-semibold"
          style={{ color: '#0d1f3c', borderColor: '#c9d2df', background: '#fff' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function buildBoardData(
  grouped: Record<Status, BoardActivity[]>,
  collapsedDone: boolean,
): BoardData {
  const rootChildren: string[] = [];
  const data: BoardData = {
    root: {
      id: 'root',
      title: 'root',
      parentId: null,
      children: rootChildren,
      totalChildrenCount: columns.length,
    },
  };

  for (const column of columns) {
    const columnId = column.key;
    const items = grouped[columnId];
    rootChildren.push(columnId);

    const cardIds: string[] = [];
    const isCollapsed = columnId === 'concluido' && collapsedDone;
    if (!isCollapsed) {
      for (const activity of items) {
        const cardId = String(activity.id);
        cardIds.push(cardId);
        data[cardId] = {
          id: cardId,
          title: activity.title,
          parentId: columnId,
          children: [],
          totalChildrenCount: 0,
          type: 'activity',
          content: activity,
        };
      }
    }

    data[columnId] = {
      id: columnId,
      title: column.title,
      parentId: 'root',
      children: cardIds,
      totalChildrenCount: cardIds.length,
      type: 'column',
    };
  }

  return data;
}

function SummaryStrip({
  activities,
  onLateClick,
}: {
  activities: BoardActivity[];
  onLateClick: () => void;
}) {
  const counts = useMemo(() => {
    const byStatus: Record<Status, number> = {
      a_fazer: 0,
      em_andamento: 0,
      aguardando_terceiros: 0,
      concluido: 0,
    };
    let late = 0;

    for (const activity of activities) {
      byStatus[activity.status] += 1;
      const offset = activity.dueOffset;
      if (offset !== null && offset < 0 && activity.status !== 'concluido') late += 1;
    }

    return { byStatus, late, total: activities.length };
  }, [activities]);

  const items = [
    { value: counts.total, label: 'total' },
    { value: counts.byStatus.a_fazer, label: 'a fazer' },
    { value: counts.byStatus.em_andamento, label: 'em andamento' },
    { value: counts.byStatus.aguardando_terceiros, label: 'aguardando' },
    { value: counts.byStatus.concluido, label: 'concluído' },
    { value: counts.late, label: 'atrasadas', action: onLateClick, danger: counts.late > 0 },
  ];

  return (
    <section
      className="rounded-box mb-4 grid overflow-hidden bg-white sm:grid-cols-3 xl:grid-cols-6"
      style={{ border: `1px solid ${hairline}` }}
      aria-label="Resumo de atividades"
    >
      {items.map((item, index) => {
        const content = (
          <>
            <span
              className="font-serif text-3xl leading-none font-bold"
              style={{ color: item.danger ? '#b91c1c' : undefined }}
            >
              {item.value}
            </span>
            <span className="text-base-content/60 mt-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
              {item.label}
            </span>
          </>
        );

        if (item.action) {
          return (
            <button
              type="button"
              key={item.label}
              onClick={item.action}
              className="hover:bg-base-100 flex flex-col px-5 py-4 text-left"
              style={{ borderLeft: index === 0 ? 'none' : `1px solid ${hairline}` }}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={item.label}
            className="flex flex-col px-5 py-4"
            style={{ borderLeft: index === 0 ? 'none' : `1px solid ${hairline}` }}
          >
            {content}
          </div>
        );
      })}
    </section>
  );
}

function FilterBar({
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
    filters.associate ||
    filters.dueWeek ||
    filters.dueLate;

  const chipClass = [
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition',
    desktopDenseControlClass,
    focusRingClass,
  ].join(' ');

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="border-base-300 inline-flex min-h-11 overflow-hidden rounded-[8px] border bg-white lg:min-h-8">
        {(['todas', 'minhas'] as const).map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => setFilters({ ...filters, scope })}
            className={[
              'px-3 text-xs font-semibold capitalize',
              focusRingClass,
              filters.scope === scope ? 'bg-primary text-white' : 'text-base-content bg-white',
            ].join(' ')}
          >
            {scope === 'todas' ? 'Todas' : 'Minhas'}
          </button>
        ))}
      </div>

      <label
        className={[
          'border-base-300 inline-flex min-h-11 min-w-[220px] items-center gap-2 rounded-[8px] border bg-white px-3 lg:min-h-8',
          focusWithinClass,
        ].join(' ')}
      >
        <span className="sr-only">Buscar atividade por título</span>
        <Search size={14} className="text-base-content/45" aria-hidden="true" />
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
          'border-base-300 rounded-[8px] border bg-white px-2 text-xs',
          desktopDenseControlClass,
          focusRingClass,
        ].join(' ')}
      >
        <option value="">Todos os responsáveis</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por prioridade"
        value={filters.priority}
        onChange={(event) =>
          setFilters({ ...filters, priority: event.target.value as Filters['priority'] })
        }
        className={[
          'border-base-300 rounded-[8px] border bg-white px-2 text-xs',
          desktopDenseControlClass,
          focusRingClass,
        ].join(' ')}
      >
        <option value="">Qualquer prioridade</option>
        {Object.entries(priorityTone).map(([key, tone]) => (
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
          'border-base-300 rounded-[8px] border bg-white px-2 text-xs',
          desktopDenseControlClass,
          focusRingClass,
        ].join(' ')}
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
          borderColor: filters.dueWeek ? navy : 'rgb(221 227 236)',
          background: filters.dueWeek ? navy : '#fff',
          color: filters.dueWeek ? '#fff' : undefined,
        }}
      >
        Esta semana
      </button>
      <button
        type="button"
        onClick={() => setFilters({ ...filters, dueLate: !filters.dueLate, dueWeek: false })}
        className={chipClass}
        style={{
          borderColor: filters.dueLate ? '#b91c1c' : 'rgb(221 227 236)',
          background: filters.dueLate ? '#b91c1c' : '#fff',
          color: filters.dueLate ? '#fff' : undefined,
        }}
      >
        <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
        Atrasadas
      </button>

      <div className="border-base-300 inline-flex min-h-11 overflow-hidden rounded-[8px] border bg-white lg:min-h-8">
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
              compact === option.value ? 'bg-primary text-white' : 'text-base-content bg-white',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() =>
            setFilters({
              scope: 'todas',
              query: '',
              assignee: '',
              priority: '',
              associate: '',
              dueWeek: false,
              dueLate: false,
            })
          }
          className={[
            'text-base-content/60 px-2 text-xs underline',
            desktopDenseControlClass,
            focusRingClass,
          ].join(' ')}
        >
          Limpar
        </button>
      )}
    </div>
  );
}

function Drawer({
  activity,
  people,
  peopleById,
  pending,
  onClose,
  onChange,
  onRequestReassign,
}: {
  activity: BoardActivity | null;
  people: BoardPerson[];
  peopleById: Map<number, BoardPerson>;
  pending?: PendingReassignment;
  onClose: () => void;
  onChange: (
    patch: Partial<BoardActivity> | { acceptReassign: string } | { rejectReassign: string },
  ) => void;
  onRequestReassign: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activity) closeRef.current?.focus();
  }, [activity]);

  if (!activity) return null;

  const priority = priorityTone[activity.priority];

  return (
    <>
      <button
        aria-label="Fechar detalhes"
        className="fixed inset-0 z-50 cursor-default bg-[rgba(4,9,32,0.35)]"
        type="button"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[480px] flex-col bg-white shadow-[-12px_0_30px_rgba(4,9,32,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-details-title"
      >
        <header className="border-base-300 flex items-start justify-between gap-4 border-b px-7 py-5">
          <div className="min-w-0">
            <p className="text-base-content/55 m-0 text-[11px] tracking-[0.16em] uppercase">
              Atividade #{activity.id}
            </p>
            <h2 id="activity-details-title" className="mt-1.5 font-serif text-[26px] leading-tight font-bold">
              {activity.title}
            </h2>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className="btn btn-square btn-ghost min-h-11 min-w-11 bg-base-100 shrink-0 lg:btn-sm"
            aria-label="Fechar"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        {pending && (
          <div className="mx-7 mt-4 rounded-[8px] border border-[#e7c16b] bg-[#f4ddb1] p-3">
            <p className="m-0 text-[11px] font-bold tracking-[0.12em] text-[#7a4a08] uppercase">
              Reatribuição aguardando confirmação
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#5a3a08]">
              <strong>{peopleById.get(pending.fromUserId)?.name ?? 'Outro usuário'}</strong> quer
              atribuir esta atividade.
            </p>
            {pending.message && (
              <p className="mt-2 rounded-md bg-white/60 p-2.5 text-xs leading-relaxed text-[#5a3a08] italic">
                “{pending.message}”
              </p>
            )}
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => onChange({ acceptReassign: pending.id })}
                className="btn min-h-11 flex-1 border-0 bg-[#15803d] text-white lg:btn-sm"
              >
                Aceitar
              </button>
              <button
                type="button"
                onClick={() => onChange({ rejectReassign: pending.id })}
                className="btn btn-outline btn-error min-h-11 flex-1 lg:btn-sm"
              >
                Recusar
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-7 py-5">
          <dl className="grid grid-cols-[112px_1fr] gap-x-3 gap-y-3.5 text-[13px]">
            <dt className="text-base-content/55">Status</dt>
            <dd className="m-0">
              <select
                aria-label="Alterar status da atividade"
                value={activity.status}
                onChange={(event) => onChange({ status: event.target.value as Status })}
                className="select select-bordered min-h-10 bg-white lg:select-sm"
              >
                {columns.map((column) => (
                  <option key={column.key} value={column.key}>
                    {column.title}
                  </option>
                ))}
              </select>
            </dd>

            <dt className="text-base-content/55">Prioridade</dt>
            <dd className="m-0 flex items-center gap-2">
              <span
                className="inline-flex h-6 items-center rounded px-2 text-[10px] font-bold tracking-[0.08em] uppercase"
                style={{ color: priority.fg, background: priority.bg }}
              >
                {priority.label}
              </span>
              <select
                aria-label="Alterar prioridade da atividade"
                value={activity.priority}
                onChange={(event) => onChange({ priority: event.target.value as Priority })}
                className="select select-bordered min-h-10 bg-white lg:select-sm"
              >
                {Object.entries(priorityTone).map(([key, tone]) => (
                  <option key={key} value={key}>
                    {tone.label}
                  </option>
                ))}
              </select>
            </dd>

            <dt className="text-base-content/55">Vencimento</dt>
            <dd className="m-0">
              <input
                aria-label="Alterar vencimento da atividade"
                type="date"
                value={activity.dueDate ?? ''}
                onChange={(event) => onChange({ dueDate: event.target.value || null })}
                className="input input-bordered min-h-10 bg-white lg:input-sm"
              />
            </dd>

            <dt className="text-base-content/55">Responsável</dt>
            <dd className="m-0 flex items-center gap-2">
              <Avatar
                person={activity.assigneeId ? peopleById.get(activity.assigneeId) : undefined}
              />
              <span className="font-medium">
                {activity.assigneeId
                  ? (peopleById.get(activity.assigneeId)?.name ?? activity.assigneeName)
                  : 'Sem responsável'}
              </span>
              <button
                type="button"
                onClick={onRequestReassign}
                className="btn btn-outline min-h-10 ml-auto lg:btn-sm"
                disabled={people.length < 2}
              >
                Reatribuir...
              </button>
            </dd>

            <dt className="text-base-content/55">Associado</dt>
            <dd className="m-0">
              {activity.associateName ?? <span className="text-base-content/40">-</span>}
            </dd>

            <dt className="text-base-content/55">Tags</dt>
            <dd className="m-0 flex flex-wrap gap-1.5">
              {activity.tags.length > 0 ? (
                activity.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border-base-300 bg-base-100 text-base-content/70 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  >
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="text-base-content/40">-</span>
              )}
            </dd>
          </dl>

          <section className="mt-6">
            <p className="text-base-content/55 m-0 text-[11px] font-bold tracking-[0.16em] uppercase">
              Descrição
            </p>
            <p className="text-base-content/80 mt-2 text-sm leading-relaxed">
              {activity.description || (
                <span className="text-base-content/40">
                  Sem descrição. Edite a atividade para detalhar.
                </span>
              )}
            </p>
          </section>

          <section className="mt-7">
            <p className="text-base-content/55 m-0 text-[11px] font-bold tracking-[0.16em] uppercase">
              Histórico
            </p>
            <ul className="mt-3 flex flex-col gap-3 text-xs">
              <li className="text-base-content/70 grid grid-cols-[92px_1fr] gap-2">
                <span className="text-base-content/45">Hoje</span>
                <span>
                  <strong>ASOF</strong> sincronizou dados do quadro.
                </span>
              </li>
              <li className="text-base-content/70 grid grid-cols-[92px_1fr] gap-2">
                <span className="text-base-content/45">Criação</span>
                <span>Atividade registrada no painel operacional.</span>
              </li>
            </ul>
          </section>
        </div>
      </aside>
    </>
  );
}

export function AtividadesBoard({
  initialActivities,
  people,
  associates,
  currentUser,
}: AtividadesBoardProps) {
  const [items, setItems] = useState(() => initialActivities.map(normalizeActivity));
  const [filters, setFilters] = useState<Filters>({
    scope: 'todas',
    query: '',
    assignee: '',
    priority: '',
    associate: '',
    dueWeek: false,
    dueLate: false,
  });
  const [compact, setCompact] = useState(false);
  const [collapsedDone, setCollapsedDone] = useState(false);
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [reassignActivity, setReassignActivity] = useState<BoardActivity | null>(null);
  const [pendings, setPendings] = useState<PendingReassignment[]>([]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const pendingByActivity = useMemo(
    () => new Map(pendings.map((pending) => [pending.activityId, pending])),
    [pendings],
  );

  const filtered = useMemo(
    () =>
      items.filter((activity) => {
        if (filters.scope === 'minhas' && activity.assigneeId !== currentUser.id) return false;
        if (filters.query && !activity.title.toLowerCase().includes(filters.query.toLowerCase())) {
          return false;
        }
        if (filters.assignee && activity.assigneeId !== Number(filters.assignee)) return false;
        if (filters.priority && activity.priority !== filters.priority) return false;
        if (filters.associate === '__any' && !activity.associateId) return false;
        if (
          filters.associate &&
          filters.associate !== '__any' &&
          activity.associateId !== Number(filters.associate)
        ) {
          return false;
        }
        if (filters.dueWeek) {
          const offset = activity.dueOffset;
          if (offset === null || offset < 0 || offset > 7) return false;
        }
        if (filters.dueLate) {
          const offset = activity.dueOffset;
          if (offset === null || offset >= 0 || activity.status === 'concluido') return false;
        }
        return true;
      }),
    [currentUser.id, filters, items],
  );

  const grouped = useMemo(() => {
    const result: Record<Status, BoardActivity[]> = {
      a_fazer: [],
      em_andamento: [],
      aguardando_terceiros: [],
      concluido: [],
    };
    for (const activity of filtered) result[activity.status].push(activity);
    return result;
  }, [filtered]);

  const drawerActivity = drawerId
    ? (items.find((activity) => activity.id === drawerId) ?? null)
    : null;

  function updateActivity(id: number, patch: Partial<BoardActivity>) {
    setItems((activities) =>
      activities.map((activity) => {
        if (activity.id !== id) return activity;
        const updated = { ...activity, ...patch };
        if ('dueDate' in patch) {
          updated.dueOffset = daysFromToday(updated.dueDate);
        }
        return updated;
      }),
    );
  }

  function handleDrawerChange(
    patch: Partial<BoardActivity> | { acceptReassign: string } | { rejectReassign: string },
  ) {
    if ('acceptReassign' in patch) {
      const pending = pendings.find((item) => item.id === patch.acceptReassign);
      if (pending) {
        updateActivity(pending.activityId, { assigneeId: pending.toUserId });
        setPendings((current) => current.filter((item) => item.id !== patch.acceptReassign));
      }
      return;
    }

    if ('rejectReassign' in patch) {
      setPendings((current) => current.filter((item) => item.id !== patch.rejectReassign));
      return;
    }

    if (!drawerId) return;
    const current = items.find((activity) => activity.id === drawerId);
    const nextPatch = { ...patch };
    if (nextPatch.status === 'concluido' && current?.status !== 'concluido') {
      nextPatch.completedAt = new Date().toISOString().slice(0, 10);
    }
    updateActivity(drawerId, nextPatch);
  }

  function handleAdd(title: string, status: Status) {
    const id = Math.max(0, ...items.map((activity) => activity.id)) + 1;
    setItems((activities) => [
      ...activities,
      {
        id,
        title,
        status,
        priority: 'normal',
        dueDate: null,
        completedAt: null,
        assigneeId: currentUser.id,
        assigneeName: currentUser.name,
        associateId: null,
        associateName: null,
        tags: [],
        description: null,
        dueOffset: null,
      },
    ]);
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] min-w-0 px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base-content/55 m-0 text-[11px] tracking-[0.18em] whitespace-nowrap uppercase">
            Operação · Quadro de atividades
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-5xl">
            Atividades
          </h1>
        </div>
        <Link
          href="/app/atividades/nova"
          className="btn btn-primary min-h-11 rounded-[8px] px-5 text-sm lg:h-10 lg:min-h-10"
        >
          <Plus size={16} aria-hidden="true" />
          Nova atividade
        </Link>
      </div>

      <SummaryStrip
        activities={items}
        onLateClick={() => setFilters({ ...filters, dueLate: true, dueWeek: false })}
      />

      <FilterBar
        filters={filters}
        people={people}
        associates={associates}
        compact={compact}
        setCompact={setCompact}
        setFilters={setFilters}
      />

      {items.length === 0 && (
        <div className="rounded-box border-base-300 text-base-content/60 mb-5 border border-dashed bg-white px-5 py-4 text-sm">
          Nenhuma atividade cadastrada ainda. Use o botão <strong>Nova atividade</strong> ou o
          quick-add das colunas para montar o quadro.
        </div>
      )}

      <div className="relative">
        <Kanban
          dataSource={useMemo(() => buildBoardData(grouped, collapsedDone), [grouped, collapsedDone])}
          configMap={{
            activity: {
              render: ({ data }) => {
                const activity = data.content as BoardActivity;
                return (
                  <ActivityCardContent
                    activity={activity}
                    peopleById={peopleById}
                    compact={compact}
                    hasPending={pendingByActivity.has(activity.id)}
                  />
                );
              },
              isDraggable: true,
            },
          }}
          rootClassName="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3 xl:grid-cols-4"
          rootStyle={{ scrollbarWidth: 'thin' }}
          columnWrapperClassName={() => 'snap-start min-w-[280px] md:min-w-0'}
          columnWrapperStyle={() => ({
            background: '#eef1f6',
            borderRadius: 16,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          })}
          columnClassName={() => 'flex min-w-0 flex-col'}
          cardWrapperStyle={() => ({ marginBottom: 8 })}
          cardsGap={8}
          virtualization={false}
          allowColumnAdder={false}
          allowListFooter={(column) => column.id !== 'concluido'}
          renderListFooter={(column) => (
            <QuickAdd columnKey={column.id as Status} onAdd={handleAdd} />
          )}
          renderColumnHeader={(column) => {
            const col = columns.find((c) => c.key === column.id);
            if (!col) return null;
            return (
              <header className="flex items-center justify-between gap-2 px-1 pt-1 pb-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className="shrink-0 rounded-[2px]"
                    style={{ width: 8, height: 8, background: col.accent }}
                    aria-hidden="true"
                  />
                  <h2
                    className="truncate text-[11px] font-bold tracking-[0.1em] uppercase"
                    style={{ color: '#0d1f3c', fontFamily: "'Google Sans', system-ui, sans-serif" }}
                  >
                    {col.title}
                  </h2>
                  <span
                    className="shrink-0 rounded-full px-1.5 text-[11px] font-semibold"
                    style={{ color: '#59677a', background: 'rgba(4,9,32,0.06)' }}
                  >
                    {column.totalChildrenCount ?? 0}
                  </span>
                </div>
                {col.key === 'concluido' && (
                  <button
                    type="button"
                    onClick={() => setCollapsedDone((current) => !current)}
                    className={[
                      'grid place-items-center rounded hover:bg-white',
                      compactActionClass,
                      focusRingClass,
                    ].join(' ')}
                    aria-label={collapsedDone ? 'Expandir concluídas' : 'Recolher concluídas'}
                  >
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className={collapsedDone ? '-rotate-90 transition-transform' : 'transition-transform'}
                      style={{ color: '#59677a' }}
                    />
                  </button>
                )}
              </header>
            );
          }}
          onCardClick={(_, card) => {
            const activity = card.content as BoardActivity;
            setDrawerId(activity.id);
          }}
          onCardMove={({ cardId, toColumnId }) => {
            const id = Number(cardId);
            const newStatus = toColumnId as Status;
            const current = items.find((a) => a.id === id);
            updateActivity(id, {
              status: newStatus,
              completedAt:
                newStatus === 'concluido'
                  ? new Date().toISOString().slice(0, 10)
                  : current?.status === 'concluido'
                    ? null
                    : current?.completedAt ?? null,
            });
          }}
        />
        <div className="pointer-events-none absolute top-0 right-0 bottom-4 w-10 bg-gradient-to-l from-base-100 to-transparent md:hidden" />
      </div>

      <div className="text-base-content/55 mt-5 flex items-center gap-2 text-xs">
        <Clock size={14} aria-hidden="true" />
        Reatribuições aparecem como pendentes até o destinatário aceitar.
        <ArrowRight size={14} aria-hidden="true" />
      </div>

      <Drawer
        activity={drawerActivity}
        people={people}
        peopleById={peopleById}
        pending={
          drawerActivity && pendingByActivity.get(drawerActivity.id)?.toUserId === currentUser.id
            ? pendingByActivity.get(drawerActivity.id)
            : undefined
        }
        onClose={() => setDrawerId(null)}
        onChange={handleDrawerChange}
        onRequestReassign={() => {
          if (drawerActivity) setReassignActivity(drawerActivity);
        }}
      />

      {reassignActivity && (
        <ReassignModal
          activity={reassignActivity}
          people={people}
          onClose={() => setReassignActivity(null)}
          onSubmit={(toUserId, message) => {
            setPendings((current) => [
              ...current,
              {
                id: `pending-${Date.now()}`,
                activityId: reassignActivity.id,
                fromUserId: currentUser.id,
                toUserId,
                message,
              },
            ]);
            setReassignActivity(null);
          }}
        />
      )}
    </main>
  );
}
