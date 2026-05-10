import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import type { Associate } from '@/lib/db/schema/associates';

export type ReportAssociate = Pick<Associate,
  | 'id'
  | 'fullName'
  | 'primaryEmail'
  | 'secondaryEmail'
  | 'birthDate'
  | 'cpf'
  | 'address'
  | 'locationCity'
  | 'locationCountry'
  | 'phone'
  | 'whatsapp'
  | 'siape'
  | 'assignment'
  | 'assignmentStartDate'
  | 'classPattern'
  | 'functionalStatus'
  | 'associationStatus'
  | 'contributionStatus'
  | 'joinedAt'
  | 'associationCategory'
>;

export interface ReportFilters {
  functionalStatus?: string;
  associationStatus?: string;
  contributionStatus?: string;
  birthMonth?: number;
}

export async function getAssociatesForReport(
  filters: ReportFilters = {},
): Promise<ReportAssociate[]> {
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
    .select({
      id: associates.id,
      fullName: associates.fullName,
      primaryEmail: associates.primaryEmail,
      secondaryEmail: associates.secondaryEmail,
      birthDate: associates.birthDate,
      cpf: associates.cpf,
      address: associates.address,
      locationCity: associates.locationCity,
      locationCountry: associates.locationCountry,
      phone: associates.phone,
      whatsapp: associates.whatsapp,
      siape: associates.siape,
      assignment: associates.assignment,
      assignmentStartDate: associates.assignmentStartDate,
      classPattern: associates.classPattern,
      functionalStatus: associates.functionalStatus,
      associationStatus: associates.associationStatus,
      contributionStatus: associates.contributionStatus,
      joinedAt: associates.joinedAt,
      associationCategory: associates.associationCategory,
    })
    .from(associates)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(associates.fullName));
}
