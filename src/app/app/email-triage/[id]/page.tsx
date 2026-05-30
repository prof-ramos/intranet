import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/require-auth';
import { getTriageById } from '@/lib/email-triage/repository';
import {
  getStatusLabel,
  getStatusBadgeClass,
  getCategoriaLabel,
  getCategoriaBadgeClass,
  getRiscoLabel,
  getRiscoBadgeClass,
  EMAIL_TRIAGE_STATUS_FILTER_OPTIONS,
} from '@/lib/email-triage/status';
import {
  updateTriageStatusFromForm,
  addTriageObservacaoFromForm,
  updateTriageDeadlineFromForm,
} from '@/app/app/email-triage/actions';
import { formatDate, daysSince } from '@/lib/utils/date';
import {
  ArrowLeft,
  Clock,
  FileText,
  Mail,
  Send,
  Shield,
  User,
} from 'lucide-react';
import { hairline, focusRingClass } from '@/lib/ui/tokens';
import { parsePositiveIntParam } from '@/lib/routing/params';
import { StatusUpdater } from './StatusUpdater';
import { DeadlineEditor } from './DeadlineEditor';

export default async function TriageDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const triageId = parsePositiveIntParam(id);

  if (triageId == null) notFound();

  const triage = await getTriageById(triageId);
  if (!triage) notFound();

  const overdueDays =
    triage.status === 'vencido' && triage.prazoData
      ? daysSince(triage.prazoData)
      : null;

  return (
    <main className="mx-auto w-full max-w-[1380px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/email-triage"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[11px] tracking-[0.18em] text-[rgba(13,31,60,0.55)] uppercase">
              Triagem de E-mails
            </p>
            <h1 className="mt-1 max-w-lg truncate font-serif text-2xl font-bold">
              {triage.subject}
            </h1>
          </div>
        </div>

        <form action={updateTriageStatusFromForm} className="flex items-center gap-2">
          <input type="hidden" name="id" value={triageId} />
          <StatusUpdater defaultValue={triage.status}>
            {EMAIL_TRIAGE_STATUS_FILTER_OPTIONS.filter((o) => o.value !== '').map((s) => (
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
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(triage.status)}`}
              >
                {getStatusLabel(triage.status)}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoriaBadgeClass(triage.categoria)}`}
              >
                {getCategoriaLabel(triage.categoria)}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRiscoBadgeClass(triage.nivelRisco)}`}
              >
                Risco {getRiscoLabel(triage.nivelRisco)}
              </span>
              {overdueDays !== null && overdueDays > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  Vencido há {overdueDays} dia{overdueDays > 1 ? 's' : ''}
                </span>
              )}
              {triage.exigeValidacaoHumana && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Exige validação humana
                </span>
              )}
            </div>

            <h2 className="mb-2 font-serif text-lg font-bold">{triage.subject}</h2>
            <p className="mb-4 text-sm leading-relaxed whitespace-pre-wrap text-[rgba(13,31,60,0.70)]">
              {triage.resumo}
            </p>

            <div className="mb-4 rounded-lg bg-[#f8fafc] p-3">
              <p className="text-xs font-semibold text-[rgba(13,31,60,0.55)] uppercase tracking-wide mb-1">
                Ação recomendada
              </p>
              <p className="text-sm leading-relaxed">{triage.acaoRecomendada}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-[rgba(13,31,60,0.60)]">
                <Mail size={14} />
                <span>Remetente: {triage.sender}</span>
              </div>
              <div className="flex items-center gap-2 text-[rgba(13,31,60,0.60)]">
                <User size={14} />
                <span>Destinatário: {triage.originalRecipient ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-[rgba(13,31,60,0.60)]">
                <Clock size={14} />
                <span>Recebido: {formatDate(triage.receivedAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-[rgba(13,31,60,0.60)]">
                <Shield size={14} />
                <span>Confiança: {triage.confianca}</span>
              </div>
            </div>
          </div>

          {triage.haPrazo && (
            <div
              className="rounded-[16px] bg-white p-5"
              style={{ border: `1px solid ${hairline}` }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold">Prazo</h3>
                <form action={updateTriageDeadlineFromForm} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={triageId} />
                  <DeadlineEditor
                    currentData={triage.prazoData}
                    currentHora={triage.prazoHora}
                  />
                </form>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-[11px] tracking-[0.08em] text-[rgba(13,31,60,0.55)] uppercase">
                    Data
                  </p>
                  <p className="mt-0.5 font-medium">{formatDate(triage.prazoData)}</p>
                </div>
                <div>
                  <p className="text-[11px] tracking-[0.08em] text-[rgba(13,31,60,0.55)] uppercase">
                    Hora
                  </p>
                  <p className="mt-0.5 font-medium">{triage.prazoHora ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] tracking-[0.08em] text-[rgba(13,31,60,0.55)] uppercase">
                    Tipo
                  </p>
                  <p className="mt-0.5 font-medium capitalize">{triage.tipoPrazo ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] tracking-[0.08em] text-[rgba(13,31,60,0.55)] uppercase">
                    Atraso
                  </p>
                  <p className={`mt-0.5 font-medium ${overdueDays ? 'text-[#b91c1c]' : ''}`}>
                    {overdueDays !== null && overdueDays > 0
                      ? `${overdueDays} dia${overdueDays > 1 ? 's' : ''}`
                      : '—'}
                  </p>
                </div>
              </div>
              {triage.trechoFonteDoPrazo && (
                <div className="mt-3 rounded-lg bg-[#f8fafc] p-3">
                  <p className="text-xs font-semibold text-[rgba(13,31,60,0.55)] uppercase tracking-wide mb-1">
                    Trecho fonte do prazo
                  </p>
                  <p className="text-sm italic leading-relaxed">{triage.trechoFonteDoPrazo}</p>
                </div>
              )}
            </div>
          )}

          {triage.sourceEvidence.length > 0 && (
            <div
              className="rounded-[16px] bg-white p-5"
              style={{ border: `1px solid ${hairline}` }}
            >
              <h3 className="mb-4 font-serif text-lg font-bold">Evidências</h3>
              <ul className="flex flex-col gap-3">
                {triage.sourceEvidence.map((ev, i) => (
                  <li key={i} className="rounded-lg bg-[#f8fafc] p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {ev.tipo}
                      </span>
                      <span className="text-xs text-[rgba(13,31,60,0.40)]">{ev.referencia}</span>
                    </div>
                    <p className="text-sm italic leading-relaxed">{ev.trecho}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {triage.resumoAnexos.length > 0 && (
            <div
              className="rounded-[16px] bg-white p-5"
              style={{ border: `1px solid ${hairline}` }}
            >
              <h3 className="mb-4 font-serif text-lg font-bold">Anexos</h3>
              <ul className="flex flex-col gap-3">
                {triage.resumoAnexos.map((att, i) => (
                  <li key={i} className="rounded-lg bg-[#f8fafc] p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <FileText size={14} className="text-[rgba(13,31,60,0.40)]" />
                      <span className="text-sm font-semibold">{att.filename}</span>
                      {att.mime_type && (
                        <span className="text-xs text-[rgba(13,31,60,0.40)]">{att.mime_type}</span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{att.resumo}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-[16px] bg-white p-5" style={{ border: `1px solid ${hairline}` }}>
            <h3 className="mb-4 font-serif text-lg font-bold">Corpo do e-mail</h3>
            <div className="rounded-lg bg-[#f8fafc] p-3">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {triage.bodyExcerpt}
              </p>
            </div>
          </div>

          {triage.observacoesValidacao && (
            <div
              className="rounded-[16px] bg-white p-5"
              style={{ border: `1px solid ${hairline}` }}
            >
              <h3 className="mb-4 font-serif text-lg font-bold">Observações de validação</h3>
              <div className="rounded-lg bg-[#f8fafc] p-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {triage.observacoesValidacao}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-[16px] bg-white p-5" style={{ border: `1px solid ${hairline}` }}>
            <h3 className="mb-4 font-serif text-lg font-bold">Adicionar observação</h3>
            <form action={addTriageObservacaoFromForm} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={triageId} />
              <textarea
                name="observacoes"
                rows={3}
                required
                placeholder="Descreva a observação sobre esta triagem..."
                className={`w-full rounded-[8px] border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#0d1f3c] placeholder:text-[rgba(13,31,60,0.40)] ${focusRingClass}`}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className={`inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#040920] px-4 text-sm font-semibold text-white hover:bg-[#0d3260] ${focusRingClass}`}
                >
                  <Send size={14} aria-hidden="true" />
                  Adicionar observação
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
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(triage.status)}`}
                >
                  {getStatusLabel(triage.status)}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Categoria</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getCategoriaBadgeClass(triage.categoria)}`}
                >
                  {getCategoriaLabel(triage.categoria)}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Risco</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRiscoBadgeClass(triage.nivelRisco)}`}
                >
                  {getRiscoLabel(triage.nivelRisco)}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Confiança</span>
                <span className="font-medium capitalize">{triage.confianca}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Responsável sugerido</span>
                <span className="font-medium capitalize">{triage.responsavelSugerido ?? '—'}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Base legal</span>
                <span className="font-medium text-right max-w-[180px] truncate">
                  {triage.legalBasis.replace(/_/g, ' ')}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Modelo</span>
                <span className="font-medium">{triage.modelName ?? '—'}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[rgba(13,31,60,0.60)]">Versão</span>
                <span className="font-medium">{triage.processingVersion}</span>
              </li>
            </ul>
          </div>

          {triage.usuarioValidador && (
            <div
              className="rounded-[16px] bg-white p-4"
              style={{ border: `1px solid ${hairline}` }}
            >
              <h3 className="mb-3 font-serif text-lg font-bold">Validação</h3>
              <ul className="flex flex-col gap-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-[rgba(13,31,60,0.60)]">Validado por</span>
                  <span className="font-medium">{triage.usuarioValidador.name}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[rgba(13,31,60,0.60)]">Data</span>
                  <span className="font-medium">{formatDate(triage.validatedAt)}</span>
                </li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
