import {
  countActiveAssociates,
  countPendingMigrationAssociates,
  countContributionsOkAssociates,
  countOpenActivities,
  countOverdueActivities,
  getActivitiesByStatus,
  getTopRegions,
  getUrgentActivities,
  getKanbanCards,
  type KanbanCard,
} from '@/lib/dashboard/queries';
import { statusStyles } from '@/lib/ui/tokens';

export interface DashboardStripeItem {
  id: string;
  value: string;
  label: string;
  tone?: 'neg' | 'pos';
}

export interface DashboardStatusColumnCard {
  id: number;
  title: string;
  priority: string;
  dueDate: string | null;
  associateLabel: string | null;
}

export interface DashboardStatusColumn {
  status: string;
  label: string;
  accent: string;
  total: number;
  cards: DashboardStatusColumnCard[];
}

export interface DashboardTopRegion {
  country: string | null;
  total: number;
  pct: number;
}

export interface DashboardUrgentActivity {
  id: number;
  title: string;
  priority: string;
  dueDate: string | null;
}

export interface DashboardViewModel {
  stripe: DashboardStripeItem[];
  statusColumns: DashboardStatusColumn[];
  topRegions: DashboardTopRegion[];
  urgentActivities: DashboardUrgentActivity[];
}

export function formatDashboardDueDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const normalized = value instanceof Date ? value.toISOString() : value;
  const [date] = normalized.split(/[ T]/);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  return isValid ? `${dayText}/${monthText}` : null;
}

export async function getDashboardViewModel(): Promise<DashboardViewModel> {
  const [
    activeAssociates,
    pendingMigration,
    contributionsOk,
    openActivities,
    overdueActivities,
    activitiesByStatus,
    topRegions,
    urgentActivities,
    kanbanCards,
  ] = await Promise.all([
    countActiveAssociates(),
    countPendingMigrationAssociates(),
    countContributionsOkAssociates(),
    countOpenActivities(),
    countOverdueActivities(),
    getActivitiesByStatus(),
    getTopRegions(),
    getUrgentActivities(),
    getKanbanCards(),
  ]);

  const contributionRate =
    activeAssociates === 0 ? 0 : Math.round((contributionsOk / activeAssociates) * 100);
  const maxRegionTotal = Math.max(...topRegions.map((item) => item.total), 1);
  const cardsByStatus = kanbanCards.reduce<Record<string, DashboardStatusColumnCard[]>>(
    (acc, card) => {
      acc[card.status] ??= [];
      acc[card.status].push(toDashboardStatusColumnCard(card));
      return acc;
    },
    {},
  );

  const statusColumns = Object.entries(statusStyles).map(([status, style]) => {
    const row = activitiesByStatus.find((item) => item.status === status);
    return {
      status,
      label: style.label,
      accent: style.accent,
      total: row?.total ?? 0,
      cards: (cardsByStatus[status] ?? []).slice(0, status === 'concluido' ? 2 : 3),
    };
  });

  return {
    stripe: [
      {
        id: 'active-associates',
        value: activeAssociates.toLocaleString('pt-BR'),
        label: 'associados ativos',
      },
      { id: 'pending-migration', value: String(pendingMigration), label: 'pendentes de migração' },
      { id: 'open-activities', value: String(openActivities), label: 'atividades em aberto' },
      {
        id: 'overdue-activities',
        value: String(overdueActivities),
        label: 'atrasadas',
        tone: 'neg',
      },
      {
        id: 'contribution-rate',
        value: `${contributionRate}%`,
        label: 'contribuições em dia',
        tone: 'pos',
      },
    ],
    statusColumns,
    topRegions: topRegions.map((region) => ({
      country: region.country,
      total: region.total,
      pct: Math.round((region.total / maxRegionTotal) * 100),
    })),
    urgentActivities: urgentActivities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      priority: activity.priority,
      dueDate: activity.dueDate,
    })),
  };
}

function toDashboardStatusColumnCard(card: KanbanCard): DashboardStatusColumnCard {
  return {
    id: card.id,
    title: card.title,
    priority: card.priority,
    dueDate: card.dueDate,
    associateLabel: card.associateName ? initialsFromName(card.associateName) : null,
  };
}

function initialsFromName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
