'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import type { BoardAssociate, BoardPerson } from '../AtividadesBoard';
import { ACTIVITY_STATUS_OPTIONS } from '@/lib/activities/status';
import { priorityStyles } from '@/lib/ui/tokens';
import { AREAS } from '@/lib/activities/constants';
import { focusRingClass, navy } from '@/lib/ui/tokens';
import { createActivity } from '../actions';
import { Field } from './Field';
import { TagInput } from './TagInput';
import { AssociatePicker } from './AssociatePicker';
import { AssigneePicker } from './AssigneePicker';

type FormStatus = (typeof ACTIVITY_STATUS_OPTIONS)[number]['value'];
type FormPriority = keyof typeof priorityStyles;
type FormArea = (typeof AREAS)[number]['key'];

interface FormState {
  title: string;
  description: string;
  area: FormArea;
  status: FormStatus;
  priority: FormPriority;
  dueDate: string;
  assigneeId: number;
  associate: BoardAssociate | null;
  tags: string[];
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
  const assigningAnotherUser = form.assigneeId !== currentUser.id;
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

  async function submit(createAnother: boolean) {
    if (!form.title.trim()) {
      setError('Dê um título à atividade.');
      return;
    }
    if (form.title.trim().length < 3) {
      setError('Mínimo 3 caracteres.');
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set('title', form.title.trim());
    formData.set('description', form.description.trim());
    formData.set('status', form.status);
    formData.set('priority', form.priority);
    formData.set('area', form.area);
    formData.set('assigneeId', String(form.assigneeId));
    if (form.associate) formData.set('associateId', String(form.associate.id));
    if (form.dueDate) formData.set('dueDate', form.dueDate);
    formData.set('tags', JSON.stringify(form.tags));

    try {
      await createActivity(formData);
      setSaved(true);
      if (createAnother) {
        window.setTimeout(() => {
          setSaved(false);
          reset();
        }, 900);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar atividade.');
    }
  }

  const statusesForPicker = ACTIVITY_STATUS_OPTIONS.filter((s) => s.value !== 'concluido');

  return (
    <main className="mx-auto w-full max-w-[1180px] min-w-0 px-5 py-7 sm:px-8 lg:px-10">
      <Link
        href="/app/atividades"
        className={`mb-4 inline-flex items-center gap-1.5 text-xs font-medium ${focusRingClass}`}
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
          <h1
            className="mt-2 font-serif text-4xl leading-none font-bold md:text-5xl"
            style={{ color: '#040920' }}
          >
            Criar atividade
          </h1>
          <p
            className="mt-3 max-w-2xl text-sm leading-relaxed"
            style={{ color: 'rgba(13,31,60,0.65)' }}
          >
            Tarefas internas da operação. Vincule a um associado quando o trabalho for sobre uma
            pessoa específica.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/atividades"
            className={`inline-flex min-h-10 items-center justify-center rounded-[8px] border px-4 text-[13px] font-semibold ${focusRingClass}`}
            style={{ color: '#0d1f3c', borderColor: '#c9d2df', background: '#fff' }}
          >
            Cancelar
          </Link>
          <button
            type="button"
            onClick={() => submit(true)}
            className={`inline-flex min-h-10 items-center justify-center rounded-[8px] border px-4 text-[13px] font-semibold ${focusRingClass}`}
            style={{ color: '#0d1f3c', borderColor: '#c9d2df', background: '#fff' }}
          >
            Salvar e criar outra
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            className={`inline-flex min-h-10 items-center justify-center rounded-[8px] px-5 text-[13px] font-semibold text-white ${focusRingClass}`}
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
          Atividade criada com sucesso.
        </div>
      )}

      {error && !saved && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]"
        >
          {error}
        </div>
      )}

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section
          className="flex flex-col gap-5 rounded-[16px] border bg-white p-5 sm:p-6"
          style={{ borderColor: '#c9d2df' }}
        >
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
              className={`h-12 w-full rounded-[8px] border bg-white px-3 text-lg font-medium ${focusRingClass}`}
              style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
            />
          </Field>

          <Field
            label="Área"
            required
            hint="Define onde a atividade vive e como entra nos relatórios."
          >
            <div className="grid gap-2 md:grid-cols-3">
              {AREAS.map((area) => {
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
                      <span className="text-[13px] font-semibold" style={{ color: '#0d1f3c' }}>
                        {area.label}
                      </span>
                    </span>
                    <span className="text-[11px] leading-snug" style={{ color: '#59677a' }}>
                      {area.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field
            controlId="activity-description"
            label="Descrição"
            hint="Contexto, links, próximos passos."
          >
            <textarea
              id="activity-description"
              value={form.description}
              onChange={(event) => update({ description: event.target.value })}
              placeholder="O que precisa ser feito? Quem está envolvido? Quais arquivos?"
              rows={6}
              aria-describedby="activity-description-hint"
              className={`min-h-36 w-full rounded-[8px] border bg-white p-3 text-sm leading-relaxed ${focusRingClass}`}
              style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
            />
          </Field>

          <Field
            controlId="activity-tags"
            label="Tags"
            hint="Aperte Enter ou vírgula para adicionar."
          >
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
          <section
            className="flex flex-col gap-4 rounded-[16px] border bg-white p-4 sm:p-5"
            style={{ borderColor: '#c9d2df' }}
          >
            <h2 className="font-serif text-xl font-bold" style={{ color: '#040920' }}>
              Detalhes
            </h2>

            <Field label="Status inicial">
              <div className="flex flex-col gap-1">
                {statusesForPicker.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => update({ status: status.value })}
                    className={[
                      'flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[13px] font-medium lg:min-h-10',
                      focusRingClass,
                    ].join(' ')}
                    style={{
                      borderColor: form.status === status.value ? navy : 'transparent',
                      background:
                        form.status === status.value ? 'rgba(4,9,32,0.04)' : 'transparent',
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
                {(
                  Object.entries(priorityStyles) as [
                    FormPriority,
                    { label: string; fg: string; bg: string },
                  ][]
                ).map(([key, style]) => {
                  const selected = form.priority === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => update({ priority: key })}
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
                        style={{ color: style.fg, background: style.bg }}
                      >
                        {style.label}
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
                className={`h-12 w-full rounded-[8px] border bg-white px-3 ${focusRingClass}`}
                style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
              />
            </Field>
          </section>

          <section
            className="flex flex-col gap-4 rounded-[16px] border bg-white p-4 sm:p-5"
            style={{ borderColor: '#c9d2df' }}
          >
            <h2 className="font-serif text-xl font-bold" style={{ color: '#040920' }}>
              Responsável
            </h2>
            <AssigneePicker
              people={people}
              currentUserId={currentUser.id}
              value={form.assigneeId}
              onChange={(assigneeId) => update({ assigneeId })}
            />
            {assigningAnotherUser && (
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
                <span>A atividade será criada já atribuída à pessoa selecionada.</span>
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
