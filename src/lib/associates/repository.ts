import { db, type DbExecutor } from '@/lib/db';
import {
  associates,
  activities,
  functionalStatus,
  associationStatus,
  contributionStatus,
} from '@/lib/db/schema';
import { eq, and, count, asc, sql } from 'drizzle-orm';
import { buildAssociateNameSearchPattern } from './search-params';

type FunctionalStatusEnum = (typeof functionalStatus.enumValues)[number];
type AssociationStatusEnum = (typeof associationStatus.enumValues)[number];
type ContributionStatusEnum = (typeof contributionStatus.enumValues)[number];

const publicAssociateListColumns = {
  id: associates.id,
  fullName: associates.fullName,
  assignment: associates.assignment,
  classPattern: associates.classPattern,
  functionalStatus: associates.functionalStatus,
  contributionStatus: associates.contributionStatus,
};

export interface AssociateListItem {
  id: number;
  fullName: string;
  assignment: string | null;
  classPattern: string | null;
  primaryEmail: string | null;
  functionalStatus: string | null;
  contributionStatus: string | null;
}

export interface AssociatesFilters {
  contributionStatus?: 'em_dia' | 'inadimplente' | 'pendente_migracao';
  functionalStatus?: 'ativo' | 'aposentado' | 'cedido' | 'em_licenca';
}

export async function findAssociatesPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
  filters?: AssociatesFilters,
  includeEmail = false,
): Promise<{ rows: AssociateListItem[]; total: number }> {
  const baseWhere = and(
    eq(associates.associationStatus, 'ativo'),
    searchQuery
      ? sql`${associates.fullName} like ${buildAssociateNameSearchPattern(searchQuery)} escape '\\'`
      : undefined,
    filters?.contributionStatus
      ? eq(associates.contributionStatus, filters.contributionStatus)
      : undefined,
    filters?.functionalStatus
      ? eq(associates.functionalStatus, filters.functionalStatus)
      : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select(
        includeEmail
          ? { ...publicAssociateListColumns, primaryEmail: associates.primaryEmail }
          : publicAssociateListColumns,
      )
      .from(associates)
      .where(baseWhere)
      .orderBy(asc(associates.fullName), asc(associates.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(associates).where(baseWhere),
  ]);

  return {
    rows: rows.map((row) => ({
      ...row,
      primaryEmail: includeEmail && 'primaryEmail' in row ? (row.primaryEmail ?? null) : null,
    })),
    total,
  };
}


export async function findAssociateById(id: number, executor: DbExecutor = db) {
  const [row] = await executor.select().from(associates).where(eq(associates.id, id)).limit(1);
  return row ?? null;
}

export interface LinkedActivity {
  id: number;
  title: string;
  status: string;
  dueDate: string | null;
}

export async function findLinkedActivities(associateId: number): Promise<LinkedActivity[]> {
  return db
    .select({
      id: activities.id,
      title: activities.title,
      status: activities.status,
      dueDate: activities.dueDate,
    })
    .from(activities)
    .where(eq(activities.associateId, associateId))
    .orderBy(asc(activities.dueDate), asc(activities.id))
    .limit(10);
}

export interface UpdateAssociateValues {
  fullName: string;
  cpf?: string | null;
  cpfCiphertext?: string | null;
  cpfHash?: string | null;
  siape?: string | null;
  siapeCiphertext?: string | null;
  siapeHash?: string | null;
  primaryEmail?: string | null;
  primaryEmailCiphertext?: string | null;
  primaryEmailHash?: string | null;
  secondaryEmail?: string | null;
  phone?: string | null;
  phoneCiphertext?: string | null;
  phoneHash?: string | null;
  whatsapp?: string | null;
  whatsappCiphertext?: string | null;
  whatsappHash?: string | null;
  birthDate?: string | null;
  address?: string | null;
  addressCiphertext?: string | null;
  addressHash?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  assignment?: string | null;
  assignmentStartDate?: string | null;
  classPattern?: string | null;
  associationCategory?: string | null;
  functionalStatus?: FunctionalStatusEnum | null;
  associationStatus?: AssociationStatusEnum;
  contributionStatus?: ContributionStatusEnum;
  internalNotes?: string | null;
}

export async function updateAssociateById(
  id: number,
  values: UpdateAssociateValues,
  executor: DbExecutor = db,
) {
  await executor
    .update(associates)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(associates.id, id));
}

export async function findAssociateByCpfHash(cpfHash: string, executor: DbExecutor = db) {
  const [row] = await executor
    .select()
    .from(associates)
    .where(eq(associates.cpfHash, cpfHash))
    .limit(1);
  return row ?? null;
}

export async function findAssociateBySiapeHash(siapeHash: string, executor: DbExecutor = db) {
  const [row] = await executor
    .select()
    .from(associates)
    .where(eq(associates.siapeHash, siapeHash))
    .limit(1);
  return row ?? null;
}

export async function findAssociateByPrimaryEmailHash(
  primaryEmailHash: string,
  executor: DbExecutor = db,
) {
  const [row] = await executor
    .select()
    .from(associates)
    .where(eq(associates.primaryEmailHash, primaryEmailHash))
    .limit(1);
  return row ?? null;
}
