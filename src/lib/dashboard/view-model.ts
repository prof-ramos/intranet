import {
  countActiveAssociates,
  countActiveAssociatesByLocation,
  countContributionsOkAssociates,
  countInadimplentesAssociates,
  countOpenActivities,
  countOverdueActivities,
  getActivitiesByStatus,
  getBirthdaysThisMonth,
  getTopRegions,
  getUrgentActivities,
  getKanbanCards,
  type BirthdayItem,
  type KanbanCard,
} from '@/lib/dashboard/queries';

export type { BirthdayItem };
import { initialsFromName } from '@/lib/utils/initials';
import { toPortugueseTitleCase } from '@/lib/utils/portuguese-title-case';
import { statusStyles } from '@/lib/ui/tokens';

export interface DashboardStripeItem {
  id: string;
  value: string;
  label: string;
  href: string;
  tone?: 'neg' | 'pos';
  segments?: {
    id: string;
    value: string;
    label: string;
    href: string;
  }[];
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
  assigneeName: string | null;
}

export interface DashboardViewModel {
  stripe: DashboardStripeItem[];
  statusColumns: DashboardStatusColumn[];
  topRegions: DashboardTopRegion[];
  urgentActivities: DashboardUrgentActivity[];
  birthdaysThisMonth: BirthdayItem[];
  inadimplentesCount: number;
}

export { formatShortDate as formatDashboardDueDate } from '@/lib/utils/date';

export async function getDashboardViewModel(): Promise<DashboardViewModel> {
  const [
    activeAssociates,
    activeAssociatesByLocation,
    contributionsOk,
    inadimplentesCount,
    openActivities,
    overdueActivities,
    activitiesByStatus,
    topRegions,
    urgentActivities,
    kanbanCards,
    birthdaysThisMonth,
  ] = await Promise.all([
    countActiveAssociates(),
    countActiveAssociatesByLocation(),
    countContributionsOkAssociates(),
    countInadimplentesAssociates(),
    countOpenActivities(),
    countOverdueActivities(),
    getActivitiesByStatus(),
    getTopRegions(),
    getUrgentActivities(),
    getKanbanCards(),
    getBirthdaysThisMonth(),
  ]);

  const contributionRate =
    activeAssociates === 0 ? 0 : Math.round((contributionsOk / activeAssociates) * 100);
  // Percentage relative to total active associates (not relative to top country)
  const regionDenominator = activeAssociates || 1;
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
        href: '/app/associados?associationStatus=associado',
      },
      {
        id: 'associates-location',
        value: '',
        label: 'distribuição de associados',
        href: '/app/associados?associationStatus=associado',
        segments: [
          {
            id: 'associates-brasil',
            value: activeAssociatesByLocation.brasil.toLocaleString('pt-BR'),
            label: 'associados brasil',
            href: '/app/associados?associationStatus=associado&location=brasil',
          },
          {
            id: 'associates-exterior',
            value: activeAssociatesByLocation.exterior.toLocaleString('pt-BR'),
            label: 'associados exterior',
            href: '/app/associados?associationStatus=associado&location=exterior',
          },
        ],
      },
      {
        id: 'open-activities',
        value: String(openActivities),
        label: 'atividades em aberto',
        href: '/app/atividades?openOnly=1',
      },
      {
        id: 'overdue-activities',
        value: String(overdueActivities),
        label: 'atrasadas',
        href: '/app/atividades?dueLate=1',
        tone: 'neg',
      },
      {
        id: 'contribution-rate',
        value: `${contributionRate}%`,
        label: 'contribuições em dia',
        href: '/app/associados?associationStatus=associado&contributionStatus=em_dia',
        tone: 'pos',
      },
    ],
    statusColumns,
    topRegions: topRegions.map((region) => ({
      country: region.country,
      total: region.total,
      pct: Math.round((region.total / regionDenominator) * 100),
    })),
    urgentActivities: urgentActivities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      priority: activity.priority,
      dueDate: activity.dueDate,
      assigneeName: activity.assigneeName,
    })),
    birthdaysThisMonth: birthdaysThisMonth.map(toDashboardBirthdayItem),
    inadimplentesCount,
  };
}

function toDashboardBirthdayItem(item: BirthdayItem): BirthdayItem {
  return {
    ...item,
    fullName: toPortugueseTitleCase(item.fullName),
    assignment: item.assignment ? toPortugueseTitleCase(item.assignment) : null,
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
