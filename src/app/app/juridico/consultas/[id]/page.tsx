import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/require-auth';
import { getConsultationById, getNotesByEntity } from '@/lib/juridico/queries';
import {
  getLegalConsultationStatusBadgeClass,
  getLegalConsultationStatusLabel,
  LEGAL_CONSULTATION_STATUS_OPTIONS,
} from '@/lib/juridico/status';
import { updateConsultationStatusFromForm, addNote } from '@/app/app/juridico/actions';
import { formatDate, daysSince } from '@/lib/juridico/formatters';
import { ArrowLeft, Clock, FileText, MessageSquare, Send, User } from 'lucide-react';
import { hairline } from '@/lib/ui/tokens';
import { StatusUpdater } from './StatusUpdater';

export default async function ConsultaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const consultationId = Number(id);

  if (!Number.isInteger(consultationId) || consultationId < 1) {
    notFound();
  }

  const consultation = await getConsultationById(consultationId);
  if (!consultation) {
    notFound();
  }

  const notes = await getNotesByEntity('consultation', consultationId);
  const stale = daysSince(consultation.lastInteractionAt);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/juridico/consultas"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[rgba(4,9,32,0.04)]"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(13,31,60,0.55)]">
              Jurídico / Consultas
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold">
              {consultation.internalNumber}
            </h1>
          </div>
        </div>

        <form action={updateConsultationStatusFromForm} className="flex items-center gap-2">
          <input type="hidden" name="id" value={consultationId} />
          <StatusUpdater defaultValue={consultation.status}>
            {LEGAL_CONSULTATION_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </StatusUpdater>
        </form>
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-[16px] bg-white p-5" style={{ border: `1px solid ${hairline}` }}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getLegalConsultationStatusBadgeClass(consultation.status)}`}
              >
                {getLegalConsultationStatusLabel(consultation.status)}
              </span>
              {stale !== null && stale > 7 && (
                <span className="inline-flex items-center rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-medium text-[#a16207]">
                  Sem atualização há {stale} dias
                </span>
              )}
            </div>

            <h2 className="mb-2 font-serif text-xl font-bold">{consultation.title}</h2>
            <p className="mb-4 text-sm font-semibold text-[rgba(13,31,60,0.70)]">
              {consultation.questionSummary}
            </p>

            {consultation.questionFullText && (
              <div className="mb-4 rounded-lg bg-[#f8fafc] p-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {consultation.questionFullText}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-[rgba(13,31,60,0.60)]">
                <User size={14} />
                <span>Associado: {consultation.associate?.name ?? 'Não vinculado'}</span>
              </div>
              <div className="flex items-center gap-2 text-[rgba(13,31,60,0.60)]">
                <Clock size={14} />
                <span>SLA: {formatDate(consultation.slaDueDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-[rgba(13,31,60,0.60)]">
                <FileText size={14} />
                <span>Aberta por: {consultation.createdBy.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[rgba(13,31,60,0.60)]">
                <MessageSquare size={14} />
                <span>
                  Última interação: {formatDate(consultation.lastInteractionAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] bg-white p-5" style={{ border: `1px solid ${hairline}` }}>
            <h3 className="mb-4 font-serif text-lg font-bold">Histórico</h3>

            {notes.length === 0 ? (
              <p className="text-sm text-[rgba(13,31,60,0.60)]">Nenhuma interação registrada.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="grid grid-cols-[32px_1fr] gap-3"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                        note.isEscritorioResponse ? 'bg-[#eab308]' : 'bg-[#040920]'
                      }`}
                    >
                      {note.isEscritorioResponse ? 'E' : note.createdBy.name.charAt(0)}
                    </div>
                    <div>
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="text-sm font-semibold">
                          {note.isEscritorioResponse ? 'Escritório' : note.createdBy.name}
                        </span>
                        <span className="text-[11px] text-[rgba(13,31,60,0.40)]">
                          {formatDate(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[16px] bg-white p-5" style={{ border: `1px solid ${hairline}` }}>
            <h3 className="mb-4 font-serif text-lg font-bold">Adicionar nota</h3>
            <form action={addNote} className="flex flex-col gap-3">
              <input type="hidden" name="entityType" value="consultation" />
              <input type="hidden" name="entityId" value={consultationId} />

              <textarea
                name="content"
                rows={3}
                required
                placeholder="Descreva a interação..."
                className="w-full rounded-[8px] border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#0d1f3c] placeholder:text-[rgba(13,31,60,0.40)] focus:border-[#76aeea] focus:outline-none"
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isEscritorioResponse"
                  value="true"
                  className="h-4 w-4 rounded-[4px] border border-[#e2e8f0] bg-white accent-[#040920]"
                />
                Resposta do escritório
              </label>

              <div className="flex justify-end">
                <button type="submit" className="inline-flex items-center gap-2 bg-[#040920] text-white rounded-[8px] h-10 px-4 text-sm font-semibold hover:bg-[#0d3260]">
                  <Send size={14} aria-hidden="true" />
                  Adicionar nota
                </button>
              </div>
            </form>
          </div>
        </div>

        <aside className="flex w-full min-w-0 flex-col gap-6">
          <div className="rounded-[16px] bg-white p-4" style={{ border: `1px solid ${hairline}` }}>
            <h3 className="mb-3 font-serif text-lg font-bold">Resumo</h3>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Status</span>
                <span className="font-medium">{getLegalConsultationStatusLabel(consultation.status)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Número</span>
                <span className="font-medium">{consultation.internalNumber}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Associado</span>
                <span className="font-medium">{consultation.associate?.name ?? '—'}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">SLA</span>
                <span className="font-medium">{formatDate(consultation.slaDueDate)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Satisfação</span>
                <span className="font-medium capitalize">
                  {consultation.satisfaction ?? 'Sem resposta'}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Criado por</span>
                <span className="font-medium">{consultation.createdBy.name}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Data de criação</span>
                <span className="font-medium">{formatDate(consultation.createdAt)}</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
