'use client';

import { X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import {
  buttonOutlineBorder,
  buttonOutlineHoverBg,
  buttonPrimaryText,
  canvas,
  dangerText,
  drawerShadow,
  focusRingClass,
  hairline,
  inputBg,
  overlayScrim,
  priorityStyles,
  reassignmentNotice,
  successText,
  successTextHover,
  textFaint,
  textMuted,
  textPrimary,
  textSecondary,
} from '@/lib/ui/tokens';
import { columns } from './constants';
import { Avatar } from './ActivityCard';
import type { BoardActivity, BoardPerson, PendingReassignment, Priority, Status } from './types';

function isStatus(value: string): value is Status {
  return columns.some((column) => column.key === value);
}

function isPriority(value: string): value is Priority {
  return value in priorityStyles;
}

export function Drawer({
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

  const priority = priorityStyles[activity.priority] ?? priorityStyles.normal;
  const labelStyle = { color: textMuted };
  const inputStyle = { borderColor: hairline, background: inputBg, color: textPrimary };
  const inputClass = ['min-h-10 rounded-[8px] border px-2 text-[13px] lg:min-h-8', focusRingClass].join(' ');
  const hoverBgStyle = { '--activity-hover-bg': buttonOutlineHoverBg } as CSSProperties;

  return (
    <>
      <button
        aria-label="Fechar detalhes"
        className="fixed inset-0 z-50 cursor-default"
        style={{ background: overlayScrim }}
        type="button"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[480px] flex-col bg-white"
        style={{ boxShadow: drawerShadow }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-details-title"
      >
        <header
          className="flex items-start justify-between gap-4 border-b px-7 py-5"
          style={{ borderColor: hairline }}
        >
          <div className="min-w-0">
            <p className="m-0 text-[11px] tracking-[0.16em] uppercase" style={labelStyle}>
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
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--activity-hover-bg)] lg:h-8 lg:w-8"
            style={{ background: canvas, ...hoverBgStyle }}
            aria-label="Fechar"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        {pending && (
          <div
            className="mx-7 mt-4 rounded-[8px] border p-3"
            style={{ borderColor: reassignmentNotice.border, background: reassignmentNotice.bg }}
          >
            <p
              className="m-0 text-[11px] font-bold tracking-[0.12em] uppercase"
              style={{ color: reassignmentNotice.label }}
            >
              Reatribuição aguardando confirmação
            </p>
            <p
              className="mt-1.5 text-[13px] leading-relaxed"
              style={{ color: reassignmentNotice.text }}
            >
              <strong>{peopleById.get(pending.fromUserId)?.name ?? 'Outro usuário'}</strong> quer
              atribuir esta atividade.
            </p>
            {pending.message && (
              <p
                className="mt-2 rounded-md bg-white/60 p-2.5 text-xs leading-relaxed italic"
                style={{ color: reassignmentNotice.text }}
              >
                “{pending.message}”
              </p>
            )}
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => onChange({ acceptReassign: pending.id })}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[8px] px-4 h-11 text-sm font-semibold transition-colors hover:bg-[var(--activity-hover-bg)] lg:h-8"
                style={
                  {
                    background: successText,
                    color: buttonPrimaryText,
                    '--activity-hover-bg': successTextHover,
                  } as CSSProperties
                }
              >
                Aceitar
              </button>
              <button
                type="button"
                onClick={() => onChange({ rejectReassign: pending.id })}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[8px] border bg-white px-4 h-11 text-sm font-semibold transition-colors hover:bg-[var(--activity-hover-bg)] lg:h-8"
                style={{
                  borderColor: buttonOutlineBorder,
                  color: dangerText,
                  ...hoverBgStyle,
                }}
              >
                Recusar
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-7 py-5">
          <dl className="grid grid-cols-[112px_1fr] gap-x-3 gap-y-3.5 text-[13px]">
            <dt style={labelStyle}>Status</dt>
            <dd className="m-0">
              <select
                aria-label="Alterar status da atividade"
                value={activity.status}
                onChange={(event) => {
                  const status = event.target.value;
                  if (isStatus(status)) onChange({ status });
                }}
                className={inputClass}
                style={inputStyle}
              >
                {columns.map((column) => (
                  <option key={column.key} value={column.key}>
                    {column.title}
                  </option>
                ))}
              </select>
            </dd>

            <dt style={labelStyle}>Prioridade</dt>
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
                onChange={(event) => {
                  const priorityValue = event.target.value;
                  if (isPriority(priorityValue)) onChange({ priority: priorityValue });
                }}
                className={inputClass}
                style={inputStyle}
              >
                {Object.entries(priorityStyles).map(([key, tone]) => (
                  <option key={key} value={key}>
                    {tone.label}
                  </option>
                ))}
              </select>
            </dd>

            <dt style={labelStyle}>Vencimento</dt>
            <dd className="m-0">
              <input
                aria-label="Alterar vencimento da atividade"
                type="date"
                value={activity.dueDate ?? ''}
                onChange={(event) => onChange({ dueDate: event.target.value || null })}
                className={inputClass}
                style={inputStyle}
              />
            </dd>

            <dt style={labelStyle}>Responsável</dt>
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
                className="inline-flex ml-auto items-center justify-center gap-2 rounded-[8px] border bg-white px-4 h-10 text-sm font-semibold transition-colors hover:bg-[var(--activity-hover-bg)] lg:h-8"
                style={{ borderColor: buttonOutlineBorder, color: textPrimary, ...hoverBgStyle }}
                disabled={people.length < 2}
                aria-disabled={people.length < 2}
              >
                Reatribuir...
              </button>
            </dd>

            <dt style={labelStyle}>Associado</dt>
            <dd className="m-0">
              {activity.associateName ?? <span style={{ color: textFaint }}>-</span>}
            </dd>

            <dt style={labelStyle}>Tags</dt>
            <dd className="m-0 flex flex-wrap gap-1.5">
              {activity.tags.length > 0 ? (
                activity.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    style={{ borderColor: hairline, background: canvas, color: textSecondary }}
                  >
                    #{tag}
                  </span>
                ))
              ) : (
                <span style={{ color: textFaint }}>-</span>
              )}
            </dd>
          </dl>

          <section className="mt-6">
            <p className="m-0 text-[11px] font-bold tracking-[0.16em] uppercase" style={labelStyle}>
              Descrição
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: textSecondary }}>
              {activity.description || (
                <span style={{ color: textFaint }}>
                  Sem descrição. Edite a atividade para detalhar.
                </span>
              )}
            </p>
          </section>

          {/* TODO: histórico de alterações — aguardando coluna de timeline no schema `activities` */}
        </div>
      </aside>
    </>
  );
}
