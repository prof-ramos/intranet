'use client';

import Link from 'next/link';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { BoardAssociate, BoardPerson } from '../AtividadesBoard';
import {
  focusRingClass,
  focusWithinClass,
  navy,
  surface,
} from '@/lib/ui/tokens';

const statuses = [
  { key: 'a_fazer', label: 'A fazer', accent: '#94a3b8' },
  { key: 'em_andamento', label: 'Em andamento', accent: '#76AEEA' },
  { key: 'aguardando_terceiros', label: 'Aguardando terceiros', accent: '#e7c16b' },
] as const;

const priorities = [
  { key: 'baixa', label: 'Baixa', fg: 'rgba(13,31,60,0.5)', bg: surface },
  { key: 'normal', label: 'Normal', fg: 'rgba(13,31,60,0.75)', bg: surface },
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

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
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
          className="text-base-content/60 text-[11px] font-bold tracking-[0.10em] uppercase"
        >
          {labelContent}
        </label>
      ) : (
        <span className="text-base-content/60 text-[11px] font-bold tracking-[0.10em] uppercase">
          {labelContent}
        </span>
      )}
      {children}
      {error ? (
        <span id={errorId} className="text-xs font-medium text-[#b91c1c]">
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="text-base-content/55 text-xs leading-relaxed">
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
        'border-base-300 relative flex min-h-11 flex-wrap items-center gap-1 rounded-[8px] border bg-white p-1.5',
        focusWithinClass,
      ].join(' ')}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="border-base-300 bg-base-100 text-base-content/80 inline-flex items-center gap-1 rounded-full border py-1 pr-1 pl-2.5 text-xs font-semibold"
        >
          #{tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((item) => item !== tag))}
            className={[
              'bg-base-content/10 text-base-content/70 grid h-6 w-6 place-items-center rounded-full lg:h-4 lg:w-4',
              focusRingClass,
            ].join(' ')}
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
      />
      {draft && filtered.length > 0 && (
        <div className="border-base-300 absolute top-full right-0 left-0 z-20 mt-1 rounded-[8px] border bg-white p-1 shadow-[0_8px_20px_rgba(4,9,32,0.08)]">
          {filtered.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="hover:bg-base-100 block w-full rounded-md px-2.5 py-2 text-left text-[13px]"
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
      <div className="border-base-300 flex items-center justify-between gap-3 rounded-[8px] border bg-white px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{value.name}</p>
          <p className="text-base-content/55 mt-0.5 text-xs">Associado vinculado</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={['min-h-11 px-2 text-xs underline lg:min-h-8', focusRingClass].join(' ')}
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
      />
      {open && (
        <div className="border-base-300 absolute top-full right-0 left-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-[8px] border bg-white p-1 shadow-[0_8px_20px_rgba(4,9,32,0.08)]">
          {filtered.length === 0 ? (
            <p className="text-base-content/55 px-3 py-2 text-sm">Nenhum associado encontrado.</p>
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
                  'hover:bg-base-100 block w-full rounded-md px-3 py-3 text-left lg:py-2',
                  focusRingClass,
                ].join(' ')}
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
              'hover:bg-base-100 flex min-h-11 items-center gap-3 rounded-[8px] border px-3 py-2.5 text-left transition',
              focusRingClass,
            ].join(' ')}
            style={{
              borderColor: selected ? navy : 'rgb(221 227 236)',
              background: selected ? 'rgba(4,9,32,0.04)' : '#fff',
            }}
          >
            <span className="bg-primary grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white">
              {initials(person.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">
                {person.name}{' '}
                {person.id === currentUserId && (
                  <span className="text-base-content/55 font-medium">(você)</span>
                )}
              </span>
              <span className="text-base-content/55 mt-0.5 block text-[11px] capitalize">
                {person.role}
              </span>
            </span>
            <span
              className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2"
              style={{ borderColor: selected ? navy : 'rgba(13,31,60,0.30)' }}
            >
              {selected && <span className="bg-primary h-1.5 w-1.5 rounded-full" />}
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
    <main className="max-w-[1280px] min-w-0 px-5 py-8 sm:px-8 lg:px-10">
      <Link
        href="/app/atividades"
        className="text-base-content/60 mb-4 inline-flex items-center gap-1.5 text-xs font-medium"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Voltar para Atividades
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base-content/55 m-0 text-[11px] tracking-[0.18em] uppercase">
            Atividades · Nova
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-5xl">
            Criar atividade
          </h1>
          <p className="text-base-content/65 mt-3 max-w-2xl text-sm leading-relaxed">
            Tarefas internas da operação. Vincule a um associado quando o trabalho for sobre uma
            pessoa específica.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/atividades"
            className="btn btn-outline min-h-11 w-full rounded-[8px] sm:w-auto lg:h-10 lg:min-h-10"
          >
            Cancelar
          </Link>
          <button
            type="button"
            onClick={() => submit(true)}
            className="btn btn-outline min-h-11 w-full rounded-[8px] sm:w-auto lg:h-10 lg:min-h-10"
          >
            Salvar e criar outra
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            className="btn btn-primary min-h-11 w-full rounded-[8px] sm:w-auto lg:h-10 lg:min-h-10"
          >
            Criar atividade
          </button>
        </div>
      </div>

      {saved && (
        <div
          role="status"
          className="mb-5 flex items-center gap-2 rounded-[10px] border border-[#86efac] bg-[#dcfce7] px-4 py-3 text-sm font-medium text-[#15803d]"
        >
          <Check size={16} aria-hidden="true" />
          Atividade criada{reassignmentRequired ? ' — solicitação de atribuição enviada.' : '.'}
        </div>
      )}

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-box border-base-300 flex flex-col gap-5 border bg-white p-7">
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
              className="input input-bordered h-12 w-full rounded-[8px] bg-white text-lg font-medium"
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
                      'hover:bg-base-100 flex min-h-11 flex-col gap-1.5 rounded-[8px] border p-3 text-left transition',
                      focusRingClass,
                    ].join(' ')}
                    style={{
                      borderColor: selected ? navy : 'rgb(221 227 236)',
                      background: selected ? 'rgba(4,9,32,0.04)' : '#fff',
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-[2px]"
                        style={{ background: area.accent }}
                        aria-hidden="true"
                      />
                      <span className="text-[13px] font-semibold">{area.label}</span>
                    </span>
                    <span className="text-base-content/60 text-[11px] leading-snug">
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
              className="textarea textarea-bordered min-h-36 w-full rounded-[8px] bg-white text-sm leading-relaxed"
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

        <aside className="flex flex-col gap-5">
          <section className="rounded-box border-base-300 flex flex-col gap-4 border bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Detalhes</h2>

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
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-[2px]"
                      style={{ background: status.accent }}
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
                        borderColor: selected ? navy : 'rgb(221 227 236)',
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
                className="input input-bordered w-full rounded-[8px] bg-white"
              />
            </Field>
          </section>

          <section className="rounded-box border-base-300 flex flex-col gap-3.5 border bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Responsável</h2>
            <AssigneePicker
              people={people}
              currentUserId={currentUser.id}
              value={form.assigneeId}
              onChange={(assigneeId) => update({ assigneeId })}
            />
            {reassignmentRequired && (
              <div className="flex gap-2 rounded-[8px] border border-[#e7c16b] bg-[#fef9c3] p-3 text-xs leading-relaxed text-[#5a3a08]">
                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#a16207] text-[11px] font-bold text-white">
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
