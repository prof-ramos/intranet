import { db } from '@/lib/db';
import { associates, activities, functionalStatus, associationStatus, contributionStatus } from '@/lib/db/schema';
import { eq, and, count, asc, sql } from 'drizzle-orm';
import { buildAssociateNameSearchPattern } from './search-params';

type FunctionalStatusEnum = (typeof functionalStatus.enumValues)[number];
type AssociationStatusEnum = (typeof associationStatus.enumValues)[number];
type ContributionStatusEnum = (typeof contributionStatus.enumValues)[number];

export interface AssociateListItem {
  id: number;
  fullName: string;
  assignment: string | null;
  classPattern: string | null;
  primaryEmail: string | null;
  functionalStatus: string | null;
}

export async function findAssociatesPaginated(
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

export async function findAssociateById(id: number) {
  const [row] = await db.select().from(associates).where(eq(associates.id, id)).limit(1);
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
  siape?: string | null;
  primaryEmail?: string | null;
  secondaryEmail?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  birthDate?: string | null;
  address?: string | null;
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

export async function updateAssociateById(id: number, values: UpdateAssociateValues) {
  await db.update(associates).set(values).where(eq(associates.id, id));
}
