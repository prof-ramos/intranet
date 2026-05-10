import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import type { Associate } from '@/lib/db/schema/associates';

export interface ReportFilters {
  functionalStatus?: string;
  associationStatus?: string;
  contributionStatus?: string;
  birthMonth?: number;
}

export async function getAssociatesForReport(
  filters: ReportFilters = {},
): Promise<Associate[]> {
  const conditions = [];

  if (filters.functionalStatus) {
    conditions.push(eq(associates.functionalStatus, filters.functionalStatus as 'ativo' | 'aposentado' | 'cedido' | 'em_licenca'));
  }

  if (filters.associationStatus) {
    conditions.push(eq(associates.associationStatus, filters.associationStatus as 'ativo' | 'inativo'));
  }

  if (filters.contributionStatus) {
    conditions.push(eq(associates.contributionStatus, filters.contributionStatus as 'em_dia' | 'inadimplente' | 'pendente_migracao'));
  }

  if (filters.birthMonth !== undefined) {
    conditions.push(
      sql`extract(month from ${associates.birthDate})::integer = ${filters.birthMonth}`,
    );
  }

  return db
    .select()
    .from(associates)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(associates.fullName));
}
