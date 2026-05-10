import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/require-auth';
import { getConsultationById, getNotesByEntity } from '@/lib/juridico/queries';
import { updateConsultationStatusFromForm, addNote } from '@/app/app/juridico/actions';
import { formatDate, daysSince } from '@/lib/juridico/formatters';
import { ArrowLeft, Clock, FileText, MessageSquare, Send, User } from 'lucide-react';
import { hairline } from '@/lib/ui/tokens';
import { StatusUpdater } from './StatusUpdater';

const statusLabels: Record<string, string> = {
  aberta: 'Aberta',
  aguardando_escritorio: 'Aguardando escritório',
  respondida: 'Respondida',
  arquivada: 'Arquivada',
};

const statusOptions = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'aguardando_escritorio', label: 'Aguardando escritório' },
  { value: 'respondida', label: 'Respondida' },
  { value: 'arquivada', label: 'Arquivada' },
];


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
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-base-content/55">
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
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </StatusUpdater>
        </form>
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-box bg-base-100 p-5" style={{ border: `1px solid ${hairline}` }}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={`badge badge-sm ${
                  consultation.status === 'aberta'
                    ? 'badge-ghost'
                    : consultation.status === 'aguardando_escritorio'
                      ? 'badge-warning'
                      : consultation.status === 'respondida'
                        ? 'badge-success'
                        : 'badge-neutral'
                }`}
              >
                {statusLabels[consultation.status] ?? consultation.status}
              </span>
              {stale !== null && stale > 7 && (
                <span className="badge badge-sm badge-warning">
                  Sem atualização há {stale} dias
                </span>
              )}
            </div>

            <h2 className="mb-2 font-serif text-xl font-bold">{consultation.title}</h2>
            <p className="mb-4 text-sm font-semibold text-base-content/70">
              {consultation.questionSummary}
            </p>

            {consultation.questionFullText && (
              <div className="mb-4 rounded-lg bg-base-200 p-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {consultation.questionFullText}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-base-content/60">
                <User size={14} />
                <span>Associado: {consultation.associate?.name ?? 'Não vinculado'}</span>
              </div>
              <div className="flex items-center gap-2 text-base-content/60">
                <Clock size={14} />
                <span>SLA: {formatDate(consultation.slaDueDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-base-content/60">
                <FileText size={14} />
                <span>Aberta por: {consultation.createdBy.name}</span>
              </div>
              <div className="flex items-center gap-2 text-base-content/60">
                <MessageSquare size={14} />
                <span>
                  Última interação: {formatDate(consultation.lastInteractionAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-box bg-base-100 p-5" style={{ border: `1px solid ${hairline}` }}>
            <h3 className="mb-4 font-serif text-lg font-bold">Histórico</h3>

            {notes.length === 0 ? (
              <p className="text-sm text-base-content/60">Nenhuma interação registrada.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="grid grid-cols-[32px_1fr] gap-3"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                        note.isEscritorioResponse ? 'bg-warning' : 'bg-primary'
                      }`}
                    >
                      {note.isEscritorioResponse ? 'E' : note.createdBy.name.charAt(0)}
                    </div>
                    <div>
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="text-sm font-semibold">
                          {note.isEscritorioResponse ? 'Escritório' : note.createdBy.name}
                        </span>
                        <span className="text-[11px] text-base-content/40">
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

          <div className="rounded-box bg-base-100 p-5" style={{ border: `1px solid ${hairline}` }}>
            <h3 className="mb-4 font-serif text-lg font-bold">Adicionar nota</h3>
            <form action={addNote} className="flex flex-col gap-3">
              <input type="hidden" name="entityType" value="consultation" />
              <input type="hidden" name="entityId" value={consultationId} />

              <textarea
                name="content"
                rows={3}
                required
                placeholder="Descreva a interação..."
                className="textarea textarea-bordered w-full"
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isEscritorioResponse"
                  value="true"
                  className="checkbox checkbox-sm"
                />
                Resposta do escritório
              </label>

              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary btn-sm">
                  <Send size={14} aria-hidden="true" />
                  Adicionar nota
                </button>
              </div>
            </form>
          </div>
        </div>

        <aside className="flex w-full min-w-0 flex-col gap-6">
          <div className="rounded-box bg-base-100 p-4" style={{ border: `1px solid ${hairline}` }}>
            <h3 className="mb-3 font-serif text-lg font-bold">Resumo</h3>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex justify-between">
                <span className="text-base-content/60">Status</span>
                <span className="font-medium">{statusLabels[consultation.status]}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-base-content/60">Número</span>
                <span className="font-medium">{consultation.internalNumber}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-base-content/60">Associado</span>
                <span className="font-medium">{consultation.associate?.name ?? '—'}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-base-content/60">SLA</span>
                <span className="font-medium">{formatDate(consultation.slaDueDate)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-base-content/60">Satisfação</span>
                <span className="font-medium capitalize">
                  {consultation.satisfaction ?? 'Sem resposta'}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-base-content/60">Criado por</span>
                <span className="font-medium">{consultation.createdBy.name}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-base-content/60">Data de criação</span>
                <span className="font-medium">{formatDate(consultation.createdAt)}</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
