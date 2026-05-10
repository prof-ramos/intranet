import { requireAuth } from '@/lib/auth/require-auth';
import { db } from '@/lib/db';
import { activities, associates } from '@/lib/db/schema';
import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm';
import { AlertTriangle, ArrowRight, Calendar, Globe, Mail, Megaphone, Plus } from 'lucide-react';
import Link from 'next/link';

const HAIR = 'rgba(4, 9, 32, 0.05)';

const activityStatusLabels: Record<string, string> = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  aguardando_terceiros: 'Aguardando terceiros',
  concluido: 'Concluído',
};

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

const statusAccents: Record<string, string> = {
  a_fazer: '#94a3b8',
  em_andamento: '#76AEEA',
  aguardando_terceiros: '#e7c16b',
  concluido: '#86efac',
};

const priorityTone: Record<string, string> = {
  urgente: '#b91c1c',
  alta: '#a16207',
  normal: 'rgba(13,31,60,0.70)',
  baixa: 'rgba(13,31,60,0.50)',
};

function formatDueDate(value: string | Date | null) {
  if (!value) return null;
  const normalized = value instanceof Date ? value.toISOString() : value;
  const [date] = normalized.split(/[ T]/);
  const parts = date.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return normalized;
}

async function getDashboardData() {
  const [
    [{ activeAssociates }],
    [{ pendingMigration }],
    [{ contributionsOk }],
    [{ openActivities }],
    [{ overdueActivities }],
    activitiesByStatus,
    topRegions,
    urgentActivities,
    kanbanCards,
  ] = await Promise.all([
    db
      .select({ activeAssociates: count() })
      .from(associates)
      .where(eq(associates.associationStatus, 'ativo')),
    db
      .select({ pendingMigration: count() })
      .from(associates)
      .where(eq(associates.contributionStatus, 'pendente_migracao')),
    db
      .select({ contributionsOk: count() })
      .from(associates)
      .where(
        and(eq(associates.associationStatus, 'ativo'), eq(associates.contributionStatus, 'em_dia')),
      ),
    db
      .select({ openActivities: count() })
      .from(activities)
      .where(ne(activities.status, 'concluido')),
    db
      .select({ overdueActivities: count() })
      .from(activities)
      .where(and(ne(activities.status, 'concluido'), sql`${activities.dueDate} < now()`)),
    db
      .select({ status: activities.status, total: count() })
      .from(activities)
      .groupBy(activities.status),
    db
      .select({ country: associates.locationCountry, total: count() })
      .from(associates)
      .where(eq(associates.associationStatus, 'ativo'))
      .groupBy(associates.locationCountry)
      .orderBy(desc(count()))
      .limit(6),
    db
      .select({
        id: activities.id,
        title: activities.title,
        status: activities.status,
        priority: activities.priority,
        dueDate: activities.dueDate,
      })
      .from(activities)
      .where(and(ne(activities.status, 'concluido'), sql`${activities.dueDate} < now()`))
      .orderBy(activities.dueDate)
      .limit(4),
    db
      .select({
        id: activities.id,
        title: activities.title,
        status: activities.status,
        priority: activities.priority,
        dueDate: activities.dueDate,
        associateName: associates.fullName,
      })
      .from(activities)
      .leftJoin(associates, eq(activities.associateId, associates.id))
      .orderBy(
        asc(activities.status),
        desc(sql`case ${activities.priority}
          when 'urgente' then 4
          when 'alta' then 3
          when 'normal' then 2
          else 1
        end`),
        asc(activities.dueDate),
      )
      .limit(20),
  ]);

  const contributionRate =
    activeAssociates === 0 ? 0 : Math.round((contributionsOk / activeAssociates) * 100);

  return {
    stripe: [
      { value: activeAssociates.toLocaleString('pt-BR'), label: 'associados ativos' },
      { value: String(pendingMigration), label: 'pendentes de migração' },
      { value: String(openActivities), label: 'atividades em aberto' },
      { value: String(overdueActivities), label: 'atrasadas', tone: 'neg' as const },
      { value: `${contributionRate}%`, label: 'contribuições em dia', tone: 'pos' as const },
    ],
    activitiesByStatus,
    topRegions,
    urgentActivities,
    kanbanCards,
  };
}

