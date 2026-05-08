import { requireAuth } from '@/lib/auth/require-auth';
import { db } from '@/lib/db';
import { activities, associates } from '@/lib/db/schema';
import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Globe,
  Mail,
  Megaphone,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

const HAIR = 'rgba(4, 9, 32, 0.10)';

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

function formatDueDate(value: string | null) {
  if (!value) return null;
  const [date] = value.split(' ');
  const parts = date.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return value;
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
      .where(and(
        eq(associates.associationStatus, 'ativo'),
        eq(associates.contributionStatus, 'em_dia'),
      )),
    db
      .select({ openActivities: count() })
      .from(activities)
      .where(ne(activities.status, 'concluido')),
    db
      .select({ overdueActivities: count() })
      .from(activities)
      .where(and(ne(activities.status, 'concluido'), sql`date(${activities.dueDate}) < date('now')`)),
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
      .where(
        and(
          ne(activities.status, 'concluido'),
          sql`date(${activities.dueDate}) < date('now')`,
        ),
      )
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

  const contributionRate = activeAssociates === 0
    ? 0
    : Math.round((contributionsOk / activeAssociates) * 100);

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
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-base-content/55">
            Sala de operações · {today}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold leading-none md:text-5xl">
            Painel da diretoria
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/atividades" className="btn btn-outline btn-sm h-10 border-base-300 bg-white">
            <Calendar size={16} aria-hidden="true" /> Esta semana
          </Link>
          <Link href="/app/atividades/nova" className="btn btn-primary btn-sm h-10">
            <Plus size={16} aria-hidden="true" /> Nova atividade
          </Link>
        </div>
      </div>

      <section
        className="mb-7 grid overflow-hidden rounded-box bg-base-100 sm:grid-cols-2 xl:grid-cols-5"
        style={{ border: `1px solid ${HAIR}` }}
        aria-label="Indicadores"
      >
        {data.stripe.map((s, i) => (
          <div
            key={s.label}
            className="flex items-baseline gap-3 px-5 py-4"
            style={{ borderLeft: i === 0 ? 'none' : `1px solid ${HAIR}` }}
          >
            <span
              className="font-serif text-3xl font-bold leading-none"
              style={{ color: s.tone === 'neg' ? '#b91c1c' : s.tone === 'pos' ? '#15803d' : undefined }}
            >
              {s.value}
            </span>
            <span className="text-xs lowercase text-base-content/65">{s.label}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col items-start gap-6 xl:flex-row">
        <div className="min-w-0 flex-1 rounded-box bg-base-100 p-5" style={{ border: `1px solid ${HAIR}` }}>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-bold">Atividades em curso</h2>
            <Link href="/app/atividades" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Abrir kanban <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {Object.entries(activityStatusLabels).map(([status, label]) => {
              const row = data.activitiesByStatus.find((item) => item.status === status);
              const total = row?.total ?? 0;
              const cards = data.kanbanCards
                .filter((activity) => activity.status === status)
                .slice(0, status === 'concluido' ? 2 : 3);

              return (
                <article key={status} className="min-w-0 rounded-box bg-base-200 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: statusAccents[status] }}
                        aria-hidden="true"
                      />
                      <p className="truncate text-[11px] font-bold uppercase tracking-[0.06em]">
                        {label}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-base-content/55">{total}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {cards.length === 0 ? (
                      <div
                        className="rounded-[10px] border border-dashed border-base-300 bg-base-100 px-3 py-5 text-center text-xs text-base-content/45"
                      >
                        Sem cards
                      </div>
                    ) : cards.map((card) => (
                      <div
                        key={card.id}
                        className="rounded-[10px] bg-base-100 p-3 shadow-[0_1px_0_rgba(4,9,32,0.04)]"
                        style={{ border: `1px solid ${HAIR}` }}
                      >
                        <p className="[overflow-wrap:anywhere] text-sm font-semibold leading-snug">
                          {card.title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className="text-[10px] font-bold uppercase tracking-[0.08em]"
                            style={{ color: priorityTone[card.priority] ?? priorityTone.normal }}
                          >
                            {priorityLabels[card.priority] ?? card.priority}
                          </span>
                          {formatDueDate(card.dueDate) && (
                            <span className="text-[10px] text-base-content/55">
                              · vence {formatDueDate(card.dueDate)}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span
                            className="max-w-full truncate rounded-full border border-base-300 bg-base-200 px-2 py-1 text-[10px] font-semibold text-base-content/70"
                          >
                            {card.associateName ?? 'Sem associado'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 xl:w-[300px]">
          <div className="rounded-box bg-base-100 p-5" style={{ border: `1px solid ${HAIR}` }}>
            <div className="mb-3 flex items-center gap-2">
              <Megaphone size={20} className="text-primary" aria-hidden="true" />
              <h2 className="font-serif text-lg font-bold">Pendências</h2>
            </div>

            {data.urgentActivities.length === 0 ? (
              <p className="text-sm text-base-content/60">Nenhuma atividade atrasada.</p>
            ) : (
              <ul className="flex flex-col gap-3.5">
                {data.urgentActivities.map((activity, index) => (
                  <li
                    key={activity.id}
                    className="grid grid-cols-[24px_1fr] gap-3 pb-3.5"
                    style={{
                      borderBottom: index === data.urgentActivities.length - 1 ? 'none' : `1px solid ${HAIR}`,
                    }}
                  >
                    <AlertTriangle size={20} aria-hidden="true" className="mt-0.5 text-error" />
                    <div>
                      <p className="text-sm font-semibold leading-snug">{activity.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-base-content/60">
                        {priorityLabels[activity.priority] ?? activity.priority}
                        {activity.dueDate ? ` · vencimento ${activity.dueDate}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-box bg-base-100 p-5" style={{ border: `1px solid ${HAIR}` }}>
            <div className="mb-3 flex items-center gap-2">
              <Mail size={20} className="text-primary" aria-hidden="true" />
              <h2 className="font-serif text-lg font-bold">Comunicação</h2>
            </div>
            <p className="text-sm font-semibold leading-snug">
              12 e-mails de associados sem resposta
            </p>
            <p className="mt-1 text-xs leading-relaxed text-base-content/60">
              SLA interno: 48h — média de 36h esta semana.
            </p>
          </div>

          <div className="rounded-box bg-base-100 p-5" style={{ border: `1px solid ${HAIR}` }}>
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
                    <p className="truncate text-sm font-medium">{region.country ?? 'Não informado'}</p>
                    <p className="font-serif text-sm font-bold">{region.total}</p>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-base-200">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
              })}
            </ul>
          </div>

          <p className="text-[11px] text-base-content/55">
            Olá, {user.name.split(' ')[0]}. Logado como{' '}
            <span className="capitalize">{user.role}</span>.
          </p>
        </aside>
      </section>
    </main>
  );
}
