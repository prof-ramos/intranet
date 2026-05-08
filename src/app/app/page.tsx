import { requireAuth } from '@/lib/auth/require-auth';
import { db } from '@/lib/db';
import { activities, associates } from '@/lib/db/schema';
import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Globe,
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
      .where(eq(associates.contributionStatus, 'em_dia')),
    db
      .select({ openActivities: count() })
      .from(activities)
      .where(ne(activities.status, 'concluido')),
    db
      .select({ overdueActivities: count() })
      .from(activities)
      .where(and(ne(activities.status, 'concluido'), sql`${activities.dueDate} < datetime('now')`)),
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
        priority: activities.priority,
        dueDate: activities.dueDate,
      })
      .from(activities)
      .where(
        and(
          ne(activities.status, 'concluido'),
          sql`${activities.dueDate} < datetime('now')`,
        ),
      )
      .orderBy(activities.dueDate)
      .limit(4),
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
        <Link href="/app/atividades/nova" className="btn btn-primary btn-sm h-10">
          <Plus size={16} aria-hidden="true" /> Nova atividade
        </Link>
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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-box bg-base-100 p-5" style={{ border: `1px solid ${HAIR}` }}>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-bold">Atividades por status</h2>
            <Link href="/app/atividades" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Abrir atividades <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(activityStatusLabels).map(([status, label]) => {
              const row = data.activitiesByStatus.find((item) => item.status === status);
              const total = row?.total ?? 0;

              return (
                <article key={status} className="rounded-box bg-base-200 p-4">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
                    {status === 'concluido'
                      ? <CheckCircle2 size={18} className="text-success" aria-hidden="true" />
                      : <Clock size={18} className="text-primary" aria-hidden="true" />}
                  </div>
                  <p className="font-serif text-4xl font-bold leading-none">{total}</p>
                  <p className="mt-2 text-sm text-base-content/60">
                    {total === 1 ? 'registro' : 'registros'}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col gap-5">
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
              <Globe size={20} className="text-primary" aria-hidden="true" />
              <h2 className="font-serif text-lg font-bold">Associados por país</h2>
            </div>
            <ul className="flex flex-col gap-3">
              {data.topRegions.map((region) => (
                <li key={region.country ?? 'sem-pais'}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">{region.country ?? 'Não informado'}</p>
                    <p className="font-serif text-sm font-bold">{region.total}</p>
                  </div>
                </li>
              ))}
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