export default async function DashboardPage() {
  const user = await requireAuth();
  const data = await getDashboardData();

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-base-content/55 text-[11px] tracking-[0.18em] uppercase">
            Sala de operações · {today}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
            Painel da diretoria
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          <Link
            href="/app/atividades"
            className="btn btn-outline border-base-300 min-h-11 bg-white px-4 lg:btn-sm lg:h-10 lg:min-h-10"
          >
            <Calendar size={16} aria-hidden="true" /> Esta semana
          </Link>
          <Link
            href="/app/atividades/nova"
            className="btn btn-primary min-h-11 px-4 lg:btn-sm lg:h-10 lg:min-h-10"
          >
            <Plus size={16} aria-hidden="true" /> Nova atividade
          </Link>
        </div>
      </div>

      <section
        className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="Indicadores"
      >
        {data.stripe.map((s) => (
          <div
            key={s.label}
            className="stat rounded-box bg-base-100 min-h-[104px] px-4 py-3 shadow-none"
            style={{ border: `1px solid ${HAIR}` }}
          >
            <div className="stat-title text-base-content/55 text-[10px] font-bold tracking-[0.08em] uppercase">
              {s.label}
            </div>
            <div className="stat-value text-base-content mt-2 font-serif text-2xl leading-none">
              {s.value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div
          className="rounded-box bg-base-100 min-w-0 p-4 sm:p-5"
          style={{ border: `1px solid ${HAIR}` }}
        >
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-xl font-bold">Atividades em curso</h2>
            <Link
              href="/app/atividades"
              className="text-primary inline-flex items-center gap-1 text-sm font-semibold"
            >
              Abrir kanban <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.entries(activityStatusLabels).map(([status, label]) => {
              const row = data.activitiesByStatus.find((item) => item.status === status);
              const total = row?.total ?? 0;
              const cards = data.kanbanCards
                .filter((activity) => activity.status === status)
                .slice(0, status === 'concluido' ? 2 : 3);

              return (
                <article key={status} className="rounded-box bg-base-200 min-w-0 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: statusAccents[status] }}
                        aria-hidden="true"
                      />
                      <p className="truncate text-[11px] font-bold tracking-[0.06em] uppercase">
                        {label}
                      </p>
                    </div>
                    <span className="text-base-content/55 text-xs font-semibold">{total}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {cards.length === 0 ? (
                      <div className="border-base-300 bg-base-100 text-base-content/45 rounded-[8px] border border-dashed px-3 py-4 text-center text-xs">
                        Sem cards
                      </div>
                    ) : (
                      cards.map((card) => (
                        <div
                          key={card.id}
                          className="bg-base-100 rounded-[8px] p-3 shadow-[0_1px_0_rgba(4,9,32,0.04)]"
                          style={{ border: `1px solid ${HAIR}` }}
                        >
                          <p className="text-sm leading-snug font-semibold [overflow-wrap:anywhere]">
                            {card.title}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span
                              className="text-[10px] font-bold tracking-[0.08em] uppercase"
                              style={{ color: priorityTone[card.priority] ?? priorityTone.normal }}
                            >
                              {priorityLabels[card.priority] ?? card.priority}
                            </span>
                            {formatDueDate(card.dueDate) && (
                              <span className="text-base-content/55 text-[10px]">
                                · vence {formatDueDate(card.dueDate)}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="border-base-300 bg-base-200 text-base-content/70 max-w-full truncate rounded-full border px-2 py-1 text-[10px] font-semibold">
                              {card.associateName ?? 'Sem associado'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="flex w-full min-w-0 flex-col gap-7">
          <div className="rounded-box bg-base-100 p-4" style={{ border: `1px solid ${HAIR}` }}>
            <div className="mb-3 flex items-center gap-2">
              <Megaphone size={20} className="text-primary" aria-hidden="true" />
              <h2 className="font-serif text-lg font-bold">Pendências</h2>
            </div>

            {data.urgentActivities.length === 0 ? (
              <p className="text-base-content/60 text-sm">Nenhuma atividade atrasada.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.urgentActivities.map((activity, index) => (
                  <li
                    key={activity.id}
                    className="grid grid-cols-[24px_1fr] gap-3 pb-3.5"
                    style={{
                      borderBottom:
                        index === data.urgentActivities.length - 1 ? 'none' : `1px solid ${HAIR}`,
                    }}
                  >
                    <AlertTriangle size={20} aria-hidden="true" className="text-error mt-0.5" />
                    <div>
                      <p className="text-sm leading-snug font-semibold">{activity.title}</p>
                      <p className="text-base-content/60 mt-1 text-xs leading-relaxed">
                        {priorityLabels[activity.priority] ?? activity.priority}
                        {formatDueDate(activity.dueDate)
                          ? ` · vencimento ${formatDueDate(activity.dueDate)}`
                          : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-box bg-base-100 p-4" style={{ border: `1px solid ${HAIR}` }}>
            <div className="mb-3 flex items-center gap-2">
              <Mail size={20} className="text-primary" aria-hidden="true" />
              <h2 className="font-serif text-lg font-bold">Comunicação</h2>
            </div>
            <p className="text-sm leading-snug font-semibold">
              12 e-mails de associados sem resposta
            </p>
            <p className="text-base-content/60 mt-1 text-xs leading-relaxed">
              SLA interno: 48h — média de 36h esta semana.
            </p>
          </div>

          <div className="rounded-box bg-base-100 p-4" style={{ border: `1px solid ${HAIR}` }}>
            <div className="mb-3 flex items-center gap-2">
              <Globe size={20} className="text-primary" aria-hidden="true" />
              <h2 className="font-serif text-lg font-bold">Associados por país</h2>
            </div>
            <ul className="flex flex-col gap-3">
              {data.topRegions.map((region) => {
                const max = Math.max(...data.topRegions.map((item) => item.total), 1);
                const pct = Math.round((region.total / max) * 100);

                return (
                  <li key={region.country ?? 'sem-pais'}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium">
                        {region.country ?? 'Não informado'}
                      </p>
                      <p className="font-serif text-sm font-bold">{region.total}</p>
                    </div>
                    <div className="bg-base-200 h-1 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-base-content/55 text-[11px]">
            Olá, {user.name.split(' ')[0]}. Logado como{' '}
            <span className="capitalize">{user.role}</span>.
          </p>
        </aside>
      </section>
    </main>
  );
}
