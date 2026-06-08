import { db } from '@/lib/db';
import {
  isDomesticCountrySql,
  normalizedCountryLabelSql,
} from '@/lib/associates/location-country';
import { activities, associates, assignments } from '@/lib/db/schema';
import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm';
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

export const countActiveAssociates = withCache({
  fn: async (): Promise<number> => {
    const rows = await db
      .select({ count: count() })
      .from(associates)
      .where(eq(associates.associationStatus, 'ativo'));
    return rows[0].count;
  },
  keyFn: () => ['active-associates-count'],
  ttl: TTL_STABLE,
  tags: ['associates', 'dashboard'],
});

export interface ActiveAssociatesByLocation {
  brasil: number;
  exterior: number;
}

export const countActiveAssociatesByLocation = withCache({
  fn: async (): Promise<ActiveAssociatesByLocation> => {
    const locationType = sql<string>`coalesce(
      ${assignments.type}::text,
      case when ${isDomesticCountrySql(associates.locationCountry)}
        then 'nacional'
        else 'exterior'
      end
    )`;

    const rows = await db
      .select({
        brasil: sql<number>`count(distinct ${associates.id}) filter (where ${locationType} = 'nacional')::int`,
        exterior: sql<number>`count(distinct ${associates.id}) filter (where ${locationType} = 'exterior')::int`,
      })
      .from(associates)
      .leftJoin(assignments, eq(assignments.name, associates.assignment))
      .where(eq(associates.associationStatus, 'ativo'));

    return rows[0] ?? { brasil: 0, exterior: 0 };
  },
  keyFn: () => ['active-associates-by-location-count'],
  ttl: TTL_STABLE,
  tags: ['associates', 'dashboard'],
});

export const countContributionsOkAssociates = withCache({
  fn: async (): Promise<number> => {
    const rows = await db
      .select({ count: count() })
      .from(associates)
      .where(
        and(eq(associates.associationStatus, 'ativo'), eq(associates.contributionStatus, 'em_dia')),
      );
    return rows[0].count;
  },
  keyFn: () => ['contributions-ok-count'],
  ttl: TTL_MODERATE,
  tags: ['associates', 'dashboard'],
});

export const countOpenActivities = withCache({
  fn: async (): Promise<number> => {
    const rows = await db
      .select({ count: count() })
      .from(activities)
      .where(ne(activities.status, 'concluido'));
    return rows[0].count;
  },
  keyFn: () => ['open-activities-count'],
  ttl: TTL_VOLATILE,
  tags: ['activities', 'dashboard'],
});

export const countOverdueActivities = withCache({
  fn: async (): Promise<number> => {
    const rows = await db
      .select({ count: count() })
      .from(activities)
      .where(and(ne(activities.status, 'concluido'), sql`${activities.dueDate} < now()`));
    return rows[0].count;
  },
  keyFn: () => ['overdue-activities-count'],
  ttl: TTL_VOLATILE,
  tags: ['activities', 'dashboard'],
});

export interface ActivityStatusCount {
  status: string;
  total: number;
}

export const getActivitiesByStatus = withCache({
  fn: async (): Promise<ActivityStatusCount[]> => {
    return db
      .select({ status: activities.status, total: count() })
      .from(activities)
      .groupBy(activities.status);
  },
  keyFn: () => ['activities-by-status'],
  ttl: TTL_VOLATILE,
  tags: ['activities', 'dashboard'],
});

export interface TopRegion {
  country: string | null;
  total: number;
}

const normalizedCountry = normalizedCountryLabelSql(associates.locationCountry);

const _getTopRegions = withCache({
  fn: async (limit: number): Promise<TopRegion[]> =>
    db
      .select({ country: normalizedCountry, total: count() })
      .from(associates)
      .where(eq(associates.associationStatus, 'ativo'))
      .groupBy(normalizedCountry)
      .orderBy(desc(count()))
      .limit(limit),
  keyFn: (limit) => ['top-regions', String(limit)],
  ttl: TTL_STABLE,
  tags: ['associates', 'dashboard'],
  maxEntries: 10,
});

export const getTopRegions = (limit = 6): Promise<TopRegion[]> => _getTopRegions(limit);

export interface UrgentActivity {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
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
      })
      .from(activities)
      .where(and(ne(activities.status, 'concluido'), sql`${activities.dueDate} < now()`))
      .orderBy(activities.dueDate)
      .limit(limit),
  keyFn: (limit) => ['urgent-activities', String(limit)],
  ttl: TTL_REALTIME,
  tags: ['activities', 'dashboard'],
  maxEntries: 10,
});

export const getUrgentActivities = (limit = 4): Promise<UrgentActivity[]> => _getUrgentActivities(limit);

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
          eq(associates.associationStatus, 'ativo'),
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
  tags: ['dashboard'],
  maxEntries: 10,
});

export const getBirthdaysThisMonth = (limit = 10): Promise<BirthdayItem[]> => _getBirthdaysThisMonth(limit);

export const countInadimplentesAssociates = withCache({
  fn: async (): Promise<number> => {
    const rows = await db
      .select({ count: count() })
      .from(associates)
      .where(
        and(
          eq(associates.associationStatus, 'ativo'),
          eq(associates.contributionStatus, 'inadimplente'),
        ),
      );
    return rows[0].count;
  },
  keyFn: () => ['inadimplentes-count'],
  ttl: TTL_MODERATE,
  tags: ['dashboard'],
});

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
  tags: ['activities', 'dashboard'],
  maxEntries: 10,
});

export const getKanbanCards = (limit = 20): Promise<KanbanCard[]> => _getKanbanCards(limit);
