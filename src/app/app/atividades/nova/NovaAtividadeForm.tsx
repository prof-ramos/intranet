'use client';

import Link from 'next/link';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { BoardAssociate, BoardPerson } from '../AtividadesBoard';
import { initialsFromName } from '@/lib/utils/initials';
import {
  focusRingClass,
  focusWithinClass,
  navy,
  canvas,
} from '@/lib/ui/tokens';

const statuses = [
  { key: 'a_fazer', label: 'A fazer', accent: '#94a3b8' },
  { key: 'em_andamento', label: 'Em andamento', accent: '#76AEEA' },
  { key: 'aguardando_terceiros', label: 'Aguardando terceiros', accent: '#e7c16b' },
] as const;

const priorities = [
  { key: 'baixa', label: 'Baixa', fg: 'rgba(13,31,60,0.5)', bg: canvas },
  { key: 'normal', label: 'Normal', fg: 'rgba(13,31,60,0.75)', bg: canvas },
  { key: 'alta', label: 'Alta', fg: '#a16207', bg: '#f4ddb1' },
  { key: 'urgente', label: 'Urgente', fg: '#b91c1c', bg: '#fee2e2' },
] as const;

const areas = [
  {
    key: 'administrativo',
    label: 'Administrativo',
    accent: '#76AEEA',
    desc: 'Secretaria, comunicação, operação',
  },
  {
    key: 'juridico',
    label: 'Jurídico',
    accent: '#a16207',
    desc: 'Pareceres, processos, consultas',
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    accent: '#15803d',
    desc: 'Contribuições, pagamentos, prestação de contas',
  },
] as const;

const tagSuggestions = [
  'secretaria',
  'comunicacao',
  'diretoria',
  'ti',
  'cadastro',
  'siape',
  'juridico',
  'financeiro',
];

type Status = (typeof statuses)[number]['key'];
type Priority = (typeof priorities)[number]['key'];
type Area = (typeof areas)[number]['key'];

interface FormState {
  title: string;
  description: string;
  area: Area;
  status: Status;
  priority: Priority;
  dueDate: string;
  assigneeId: number;
  associate: BoardAssociate | null;
  tags: string[];
}

