import { db, type DbExecutor } from '@/lib/db';
import {
  associates,
  activities,
  dependents,
  healthAgreements,
  functionalStatus,
  associationStatus,
  contributionStatus,
  sex,
  maritalStatus,
  missionType,
  careerOrigin,
  paymentMethod,
} from '@/lib/db/schema';
import { eq, and, count, asc, sql } from 'drizzle-orm';
import {
  buildAssociateNameSearchPattern,
  normalizeCpfForSearch,
  normalizeSiapeForSearch,
  type AssociateSearchMode,
} from './search-params';
import { decryptPiiField, piiBlindIndex } from '@/lib/crypto/pii';

type FunctionalStatusEnum = (typeof functionalStatus.enumValues)[number];
type AssociationStatusEnum = (typeof associationStatus.enumValues)[number];
type ContributionStatusEnum = (typeof contributionStatus.enumValues)[number];
type SexEnum = (typeof sex.enumValues)[number];
type MaritalStatusEnum = (typeof maritalStatus.enumValues)[number];
type MissionTypeEnum = (typeof missionType.enumValues)[number];
type CareerOriginEnum = (typeof careerOrigin.enumValues)[number];
type PaymentMethodEnum = (typeof paymentMethod.enumValues)[number];

const publicAssociateListColumns = {
  id: associates.id,
  fullName: associates.fullName,
  assignment: associates.assignment,
  classPattern: associates.classPattern,
  functionalStatus: associates.functionalStatus,
  associationStatus: associates.associationStatus,
  contributionStatus: associates.contributionStatus,
  siape: associates.siape,
  siapeCiphertext: associates.siapeCiphertext,
  primaryEmail: associates.primaryEmail,
  primaryEmailCiphertext: associates.primaryEmailCiphertext,
  phone: associates.phone,
  phoneCiphertext: associates.phoneCiphertext,
  whatsapp: associates.whatsapp,
  whatsappCiphertext: associates.whatsappCiphertext,
};

export interface AssociateListItem {
  id: number;
  fullName: string;
  assignment: string | null;
  classPattern: string | null;
  primaryEmail: string | null;
  siape: string | null;
  phone: string | null;
  whatsapp: string | null;
  functionalStatus: string | null;
  associationStatus: string | null;
  contributionStatus: string | null;
}

export interface AssociatesFilters {
  contributionStatus?: 'em_dia' | 'inadimplente' | 'pendente_migracao';
  functionalStatus?: 'ativo' | 'aposentado' | 'cedido' | 'em_licenca';
  associationStatus?: 'ativo' | 'inativo';
}

export async function findAssociatesPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
  filters?: AssociatesFilters,
  searchBy: AssociateSearchMode = 'name',
): Promise<{ rows: AssociateListItem[]; total: number }> {
  const normalizedSearchQuery = searchQuery?.trim();

  // Hash-based exact lookup for CPF/SIAPE — returns 0 or 1 results
  if ((searchBy === 'cpf' || searchBy === 'siape') && normalizedSearchQuery) {
    const digits = searchBy === 'cpf'
      ? normalizeCpfForSearch(normalizedSearchQuery)
      : normalizeSiapeForSearch(normalizedSearchQuery);

    if (!digits) {
      return { rows: [], total: 0 };
    }

    const hash = piiBlindIndex(digits);
    const hashColumn = searchBy === 'cpf' ? associates.cpfHash : associates.siapeHash;
    const filterConditions = and(
      eq(hashColumn, hash),
      filters?.contributionStatus
        ? eq(associates.contributionStatus, filters.contributionStatus)
        : undefined,
      filters?.functionalStatus
        ? eq(associates.functionalStatus, filters.functionalStatus)
        : undefined,
      filters?.associationStatus
        ? eq(associates.associationStatus, filters.associationStatus)
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      db
        .select(publicAssociateListColumns)
        .from(associates)
        .where(filterConditions)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(associates).where(filterConditions),
    ]);

    return {
      rows: rows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        assignment: row.assignment,
        classPattern: row.classPattern,
        functionalStatus: row.functionalStatus,
        associationStatus: row.associationStatus,
        contributionStatus: row.contributionStatus,
        primaryEmail: decryptPiiField(row.primaryEmailCiphertext ?? null, row.primaryEmail ?? null),
        siape: decryptPiiField(row.siapeCiphertext ?? null, row.siape ?? null),
        phone: decryptPiiField(row.phoneCiphertext ?? null, row.phone ?? null),
        whatsapp: decryptPiiField(row.whatsappCiphertext ?? null, row.whatsapp ?? null),
      })),
      total,
    };
  }

  // Default: name-based ILIKE search
  const baseWhere = and(
    normalizedSearchQuery
      ? sql`${associates.fullName} ilike ${buildAssociateNameSearchPattern(normalizedSearchQuery)} escape '\\'`
      : undefined,
    filters?.contributionStatus
      ? eq(associates.contributionStatus, filters.contributionStatus)
      : undefined,
    filters?.functionalStatus
      ? eq(associates.functionalStatus, filters.functionalStatus)
      : undefined,
    filters?.associationStatus
      ? eq(associates.associationStatus, filters.associationStatus)
      : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select(publicAssociateListColumns)
      .from(associates)
      .where(baseWhere)
      .orderBy(asc(associates.fullName), asc(associates.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(associates).where(baseWhere),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      assignment: row.assignment,
      classPattern: row.classPattern,
      functionalStatus: row.functionalStatus,
      associationStatus: row.associationStatus,
      contributionStatus: row.contributionStatus,
      primaryEmail: decryptPiiField(row.primaryEmailCiphertext ?? null, row.primaryEmail ?? null),
      siape: decryptPiiField(row.siapeCiphertext ?? null, row.siape ?? null),
      phone: decryptPiiField(row.phoneCiphertext ?? null, row.phone ?? null),
      whatsapp: decryptPiiField(row.whatsappCiphertext ?? null, row.whatsapp ?? null),
    })),
    total,
  };
}

