import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { buildJuridicoStatusSummary } from '@/lib/juridico/dashboard';
import {
  countConsultationsByStatus,
  countConsultationsStale,
  countConsultationsSlaDueSoon,
  countConsultationsRespondedThisMonth,
  getPendingActions,
} from '@/lib/juridico/queries';
import {
  LEGAL_CONSULTATION_STATUS_LABELS,
  type LegalConsultationStatus,
} from '@/lib/juridico/status';
import { AlertTriangle, Clock, FileQuestion, MessageSquare, Plus, Scale } from 'lucide-react';
import { type CSSProperties } from 'react';
import { checkAndEmitSlaWarnings } from '@/lib/juridico/sla-notifications';
import {
  hairline,
  navy,
  primaryContainerHover,
  buttonOutlineBorder,
  buttonOutlineHoverBg,
  textMuted,
  error,
  warning,
  info,
  success,
  textPrimary,
  textSecondary,
  focusRingClass,
} from '@/lib/ui/tokens';

const statusIcons: Record<LegalConsultationStatus, React.ReactNode> = {
  aberta: <FileQuestion size={20} />,
  aguardando_escritorio: <Clock size={20} />,
  respondida: <MessageSquare size={20} />,
  arquivada: <Scale size={20} />,
};

export default async function JuridicoDashboardPage() {
  await requireAuth();
  await checkAndEmitSlaWarnings();

  const [
    abertas,
    aguardandoEscritorio,
    respondidasTotal,
    arquivadas,
    semAtualizacao,
    slaVencendo,
    respondidasMes,
    pendingActions,
  ] = await Promise.all([
    countConsultationsByStatus('aberta'),
    countConsultationsByStatus('aguardando_escritorio'),
    countConsultationsByStatus('respondida'),
    countConsultationsByStatus('arquivada'),
    countConsultationsStale(7),
    countConsultationsSlaDueSoon(),
    countConsultationsRespondedThisMonth(),
    getPendingActions(),
  ]);

  const statusSummary = buildJuridicoStatusSummary({
    aberta: abertas,
    aguardando_escritorio: aguardandoEscritorio,
    respondida: respondidasTotal,
    arquivada: arquivadas,
  });

  const cards = [
    { label: 'Consultas abertas', value: abertas, tone: 'neutral' as const },
    { label: 'Aguardando escritório', value: aguardandoEscritorio, tone: 'warn' as const },
    { label: 'Sem atualização > 7 dias', value: semAtualizacao, tone: 'neg' as const },
    { label: 'SLA vencendo', value: slaVencendo, tone: 'neg' as const },
    { label: 'Respondidas este mês', value: respondidasMes, tone: 'pos' as const },
  ];

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textMuted }}>
            Área institucional
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
            Jurídico
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          <Link
            href="/app/juridico/consultas"
            className={`inline-flex h-10 items-center gap-2 rounded-[8px] border bg-white px-4 text-sm font-semibold hover:bg-[var(--button-outline-hover)] ${focusRingClass}`}
            style={
              {
                color: navy,
                borderColor: buttonOutlineBorder,
                '--button-outline-hover': buttonOutlineHoverBg,
              } as CSSProperties
            }
          >
            <Scale size={16} aria-hidden="true" /> Ver consultas
          </Link>
          <Link
            href="/app/juridico/consultas/nova"
            className={`inline-flex h-10 items-center gap-2 rounded-[8px] px-5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] ${focusRingClass}`}
            style={
              {
                backgroundColor: navy,
                '--primary-hover': primaryContainerHover,
              } as CSSProperties
            }
          >
            <Plus size={16} aria-hidden="true" /> Nova consulta
          </Link>
        </div>
      </div>

      <section
        className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="Indicadores"
      >
        {cards.map((c) => (
          <div
            key={c.label}
            className="min-h-[104px] rounded-[16px] bg-white px-4 py-3"
            style={{ border: `1px solid ${hairline}` }}
          >
            <div
              className="text-[10px] font-bold tracking-[0.08em] uppercase"
              style={{ color: textMuted }}
            >
              {c.label}
            </div>
            <div
              className="mt-2 font-sans text-2xl leading-none"
              style={{
                color:
                  c.tone === 'neg'
                    ? error
                    : c.tone === 'pos'
                      ? success
                      : c.tone === 'warn'
                        ? warning
                        : textPrimary,
              }}
            >
              {c.value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className="min-w-0 rounded-[16px] bg-white p-4 sm:p-5"
          style={{ border: `1px solid ${hairline}` }}
        >
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-xl font-bold">Ações pendentes</h2>
            <Link
              href="/app/juridico/consultas"
              className={`inline-flex items-center gap-1 text-sm font-semibold hover:text-[var(--primary-hover)] ${focusRingClass}`}
              style={{ color: navy, '--primary-hover': primaryContainerHover } as CSSProperties}
            >
              Ver todas
            </Link>
          </div>

          {pendingActions.length === 0 ? (
            <p className="text-sm" style={{ color: textMuted }}>
              Nenhuma ação pendente.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {pendingActions.map((action, index) => (
                <li
                  key={`${action.type}-${action.id}`}
                  className="grid grid-cols-[24px_1fr] gap-3 pb-3.5"
                  style={{
                    borderBottom:
                      index === pendingActions.length - 1 ? 'none' : `1px solid ${hairline}`,
                  }}
                >
                  <AlertTriangle
                    size={20}
                    aria-hidden="true"
                    className="mt-0.5"
                    style={{
                      color:
                        action.type === 'sla_vencendo'
                          ? error
                          : action.type === 'sem_atualizacao'
                            ? warning
                            : info,
                    }}
                  />
                  <div>
                    <Link
                      href={`/app/juridico/consultas/${action.id}`}
                      className={`text-sm leading-snug font-semibold hover:text-[var(--primary-hover)] ${focusRingClass}`}
                      style={{ '--primary-hover': primaryContainerHover } as CSSProperties}
                    >
                      {action.internalNumber} — {action.title}
                    </Link>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: textMuted }}>
                      {action.type === 'sla_vencendo'
                        ? 'SLA vencendo em breve'
                        : action.type === 'sem_atualizacao'
                          ? `Sem atualização há ${action.days} dias`
                          : 'Aguardando resposta do escritório'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="flex w-full min-w-0 flex-col gap-7">
          <div className="rounded-[16px] bg-white p-4" style={{ border: `1px solid ${hairline}` }}>
            <h2 className="mb-3 font-serif text-lg font-bold">Status das consultas</h2>
            <ul className="flex flex-col gap-3">
              {Object.entries(LEGAL_CONSULTATION_STATUS_LABELS).map(([status, label]) => {
                return (
                  <li key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ color: textSecondary }}>
                        {statusIcons[status as LegalConsultationStatus]}
                      </span>
                      <p className="text-sm font-medium">{label}</p>
                    </div>
                    <span className="font-sans text-sm font-bold">
                      {statusSummary[status as LegalConsultationStatus]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
