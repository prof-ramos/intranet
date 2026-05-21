import { and, asc, eq, ilike } from 'drizzle-orm';
import { db } from '@/lib/db';
import { activities, associates } from '@/lib/db/schema';
import { escapeLikePattern } from '@/lib/db/like-pattern';

export interface AssociateSearchResult {
  type: 'associate';
  id: number;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface ActivitySearchResult {
  type: 'activity';
  id: number;
  title: string;
  subtitle: string | null;
  href: string;
}

export type SearchResult = AssociateSearchResult | ActivitySearchResult;

const STATUS_LABELS: Record<string, string> = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  aguardando_terceiros: 'Aguardando terceiros',
  concluido: 'Concluído',
};

export async function searchAssociates(query: string, limit = 5): Promise<AssociateSearchResult[]> {
  const pattern = `%${escapeLikePattern(query)}%`;
  const rows = await db
    .select({ id: associates.id, fullName: associates.fullName, assignment: associates.assignment })
    .from(associates)
    .where(and(eq(associates.associationStatus, 'ativo'), ilike(associates.fullName, pattern)))
    .orderBy(asc(associates.fullName))
    .limit(limit);

  return rows.map((row) => ({
    type: 'associate' as const,
    id: row.id,
    title: row.fullName,
    subtitle: row.assignment,
    href: `/app/associados/${row.id}`,
  }));
}

export async function searchActivities(query: string, limit = 5): Promise<ActivitySearchResult[]> {
  const pattern = `%${escapeLikePattern(query)}%`;
  const rows = await db
    .select({ id: activities.id, title: activities.title, status: activities.status })
    .from(activities)
    .where(ilike(activities.title, pattern))
    .orderBy(asc(activities.title))
    .limit(limit);

  return rows.map((row) => ({
    type: 'activity' as const,
    id: row.id,
    title: row.title,
    subtitle: STATUS_LABELS[row.status] ?? row.status,
    href: `/app/atividades?open=${row.id}`,
  }));
}
