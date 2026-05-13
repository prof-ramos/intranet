import { db } from '@/lib/db';
import { activities, associates } from '@/lib/db/schema';
import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

// Cache TTLs (em segundos)
const TTL_STABLE = 300; // 5 min — dados que mudam pouco (associados, regiões)
const TTL_MODERATE = 120; // 2 min — dados de média volatilidade
const TTL_VOLATILE = 30; // 30s — dados que mudam frequentemente (atividades)
const TTL_REALTIME = 15; // 15s — dados altamente voláteis

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

export const countPendingMigrationAssociates = unstable_cache(
  async (): Promise<number> => {
    const rows = await db
      .select({ count: count() })
      .from(associates)
      .where(eq(associates.contributionStatus, 'pendente_migracao'));
    return rows[0].count;
  },
  ['pending-migration-count'],
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
  let cached = topRegionsCache.get(limit);
  if (!cached) {
    cached = unstable_cache(
      async (): Promise<TopRegion[]> =>
        db
          .select({ country: associates.locationCountry, total: count() })
          .from(associates)
          .where(eq(associates.associationStatus, 'ativo'))
          .groupBy(associates.locationCountry)
          .orderBy(desc(count()))
          .limit(limit),
      ['top-regions', String(limit)],
      { revalidate: TTL_STABLE, tags: ['associates', 'dashboard'] },
    );
    topRegionsCache.set(limit, cached);
  }
  return cached();
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
  let cached = urgentActivitiesCache.get(limit);
  if (!cached) {
    cached = unstable_cache(
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
    urgentActivitiesCache.set(limit, cached);
  }
  return cached();
};

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
  let cached = kanbanCardsCache.get(limit);
  if (!cached) {
    cached = unstable_cache(
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
    kanbanCardsCache.set(limit, cached);
  }
  return cached();
};
