import type { Role } from './lgpd';
import { canViewSensitiveFields, maskCpf, maskSiape } from './lgpd';
import {
  findAssociatesPaginated,
  findAssociateById,
  updateAssociateById,
  type UpdateAssociateValues,
  type AssociatesFilters,
} from './repository';
import { db } from '@/lib/db';
import {
  functionalStatus as fsEnum,
  associationStatus as asEnum,
  contributionStatus as csEnum,
} from '@/lib/db/schema';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { logDataAccess } from '@/lib/audit/service';
import { buildPiiPatch, decryptAssociatePii } from './pii-mapping';

type FsEnum = (typeof fsEnum.enumValues)[number];
type AsEnum = (typeof asEnum.enumValues)[number];
type CsEnum = (typeof csEnum.enumValues)[number];

const isFsEnum = (v: string): v is FsEnum => fsEnum.enumValues.includes(v as FsEnum);
const isAsEnum = (v: string): v is AsEnum => asEnum.enumValues.includes(v as AsEnum);
const isCsEnum = (v: string): v is CsEnum => csEnum.enumValues.includes(v as CsEnum);

export {
  getAssociateProfile,
  formatAssociateDate,
  yearsSinceDate,
  initialsFromName,
} from './profile';
export type {
  AssociateLinkedActivity,
  AssociateTimelineItem,
  AssociateProfileViewModel,
} from './profile';

export interface EditAssociateDTO {
  id: number;
  fullName: string;
  cpf: string | null;
  siape: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  birthDate: string | null;
  address: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  assignment: string | null;
  assignmentStartDate: string | null;
  classPattern: string | null;
  associationCategory: string | null;
  functionalStatus: string | null;
  associationStatus: string;
  contributionStatus: string;
  internalNotes: string | null;
  canEditInternalNotes: boolean;
}

export function getAssociateStatusLabel(value: string | null) {
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    inativo: 'Inativo',
    aposentado: 'Aposentado',
    cedido: 'Cedido',
    em_licenca: 'Em licença',
    em_dia: 'Em dia',
    inadimplente: 'Inadimplente',
    pendente_migracao: 'Pendente migração',
  };
  return value ? (labels[value] ?? value) : null;
}

export async function getAssociatesListPage(
  page: number,
  pageSize: number,
  searchQuery?: string,
  filters?: AssociatesFilters,
  role?: Role,
) {
  const includeEmail = role === 'admin' || role === 'diretoria';
  return findAssociatesPaginated(page, pageSize, searchQuery, filters, includeEmail);
}

export async function getAssociateForEdit(
  id: number,
  role: Role,
  adminId: number,
): Promise<EditAssociateDTO | null> {
  const row = await findAssociateById(id);
  if (!row) return null;

  const decrypted = decryptAssociatePii(row);
  const cpf = canViewSensitiveFields(role)
    ? decrypted.cpf
    : maskCpf(decrypted.cpf);
  const siape = canViewSensitiveFields(role)
    ? decrypted.siape
    : maskSiape(decrypted.siape);

  // LGPD Art. 30/37: log PII data access
  await logDataAccess({
    adminId,
    action: 'view',
    entityType: 'associate',
    entityId: id,
    metadata: { accessType: 'edit_form', sensitiveFields: canViewSensitiveFields(role) },
  });

  return {
    id: row.id,
    fullName: row.fullName,
    cpf,
    siape,
    primaryEmail: decrypted.primaryEmail,
    secondaryEmail: row.secondaryEmail,
    phone: decrypted.phone,
    whatsapp: decrypted.whatsapp,
    birthDate: row.birthDate,
    address: decrypted.address,
    locationCity: row.locationCity,
    locationCountry: row.locationCountry,
    assignment: row.assignment,
    assignmentStartDate: row.assignmentStartDate,
    classPattern: row.classPattern,
    associationCategory: row.associationCategory,
    functionalStatus: row.functionalStatus,
    associationStatus: row.associationStatus,
    contributionStatus: row.contributionStatus,
    internalNotes: row.internalNotes,
    canEditInternalNotes: role === 'admin',
  };
}

export interface UpdateAssociateInput {
  id: number;
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
  functionalStatus?: string | null;
  associationStatus?: string | null;
  contributionStatus?: string | null;
  internalNotes?: string | null;
  updatedBy?: number | null;
}

const WEBHOOK_SAFE_ASSOCIATE_FIELDS: Array<keyof UpdateAssociateValues> = [
  'fullName',
  'locationCity',
  'locationCountry',
  'assignment',
  'assignmentStartDate',
  'classPattern',
  'associationCategory',
  'functionalStatus',
  'associationStatus',
  'contributionStatus',
];

function normalizeComparableValue(value: unknown) {
  return value instanceof Date ? value.toISOString() : (value ?? null);
}

function getChangedWebhookSafeFields(
  current: NonNullable<Awaited<ReturnType<typeof findAssociateById>>>,
  values: UpdateAssociateValues,
) {
  return WEBHOOK_SAFE_ASSOCIATE_FIELDS.filter(
    (field) =>
      Object.prototype.hasOwnProperty.call(values, field) &&
      normalizeComparableValue(current[field]) !== normalizeComparableValue(values[field]),
  );
}

export async function updateAssociateData(input: UpdateAssociateInput) {
  const values: UpdateAssociateValues = {
    fullName: input.fullName,
    secondaryEmail: input.secondaryEmail,
    birthDate: input.birthDate,
    locationCity: input.locationCity,
    locationCountry: input.locationCountry,
    assignment: input.assignment,
    assignmentStartDate: input.assignmentStartDate,
    classPattern: input.classPattern,
    associationCategory: input.associationCategory,
    ...buildPiiPatch({
      cpf: input.cpf,
      siape: input.siape,
      primaryEmail: input.primaryEmail,
      phone: input.phone,
      whatsapp: input.whatsapp,
      address: input.address,
    }),
  };

  if (input.functionalStatus !== undefined) {
    if (input.functionalStatus !== null && !isFsEnum(input.functionalStatus)) {
      throw new Error('functionalStatus inválido.');
    }
    values.functionalStatus = input.functionalStatus as FsEnum | null;
  }
  if (input.associationStatus !== undefined) {
    if (input.associationStatus === null || !isAsEnum(input.associationStatus)) {
      throw new Error('associationStatus inválido.');
    }
    values.associationStatus = input.associationStatus;
  }
  if (input.contributionStatus !== undefined) {
    if (input.contributionStatus === null || !isCsEnum(input.contributionStatus)) {
      throw new Error('contributionStatus inválido.');
    }
    values.contributionStatus = input.contributionStatus;
  }
  if (input.internalNotes !== undefined) values.internalNotes = input.internalNotes;

  await db.transaction(async (tx) => {
    const current = await findAssociateById(input.id, tx);
    if (!current) {
      throw new Error('Associado não encontrado.');
    }

    const changedFields = getChangedWebhookSafeFields(current, values);

    await updateAssociateById(input.id, values, tx);

    if (changedFields.length === 0) {
      return;
    }

    await emitDomainEvent(
      {
        type: 'associate.updated',
        entityType: 'associate',
        entityId: input.id,
        actorAdminId: input.updatedBy ?? null,
        payload: {
          associateId: input.id,
          changedFields,
          links: {
            app: `/app/associados/${input.id}`,
          },
        },
      },
      tx,
    );
  });
}
