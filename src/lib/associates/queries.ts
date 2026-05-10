import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';
import { eq, and, count, asc, sql } from 'drizzle-orm';
import { buildAssociateNameSearchPattern } from '@/lib/associates/search-params';

export interface AssociateListItem {
  id: number;
  fullName: string;
  assignment: string | null;
  classPattern: string | null;
  primaryEmail: string | null;
  functionalStatus: string | null;
}

export async function getAssociatesPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<{ rows: AssociateListItem[]; total: number }> {
  const baseWhere = and(
    eq(associates.associationStatus, 'ativo'),
    searchQuery
      ? sql`${associates.fullName} like ${buildAssociateNameSearchPattern(searchQuery)} escape '\\'`
      : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: associates.id,
        fullName: associates.fullName,
        assignment: associates.assignment,
        classPattern: associates.classPattern,
        primaryEmail: associates.primaryEmail,
        functionalStatus: associates.functionalStatus,
      })
      .from(associates)
      .where(baseWhere)
      .orderBy(asc(associates.fullName), asc(associates.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(associates).where(baseWhere),
  ]);

  return { rows, total };
}