function Field({
  controlId,
  label,
  required,
  hint,
  error,
  children,
}: {
  controlId?: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const hintId = controlId ? `${controlId}-hint` : undefined;
  const errorId = controlId ? `${controlId}-error` : undefined;
  const labelContent = (
    <>
      {label}
      {required && <span className="ml-1 text-[#b91c1c]">*</span>}
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      {controlId ? (
        <label
          htmlFor={controlId}
          className="text-[11px] font-bold tracking-[0.10em] uppercase"
          style={{ color: '#59677a' }}
        >
          {labelContent}
        </label>
      ) : (
        <span className="text-[11px] font-bold tracking-[0.10em] uppercase" style={{ color: '#59677a' }}>
          {labelContent}
        </span>
      )}
      {children}
      {error ? (
        <span id={errorId} className="text-xs font-medium" style={{ color: '#b91c1c' }}>
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="text-xs leading-relaxed" style={{ color: '#59677a' }}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}

function TagInput({
  id,
  describedBy,
  value,
  onChange,
}: {
  id: string;
  describedBy?: string;
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const filtered = useMemo(
    () =>
      tagSuggestions
        .filter((tag) => !value.includes(tag) && tag.includes(draft.toLowerCase()))
        .slice(0, 5),
    [draft, value],
  );

  function addTag(tag: string) {
    const normalized = tag
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
    if (normalized && !value.includes(normalized)) onChange([...value, normalized]);
    setDraft('');
    inputRef.current?.focus();
  }

  return (
    <div
      className={[
        'relative flex min-h-11 flex-wrap items-center gap-1 rounded-[8px] border bg-white p-1.5',
        focusWithinClass,
      ].join(' ')}
      style={{ borderColor: '#c9d2df' }}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border py-1 pr-1 pl-2.5 text-xs font-semibold"
          style={{ color: '#0d1f3c', borderColor: '#dde3ec', background: '#f8fafc' }}
        >
          #{tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((item) => item !== tag))}
            className={[
              'grid h-6 w-6 place-items-center rounded-full lg:h-4 lg:w-4',
              focusRingClass,
            ].join(' ')}
            style={{ color: '#59677a', background: 'rgba(13,31,60,0.08)' }}
            aria-label={`Remover tag ${tag}`}
          >
            <X size={10} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        aria-describedby={describedBy}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ',') && draft.trim()) {
            event.preventDefault();
            addTag(draft);
          }
          if (event.key === 'Backspace' && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        placeholder={value.length ? '' : 'Adicione tags...'}
        className="min-w-28 flex-1 bg-transparent px-2 py-1.5 text-[13px] focus:outline-none"
        style={{ color: '#0d1f3c' }}
      />
      {draft && filtered.length > 0 && (
        <div
          className="absolute top-full right-0 left-0 z-20 mt-1 rounded-[8px] border bg-white p-1"
          style={{ borderColor: '#c9d2df', boxShadow: '0 8px 20px rgba(4,9,32,0.08)' }}
        >
          {filtered.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="block w-full rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-[#f8fafc]"
              style={{ color: '#0d1f3c' }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AssociatePicker({
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
        className="input input-bordered min-h-11 w-full rounded-[8px] bg-white"
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

function AssigneePicker({
  people,
  currentUserId,
  value,
  onChange,
}: {
  people: BoardPerson[];
  currentUserId: number;
  value: number;
  onChange: (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {people.map((person) => {
        const selected = value === person.id;
        return (
          <button
            key={person.id}
            type="button"
            onClick={() => onChange(person.id)}
            className={[
              'flex min-h-11 items-center gap-3 rounded-[8px] border px-3 py-2.5 text-left transition hover:bg-[#f8fafc]',
              focusRingClass,
            ].join(' ')}
            style={{
              borderColor: selected ? navy : '#dde3ec',
              background: selected ? 'rgba(4,9,32,0.04)' : '#fff',
            }}
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
              style={{ background: '#040920' }}
            >
              {initialsFromName(person.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold" style={{ color: '#0d1f3c' }}>
                {person.name}{' '}
                {person.id === currentUserId && (
                  <span className="font-medium" style={{ color: '#59677a' }}>(você)</span>
                )}
              </span>
              <span className="mt-0.5 block text-[11px] capitalize" style={{ color: '#59677a' }}>
                {person.role}
              </span>
            </span>
            <span
              className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2"
              style={{ borderColor: selected ? navy : 'rgba(13,31,60,0.30)' }}
            >
              {selected && <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#040920' }} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function NovaAtividadeForm({
  people,
  associates,
  currentUser,
}: {
  people: BoardPerson[];
  associates: BoardAssociate[];
  currentUser: BoardPerson;
}) {
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    area: 'administrativo',
    status: 'a_fazer',
    priority: 'normal',
    dueDate: '',
    assigneeId: currentUser.id,
    associate: null,
    tags: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const reassignmentRequired = form.assigneeId !== currentUser.id;

  function update(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setForm({
      title: '',
      description: '',
      area: 'administrativo',
      status: 'a_fazer',
      priority: 'normal',
      dueDate: '',
      assigneeId: currentUser.id,
      associate: null,
      tags: [],
    });
    setError(null);
  }

  function submit(createAnother: boolean) {
    if (!form.title.trim()) {
      setError('Dê um título à atividade.');
      return;
    }
    if (form.title.trim().length < 3) {
      setError('Mínimo 3 caracteres.');
      return;
    }
    setError(null);
    setSaved(true);
    if (createAnother) {
      window.setTimeout(() => {
        setSaved(false);
        reset();
      }, 900);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] min-w-0 px-5 py-7 sm:px-8 lg:px-10">
      <Link
        href="/app/atividades"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium"
        style={{ color: '#59677a' }}
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Voltar para Atividades
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-[11px] tracking-[0.18em] uppercase" style={{ color: '#59677a' }}>
            Atividades · Nova
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-5xl" style={{ color: '#040920' }}>
            Criar atividade
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: 'rgba(13,31,60,0.65)' }}>
            Tarefas internas da operação. Vincule a um associado quando o trabalho for sobre uma
            pessoa específica.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/atividades"
            className="inline-flex min-h-10 items-center justify-center rounded-[8px] border px-4 text-[13px] font-semibold"
            style={{ color: '#0d1f3c', borderColor: '#c9d2df', background: '#fff' }}
          >
            Cancelar
          </Link>
          <button
            type="button"
            onClick={() => submit(true)}
            className="inline-flex min-h-10 items-center justify-center rounded-[8px] border px-4 text-[13px] font-semibold"
            style={{ color: '#0d1f3c', borderColor: '#c9d2df', background: '#fff' }}
          >
            Salvar e criar outra
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            className="inline-flex min-h-10 items-center justify-center rounded-[8px] px-5 text-[13px] font-semibold text-white"
            style={{ background: '#040920' }}
          >
            Criar atividade
          </button>
        </div>
      </div>

      {saved && (
        <div
          role="status"
          className="mb-5 flex items-center gap-2 rounded-[10px] border px-4 py-3 text-sm font-medium"
          style={{ borderColor: '#86efac', background: '#dcfce7', color: '#15803d' }}
        >
          <Check size={16} aria-hidden="true" />
          Atividade criada{reassignmentRequired ? ' — solicitação de atribuição enviada.' : '.'}
        </div>
      )}

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-5 rounded-[16px] border bg-white p-5 sm:p-6" style={{ borderColor: '#c9d2df' }}>
          <Field
            controlId="activity-title"
            label="Título"
            required
            error={error ?? undefined}
            hint={!error ? 'Comece com um verbo: Validar, Publicar, Revisar...' : undefined}
          >
            <input
              id="activity-title"
              value={form.title}
              onChange={(event) => {
                update({ title: event.target.value });
                if (error) setError(null);
              }}
              placeholder="Ex.: Publicar boletim de Maio"
              aria-invalid={!!error}
              aria-describedby={error ? 'activity-title-error' : 'activity-title-hint'}
              className="h-12 w-full rounded-[8px] border bg-white px-3 text-lg font-medium"
              style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
            />
          </Field>

          <Field
            label="Área"
            required
            hint="Define onde a atividade vive e como entra nos relatórios."
          >
            <div className="grid gap-2 md:grid-cols-3">
              {areas.map((area) => {
                const selected = form.area === area.key;
                return (
                  <button
                    key={area.key}
                    type="button"
                    onClick={() => update({ area: area.key })}
                    className={[
                      'flex min-h-11 flex-col gap-1.5 rounded-[8px] border p-3 text-left transition hover:bg-[#f8fafc]',
                      focusRingClass,
                    ].join(' ')}
                    style={{
                      borderColor: selected ? navy : '#dde3ec',
                      background: selected ? 'rgba(4,9,32,0.04)' : '#fff',
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="rounded-[2px]"
                        style={{ width: 8, height: 8, background: area.accent }}
                        aria-hidden="true"
                      />
                      <span className="text-[13px] font-semibold" style={{ color: '#0d1f3c' }}>{area.label}</span>
                    </span>
                    <span className="text-[11px] leading-snug" style={{ color: '#59677a' }}>
                      {area.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field controlId="activity-description" label="Descrição" hint="Contexto, links, próximos passos.">
            <textarea
              id="activity-description"
              value={form.description}
              onChange={(event) => update({ description: event.target.value })}
              placeholder="O que precisa ser feito? Quem está envolvido? Quais arquivos?"
              rows={6}
              aria-describedby="activity-description-hint"
              className="min-h-36 w-full rounded-[8px] border bg-white p-3 text-sm leading-relaxed"
              style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
            />
          </Field>

          <Field controlId="activity-tags" label="Tags" hint="Aperte Enter ou vírgula para adicionar.">
            <TagInput
              id="activity-tags"
              describedBy="activity-tags-hint"
              value={form.tags}
              onChange={(tags) => update({ tags })}
            />
          </Field>

          <Field
            controlId="activity-associate"
            label="Associado vinculado"
            hint="Opcional. Use quando a atividade for sobre uma pessoa específica."
          >
            <AssociatePicker
              id="activity-associate"
              describedBy="activity-associate-hint"
              associates={associates}
              value={form.associate}
              onChange={(associate) => update({ associate })}
            />
          </Field>
        </section>

        <aside className="flex flex-col gap-7">
          <section className="flex flex-col gap-4 rounded-[16px] border bg-white p-4 sm:p-5" style={{ borderColor: '#c9d2df' }}>
            <h2 className="font-serif text-xl font-bold" style={{ color: '#040920' }}>Detalhes</h2>

            <Field label="Status inicial">
              <div className="flex flex-col gap-1">
                {statuses.map((status) => (
                  <button
                    key={status.key}
                    type="button"
                    onClick={() => update({ status: status.key })}
                    className={[
                      'flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[13px] font-medium lg:min-h-10',
                      focusRingClass,
                    ].join(' ')}
                    style={{
                      borderColor: form.status === status.key ? navy : 'transparent',
                      background: form.status === status.key ? 'rgba(4,9,32,0.04)' : 'transparent',
                      color: '#0d1f3c',
                    }}
                  >
                    <span
                      className="rounded-[2px]"
                      style={{ width: 8, height: 8, background: status.accent }}
                      aria-hidden="true"
                    />
                    {status.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Prioridade">
              <div className="grid grid-cols-2 gap-1.5">
                {priorities.map((priority) => {
                  const selected = form.priority === priority.key;
                  return (
                    <button
                      key={priority.key}
                      type="button"
                      onClick={() => update({ priority: priority.key })}
                      className={[
                        'min-h-11 rounded-md border px-2.5 py-2 text-left lg:min-h-10',
                        focusRingClass,
                      ].join(' ')}
                      style={{
                        borderColor: selected ? navy : '#dde3ec',
                        background: selected ? 'rgba(4,9,32,0.04)' : '#fff',
                      }}
                    >
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-[0.08em] uppercase"
                        style={{ color: priority.fg, background: priority.bg }}
                      >
                        {priority.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field controlId="activity-due-date" label="Vencimento" hint="Opcional.">
              <input
                id="activity-due-date"
                type="date"
                value={form.dueDate}
                onChange={(event) => update({ dueDate: event.target.value })}
                aria-describedby="activity-due-date-hint"
                className="h-12 w-full rounded-[8px] border bg-white px-3"
                style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
              />
            </Field>
          </section>

          <section className="flex flex-col gap-4 rounded-[16px] border bg-white p-4 sm:p-5" style={{ borderColor: '#c9d2df' }}>
            <h2 className="font-serif text-xl font-bold" style={{ color: '#040920' }}>Responsável</h2>
            <AssigneePicker
              people={people}
              currentUserId={currentUser.id}
              value={form.assigneeId}
              onChange={(assigneeId) => update({ assigneeId })}
            />
            {reassignmentRequired && (
              <div
                className="flex gap-2 rounded-[8px] border p-3 text-xs leading-relaxed"
                style={{ borderColor: '#e7c16b', background: '#fef9c3', color: '#5a3a08' }}
              >
                <span
                  className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: '#a16207' }}
                >
                  !
                </span>
                <span>
                  Como você está atribuindo a outra pessoa, ela receberá uma{' '}
                  <strong>solicitação de aceite</strong>.
                </span>
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