// ─── Cursor-based pagination (keyset) for large queries ─────────────────

function encodeCursor(fullName: string, id: number): string {
  return Buffer.from(JSON.stringify({ fullName, id })).toString('base64url');
}

function decodeCursor(cursor: string): { fullName: string; id: number } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
    if (typeof parsed.fullName === 'string' && typeof parsed.id === 'number') {
      return { fullName: parsed.fullName, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

export interface AssociateCursorPage {
  rows: AssociateListItem[];
  nextCursor: string | null;
}

export async function findAssociatesPaginatedCursor(
  pageSize: number,
  cursor: string | null,
  searchQuery?: string,
  filters?: AssociatesFilters,
  searchBy: AssociateSearchMode = 'name',
): Promise<AssociateCursorPage> {
  const normalizedSearchQuery = searchQuery?.trim();

  // CPF/SIAPE exact lookup: cursor is irrelevant; return single result
  if ((searchBy === 'cpf' || searchBy === 'siape') && normalizedSearchQuery) {
    const digits = searchBy === 'cpf'
      ? normalizeCpfForSearch(normalizedSearchQuery)
      : normalizeSiapeForSearch(normalizedSearchQuery);

    if (!digits) {
      return { rows: [], nextCursor: null };
    }

    const hash = piiBlindIndex(digits);
    const hashColumn = searchBy === 'cpf' ? associates.cpfHash : associates.siapeHash;
    const filterConditions = and(
      eq(hashColumn, hash),
      filters?.contributionStatus
        ? eq(associates.contributionStatus, filters.contributionStatus)
        : undefined,
      filters?.functionalStatus
        ? eq(associates.functionalStatus, filters.functionalStatus)
        : undefined,
      filters?.associationStatus
        ? eq(associates.associationStatus, filters.associationStatus)
        : undefined,
    );

    const rows = await db
      .select(publicAssociateListColumns)
      .from(associates)
      .where(filterConditions)
      .limit(pageSize);

    return {
      rows: rows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        assignment: row.assignment,
        classPattern: row.classPattern,
        functionalStatus: row.functionalStatus,
        associationStatus: row.associationStatus,
        contributionStatus: row.contributionStatus,
        primaryEmail: decryptPiiField(row.primaryEmailCiphertext ?? null, row.primaryEmail ?? null),
        siape: decryptPiiField(row.siapeCiphertext ?? null, row.siape ?? null),
        phone: decryptPiiField(row.phoneCiphertext ?? null, row.phone ?? null),
        whatsapp: decryptPiiField(row.whatsappCiphertext ?? null, row.whatsapp ?? null),
      })),
      nextCursor: null,
    };
  }

  // Default: name-based ILIKE search with keyset pagination
  const decoded = cursor ? decodeCursor(cursor) : null;

  const baseWhere = and(
    normalizedSearchQuery
      ? sql`${associates.fullName} ilike ${buildAssociateNameSearchPattern(normalizedSearchQuery)} escape '\\'`
      : undefined,
    filters?.contributionStatus
      ? eq(associates.contributionStatus, filters.contributionStatus)
      : undefined,
    filters?.functionalStatus
      ? eq(associates.functionalStatus, filters.functionalStatus)
      : undefined,
    filters?.associationStatus
      ? eq(associates.associationStatus, filters.associationStatus)
      : undefined,
    decoded
      ? sql`${associates.fullName} > ${decoded.fullName} OR (${associates.fullName} = ${decoded.fullName} AND ${associates.id} > ${decoded.id})`
      : undefined,
  );

  const rows = await db
    .select(publicAssociateListColumns)
    .from(associates)
    .where(baseWhere)
    .orderBy(asc(associates.fullName), asc(associates.id))
    .limit(pageSize + 1);

  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const lastRow = pageRows[pageRows.length - 1];

  return {
    rows: pageRows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      assignment: row.assignment,
      classPattern: row.classPattern,
      functionalStatus: row.functionalStatus,
      associationStatus: row.associationStatus,
      contributionStatus: row.contributionStatus,
      primaryEmail: decryptPiiField(row.primaryEmailCiphertext ?? null, row.primaryEmail ?? null),
      siape: decryptPiiField(row.siapeCiphertext ?? null, row.siape ?? null),
      phone: decryptPiiField(row.phoneCiphertext ?? null, row.phone ?? null),
      whatsapp: decryptPiiField(row.whatsappCiphertext ?? null, row.whatsapp ?? null),
    })),
    nextCursor: hasMore && lastRow ? encodeCursor(lastRow.fullName, lastRow.id) : null,
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
  rg?: string | null;
  rgCiphertext?: string | null;
  rgHash?: string | null;
  rgIssuer?: string | null;
  rgState?: string | null;
  rgExpeditionDate?: string | null;
  sex?: SexEnum | null;
  maritalStatus?: MaritalStatusEnum | null;
  birthCity?: string | null;
  birthState?: string | null;
  neighborhood?: string | null;
  addressState?: string | null;
  zipCode?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  assignment?: string | null;
  assignmentStartDate?: string | null;
  classPattern?: string | null;
  associationCategory?: string | null;
  functionalStatus?: FunctionalStatusEnum | null;
  associationStatus?: AssociationStatusEnum;
  contributionStatus?: ContributionStatusEnum;
  missionType?: MissionTypeEnum | null;
  careerOrigin?: CareerOriginEnum | null;
  admissionDate?: string | null;
  inaugurationDate?: string | null;
  cancellationDate?: string | null;
  ceocMember?: boolean | null;
  caocMember?: boolean | null;
  paymentMethod?: PaymentMethodEnum;
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

