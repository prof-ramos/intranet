import { db } from '@/lib/db';
import {
  isDomesticCountrySql,
  normalizedCountryLabelSql,
} from '@/lib/associates/location-country';
import { activities, associates, assignments } from '@/lib/db/schema';
import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

// Cache TTLs (em segundos)
const TTL_STABLE = 300; // 5 min — dados que mudam pouco (associados, regiões)
const TTL_MODERATE = 120; // 2 min — dados de média volatilidade
const TTL_VOLATILE = 30; // 30s — dados que mudam frequentemente (atividades)
const TTL_REALTIME = 15; // 15s — dados voláteis; mutations usam revalidateTag explícito

const MAX_CACHE_ENTRIES = 10;

/** Strips the year from a date string. "1985-03-15" → "15/03" */
function formatDayMonth(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

function setWithLimit<K, V>(map: Map<K, V>, key: K, value: V) {
  if (map.size >= MAX_CACHE_ENTRIES && !map.has(key)) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) {
      map.delete(firstKey);
    }
  }
  map.set(key, value);
}

export const countActiveAssociates = unstable_cache(
  async (): Promise<number> => {
    const rows = await db
      .select({ count: count() })
      .from(associates)
      .where(eq(associates.associationStatus, 'ativo'));
    return rows[0].count;
  },
  ['active-associates-count'],
  { revalidate: TTL_STABLE, tags: ['associates', 'dashboard'] },
);

export interface ActiveAssociatesByLocation {
  brasil: number;
  exterior: number;
}

export const countActiveAssociatesByLocation = unstable_cache(
  async (): Promise<ActiveAssociatesByLocation> => {
    const locationType = sql<string>`coalesce(
      ${assignments.type}::text,
      case when ${isDomesticCountrySql(associates.locationCountry)}
        then 'nacional'
        else 'exterior'
      end
    )`;

    const rows = await db
      .select({
        brasil: sql<number>`count(*) filter (where ${locationType} = 'nacional')::int`,
        exterior: sql<number>`count(*) filter (where ${locationType} = 'exterior')::int`,
      })
      .from(associates)
      .leftJoin(assignments, eq(assignments.name, associates.assignment))
      .where(eq(associates.associationStatus, 'ativo'));

    return rows[0] ?? { brasil: 0, exterior: 0 };
  },
  ['active-associates-by-location-count'],
  { revalidate: TTL_STABLE, tags: ['associates', 'dashboard'] },
);

export const countContributionsOkAssociates = unstable_cache(
  async (): Promise<number> => {
    const rows = await db
      .select({ count: count() })
      .from(associates)
      .where(
        and(eq(associates.associationStatus, 'ativo'), eq(associates.contributionStatus, 'em_dia')),
      );
    return rows[0].count;
  },
  ['contributions-ok-count'],
  { revalidate: TTL_MODERATE, tags: ['associates', 'dashboard'] },
);

export const countOpenActivities = unstable_cache(
  async (): Promise<number> => {
    const rows = await db
      .select({ count: count() })
      .from(activities)
      .where(ne(activities.status, 'concluido'));
    return rows[0].count;
  },
  ['open-activities-count'],
  { revalidate: TTL_VOLATILE, tags: ['activities', 'dashboard'] },
);

export const countOverdueActivities = unstable_cache(
  async (): Promise<number> => {
    const rows = await db
      .select({ count: count() })
      .from(activities)
      .where(and(ne(activities.status, 'concluido'), sql`${activities.dueDate} < now()`));
    return rows[0].count;
  },
  ['overdue-activities-count'],
  { revalidate: TTL_VOLATILE, tags: ['activities', 'dashboard'] },
);

export interface ActivityStatusCount {
  status: string;
  total: number;
}

export const getActivitiesByStatus = unstable_cache(
  async (): Promise<ActivityStatusCount[]> => {
    return db
      .select({ status: activities.status, total: count() })
      .from(activities)
      .groupBy(activities.status);
  },
  ['activities-by-status'],
  { revalidate: TTL_VOLATILE, tags: ['activities', 'dashboard'] },
);

export interface TopRegion {
  country: string | null;
  total: number;
}

const topRegionsCache = new Map<number, ReturnType<typeof unstable_cache>>();

export const getTopRegions = (limit = 6): Promise<TopRegion[]> => {
  const existing = topRegionsCache.get(limit);
  if (existing) return existing();

  const normalizedCountry = normalizedCountryLabelSql(associates.locationCountry);

  const created = unstable_cache(
    async (): Promise<TopRegion[]> =>
      db
        .select({ country: normalizedCountry, total: count() })
        .from(associates)
        .where(eq(associates.associationStatus, 'ativo'))
        .groupBy(normalizedCountry)
        .orderBy(desc(count()))
        .limit(limit),
    ['top-regions', String(limit)],
    { revalidate: TTL_STABLE, tags: ['associates', 'dashboard'] },
  );

  setWithLimit(topRegionsCache, limit, created);
  return created();
};

export interface UrgentActivity {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

const urgentActivitiesCache = new Map<number, ReturnType<typeof unstable_cache>>();

export const getUrgentActivities = (limit = 4): Promise<UrgentActivity[]> => {
  const existing = urgentActivitiesCache.get(limit);
  if (existing) return existing();

  const created = unstable_cache(
    async (): Promise<UrgentActivity[]> =>
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
    ['urgent-activities', String(limit)],
    { revalidate: TTL_REALTIME, tags: ['activities', 'dashboard'] },
  );

  setWithLimit(urgentActivitiesCache, limit, created);
  return created();
};

export interface BirthdayItem {
  id: number;
  fullName: string;
  assignment: string | null;
  /** Day/month only, formatted as "dd/mm" (year stripped for PII minimization) */
  birthDayMonth: string;
}

const TTL_BIRTHDAY = 3600; // 1h — birthday list changes rarely during the day

const birthdaysCache = new Map<number, ReturnType<typeof unstable_cache>>();

export const getBirthdaysThisMonth = (limit = 10): Promise<BirthdayItem[]> => {
  const existing = birthdaysCache.get(limit);
  if (existing) return existing() as Promise<BirthdayItem[]>;

  const created = unstable_cache(
    async (): Promise<BirthdayItem[]> => {
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
    ['birthdays-this-month', String(limit)],
    { revalidate: TTL_BIRTHDAY, tags: ['dashboard'] },
  );
  setWithLimit(birthdaysCache, limit, created);
  return created();
};

export const countInadimplentesAssociates = unstable_cache(
  async (): Promise<number> => {
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
  ['inadimplentes-count'],
  { revalidate: TTL_MODERATE, tags: ['dashboard'] },
);

export interface KanbanCard {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  associateName: string | null;
}

const kanbanCardsCache = new Map<number, ReturnType<typeof unstable_cache>>();

export const getKanbanCards = (limit = 20): Promise<KanbanCard[]> => {
  const existing = kanbanCardsCache.get(limit);
  if (existing) return existing();

  const created = unstable_cache(
    async (): Promise<KanbanCard[]> =>
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
    ['kanban-cards', String(limit)],
    { revalidate: TTL_REALTIME, tags: ['activities', 'dashboard'] },
  );

  setWithLimit(kanbanCardsCache, limit, created);
  return created();
};
