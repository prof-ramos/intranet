import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import {
  countConsultationsByStatus,
  countConsultationsStale,
  countConsultationsSlaOverdue,
  countConsultationsRespondedThisMonth,
  getPendingActions,
} from '@/lib/juridico/queries';
import { AlertTriangle, Clock, FileQuestion, MessageSquare, Plus, Scale } from 'lucide-react';
import { hairline } from '@/lib/ui/tokens';

const statusLabels: Record<string, string> = {
  aberta: 'Aberta',
  aguardando_escritorio: 'Aguardando escritório',
  respondida: 'Respondida',
  arquivada: 'Arquivada',
};

const statusIcons: Record<string, React.ReactNode> = {
  aberta: <FileQuestion size={20} />,
  aguardando_escritorio: <Clock size={20} />,
  respondida: <MessageSquare size={20} />,
  arquivada: <Scale size={20} />,
};

export default async function JuridicoDashboardPage() {
  await requireAuth();

  const [
    abertas,
    aguardandoEscritorio,
    semAtualizacao,
    slaVencendo,
    respondidasMes,
    pendingActions,
  ] = await Promise.all([
    countConsultationsByStatus('aberta'),
    countConsultationsByStatus('aguardando_escritorio'),
    countConsultationsStale(7),
    countConsultationsSlaOverdue(),
    countConsultationsRespondedThisMonth(),
    getPendingActions(),
  ]);

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
          <p className="text-[11px] uppercase tracking-[0.18em] text-base-content/55">
            Área institucional
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
            Jurídico
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          <Link
            href="/app/juridico/consultas"
            className="btn btn-outline border-base-300 min-h-11 bg-white px-4 lg:btn-sm lg:h-10 lg:min-h-10"
          >
            <Scale size={16} aria-hidden="true" /> Ver consultas
          </Link>
          <Link
            href="/app/juridico/consultas/nova"
            className="btn btn-primary min-h-11 px-4 lg:btn-sm lg:h-10 lg:min-h-10"
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
            className="stat rounded-box bg-base-100 min-h-[104px] px-4 py-3 shadow-none"
            style={{ border: `1px solid ${hairline}` }}
          >
            <div className="stat-title text-[10px] font-bold tracking-[0.08em] uppercase text-base-content/55">
              {c.label}
            </div>
            <div
              className={`stat-value mt-2 font-serif text-2xl leading-none ${
                c.tone === 'neg'
                  ? 'text-error'
                  : c.tone === 'pos'
                    ? 'text-success'
                    : c.tone === 'warn'
                      ? 'text-warning'
                      : 'text-base-content'
              }`}
            >
              {c.value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className="rounded-box bg-base-100 min-w-0 p-4 sm:p-5"
          style={{ border: `1px solid ${hairline}` }}
        >
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-xl font-bold">Ações pendentes</h2>
            <Link
              href="/app/juridico/consultas"
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold"
            >
              Ver todas
            </Link>
          </div>

          {pendingActions.length === 0 ? (
            <p className="text-base-content/60 text-sm">Nenhuma ação pendente.</p>
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
                    className={
                      action.type === 'sla_vencendo'
                        ? 'text-error mt-0.5'
                        : action.type === 'sem_atualizacao'
                          ? 'text-warning mt-0.5'
                          : 'text-info mt-0.5'
                    }
                  />
                  <div>
                    <Link
                      href={`/app/juridico/consultas/${action.id}`}
                      className="text-sm leading-snug font-semibold hover:text-primary"
                    >
                      {action.internalNumber} — {action.title}
                    </Link>
                    <p className="mt-1 text-xs leading-relaxed text-base-content/60">
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
          <div className="rounded-box bg-base-100 p-4" style={{ border: `1px solid ${hairline}` }}>
            <h2 className="mb-3 font-serif text-lg font-bold">Status das consultas</h2>
            <ul className="flex flex-col gap-3">
              {Object.entries(statusLabels).map(([status, label]) => {
                const countValue =
                  status === 'aberta'
                    ? abertas
                    : status === 'aguardando_escritorio'
                      ? aguardandoEscritorio
                      : status === 'respondida'
                        ? respondidasMes
                        : 0;
                return (
                  <li key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base-content/70">{statusIcons[status]}</span>
                      <p className="text-sm font-medium">{label}</p>
                    </div>
                    <span className="font-serif text-sm font-bold">{countValue}</span>
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