export interface DependentItem {
  id: number;
  name: string;
  relationship: string;
}

export async function findDependentsByAssociateId(associateId: number): Promise<DependentItem[]> {
  return db
    .select({
      id: dependents.id,
      name: dependents.name,
      relationship: dependents.relationship,
    })
    .from(dependents)
    .where(eq(dependents.associateId, associateId))
    .orderBy(asc(dependents.id));
}

export interface HealthAgreementItem {
  id: number;
  provider: string;
  startDate: string | null;
  endDate: string | null;
}

export async function findHealthAgreementsByAssociateId(
  associateId: number,
): Promise<HealthAgreementItem[]> {
  return db
    .select({
      id: healthAgreements.id,
      provider: healthAgreements.provider,
      startDate: healthAgreements.startDate,
      endDate: healthAgreements.endDate,
    })
    .from(healthAgreements)
    .where(eq(healthAgreements.associateId, associateId))
    .orderBy(asc(healthAgreements.id));
}

// ─── Dependent CRUD ─────────────────────────────────────────────────────

export interface CreateDependentInput {
  associateId: number;
  name: string;
  relationship: string;
}

export interface UpdateDependentInput {
  name?: string;
  relationship?: string;
}

export async function createDependent(input: CreateDependentInput): Promise<DependentItem> {
  const [row] = await db
    .insert(dependents)
    .values({
      associateId: input.associateId,
      name: input.name,
      relationship: input.relationship,
    })
    .returning({ id: dependents.id, name: dependents.name, relationship: dependents.relationship });
  return row;
}

export async function updateDependentById(
  id: number,
  values: UpdateDependentInput,
  associateId: number,
): Promise<void> {
  const result = await db
    .update(dependents)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(dependents.id, id), eq(dependents.associateId, associateId)))
    .returning({ id: dependents.id });
  if (result.length === 0) {
    throw new Error('Dependente não encontrado ou já removido.');
  }
}

export async function deleteDependentById(id: number, associateId: number): Promise<void> {
  const result = await db
    .delete(dependents)
    .where(and(eq(dependents.id, id), eq(dependents.associateId, associateId)))
    .returning({ id: dependents.id });
  if (result.length === 0) {
    throw new Error('Dependente não encontrado ou já removido.');
  }
}

// ─── Health Agreement CRUD ───────────────────────────────────────────────

export interface CreateHealthAgreementInput {
  associateId: number;
  provider: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateHealthAgreementInput {
  provider?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export async function createHealthAgreement(
  input: CreateHealthAgreementInput,
): Promise<HealthAgreementItem> {
  const [row] = await db
    .insert(healthAgreements)
    .values({
      associateId: input.associateId,
      provider: input.provider,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
    })
    .returning({
      id: healthAgreements.id,
      provider: healthAgreements.provider,
      startDate: healthAgreements.startDate,
      endDate: healthAgreements.endDate,
    });
  return row;
}

export async function updateHealthAgreementById(
  id: number,
  values: UpdateHealthAgreementInput,
  associateId: number,
): Promise<void> {
  const result = await db
    .update(healthAgreements)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(healthAgreements.id, id), eq(healthAgreements.associateId, associateId)))
    .returning({ id: healthAgreements.id });
  if (result.length === 0) {
    throw new Error('Convênio não encontrado ou já removido.');
  }
}

export async function deleteHealthAgreementById(id: number, associateId: number): Promise<void> {
  const result = await db
    .delete(healthAgreements)
    .where(and(eq(healthAgreements.id, id), eq(healthAgreements.associateId, associateId)))
    .returning({ id: healthAgreements.id });
  if (result.length === 0) {
    throw new Error('Convênio não encontrado ou já removido.');
  }
}
