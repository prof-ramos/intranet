import { db } from '@/lib/db';
import {
  assignmentLocationTypeSql,
  normalizedCountryLabelSql,
} from '@/lib/associates/location-country';
import { activities, admins, associates, assignments } from '@/lib/db/schema';
import { and, asc, countDistinct, desc, eq, ne, sql } from 'drizzle-orm';
import { withCache } from '@/lib/cache/with-cache';

// Cache TTLs (em segundos)
const TTL_STABLE = 300; // 5 min — dados que mudam pouco (associados, regiões)
const TTL_MODERATE = 120; // 2 min — dados de média volatilidade
const TTL_VOLATILE = 30; // 30s — dados que mudam frequentemente (atividades)
const TTL_REALTIME = 15; // 15s — dados voláteis; mutations usam revalidateTag explícito
const TTL_BIRTHDAY = 3600; // 1h — birthday list changes rarely during the day

/** Strips the year from a date string. "1985-03-15" → "15/03" */
function formatDayMonth(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

export interface ActiveAssociatesByLocation {
  brasil: number;
  exterior: number;
}

export interface AssociateMetrics {
  active: number;
  byLocation: ActiveAssociatesByLocation;
  contributionsOk: number;
  inadimplentes: number;
}

export const getAssociateMetrics = withCache({
  fn: async (): Promise<AssociateMetrics> => {
    const locationType = assignmentLocationTypeSql(assignments.type, associates.locationCountry);

    const rows = await db
      .select({
        active: sql<number>`count(*) filter (where ${associates.associationStatus} = 'associado')::int`,
        brasil: sql<number>`count(*) filter (where ${associates.associationStatus} = 'associado' and ${locationType} = 'nacional')::int`,
        exterior: sql<number>`count(*) filter (where ${associates.associationStatus} = 'associado' and ${locationType} = 'exterior')::int`,
        contributionsOk: sql<number>`count(*) filter (where ${associates.associationStatus} = 'associado' and ${associates.contributionStatus} = 'em_dia')::int`,
        inadimplentes: sql<number>`count(*) filter (where ${associates.associationStatus} = 'associado' and ${associates.contributionStatus} = 'inadimplente')::int`,
      })
      .from(associates)
      .leftJoin(assignments, eq(assignments.name, associates.assignment));

    const row = rows[0];
    return {
      active: Number(row?.active ?? 0),
      byLocation: {
        brasil: Number(row?.brasil ?? 0),
        exterior: Number(row?.exterior ?? 0),
      },
      contributionsOk: Number(row?.contributionsOk ?? 0),
      inadimplentes: Number(row?.inadimplentes ?? 0),
    };
  },
  keyFn: () => ['associate-metrics'],
  ttl: TTL_MODERATE,
  tags: ['dashboard:associates', 'associates'],
});

export interface ActivityStatusCount {
  status: string;
  total: number;
}

export interface ActivityMetrics {
  open: number;
  overdue: number;
  byStatus: ActivityStatusCount[];
}

export const getActivityMetrics = withCache({
  fn: async (): Promise<ActivityMetrics> => {
    const rows = await db
      .select({
        open: sql<number>`count(*) filter (where ${activities.status} <> 'concluido')::int`,
        overdue: sql<number>`count(*) filter (where ${activities.status} <> 'concluido' and ${activities.dueDate} < now())::int`,
        aFazer: sql<number>`count(*) filter (where ${activities.status} = 'a_fazer')::int`,
        emAndamento: sql<number>`count(*) filter (where ${activities.status} = 'em_andamento')::int`,
        aguardandoTerceiros: sql<number>`count(*) filter (where ${activities.status} = 'aguardando_terceiros')::int`,
        concluido: sql<number>`count(*) filter (where ${activities.status} = 'concluido')::int`,
      })
      .from(activities);

    const row = rows[0];
    return {
      open: Number(row?.open ?? 0),
      overdue: Number(row?.overdue ?? 0),
      byStatus: [
        { status: 'a_fazer', total: Number(row?.aFazer ?? 0) },
        { status: 'em_andamento', total: Number(row?.emAndamento ?? 0) },
        {
          status: 'aguardando_terceiros',
          total: Number(row?.aguardandoTerceiros ?? 0),
        },
        { status: 'concluido', total: Number(row?.concluido ?? 0) },
      ],
    };
  },
  keyFn: () => ['activity-metrics'],
  ttl: TTL_VOLATILE,
  tags: ['dashboard:activities'],
});

export interface TopRegion {
  country: string | null;
  total: number;
}

const normalizedCountry = normalizedCountryLabelSql(associates.locationCountry);

const _getTopRegions = withCache({
  fn: async (limit: number): Promise<TopRegion[]> =>
    db
      .select({ country: normalizedCountry, total: countDistinct(associates.id) })
      .from(associates)
      .where(eq(associates.associationStatus, 'associado'))
      .groupBy(normalizedCountry)
      .orderBy(desc(countDistinct(associates.id)))
      .limit(limit),
  keyFn: (limit) => ['top-regions-v3', String(limit)],
  ttl: TTL_STABLE,
  tags: ['dashboard:associates', 'associates'],
  maxEntries: 10,
});

export const getTopRegions = (limit = 6): Promise<TopRegion[]> => _getTopRegions(limit);

export interface UrgentActivity {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeName: string | null;
}

const _getUrgentActivities = withCache({
  fn: async (limit: number): Promise<UrgentActivity[]> =>
    db
      .select({
        id: activities.id,
        title: activities.title,
        status: activities.status,
        priority: activities.priority,
        dueDate: activities.dueDate,
        assigneeName: admins.name,
      })
      .from(activities)
      .leftJoin(admins, eq(activities.assigneeId, admins.id))
      .where(and(ne(activities.status, 'concluido'), sql`${activities.dueDate} < now()`))
      .orderBy(activities.dueDate)
      .limit(limit),
  keyFn: (limit) => ['urgent-activities', String(limit)],
  ttl: TTL_REALTIME,
  tags: ['dashboard:activities'],
  maxEntries: 10,
});

export const getUrgentActivities = (limit = 4): Promise<UrgentActivity[]> =>
  _getUrgentActivities(limit);

export interface BirthdayItem {
  id: number;
  fullName: string;
  assignment: string | null;
  /** Day/month only, formatted as "dd/mm" (year stripped for PII minimization) */
  birthDayMonth: string;
}

const _getBirthdaysThisMonth = withCache({
  fn: async (limit: number): Promise<BirthdayItem[]> => {
    const rows = await db
      .select({
        id: associates.id,
        fullName: associates.fullName,
        assignment: associates.assignment,
        birthDate: associates.birthDate,
      })
      .from(associates)
      .where(
        and(
          eq(associates.associationStatus, 'associado'),
          sql`${associates.birthDate} IS NOT NULL`,
          sql`EXTRACT(MONTH FROM ${associates.birthDate}::date) = EXTRACT(MONTH FROM CURRENT_DATE)`,
        ),
      )
      .orderBy(sql`EXTRACT(DAY FROM ${associates.birthDate}::date) ASC`)
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      assignment: r.assignment,
      birthDayMonth: formatDayMonth(r.birthDate as string),
    }));
  },
  keyFn: (limit) => ['birthdays-this-month', String(limit)],
  ttl: TTL_BIRTHDAY,
  tags: ['dashboard:associates', 'associates'],
  maxEntries: 10,
});

export const getBirthdaysThisMonth = (limit = 10): Promise<BirthdayItem[]> =>
  _getBirthdaysThisMonth(limit);

export interface KanbanCard {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  associateName: string | null;
}

const _getKanbanCards = withCache({
  fn: async (limit: number): Promise<KanbanCard[]> =>
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
      .limit(limit),
  keyFn: (limit) => ['kanban-cards', String(limit)],
  ttl: TTL_REALTIME,
  tags: ['dashboard:activities'],
  maxEntries: 10,
});

export const getKanbanCards = (limit = 20): Promise<KanbanCard[]> => _getKanbanCards(limit);
