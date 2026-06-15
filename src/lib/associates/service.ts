import type { Role } from './lgpd';
import { canViewSensitiveFields } from './lgpd';
import {
  findAssociatesPaginated,
  findAssociateById,
  updateAssociateById,
  type UpdateAssociateValues,
  type AssociatesFilters,
} from './repository';
import { type AssociateSearchMode } from './search-params';
import { db } from '@/lib/db';
import {
  functionalStatus as fsEnum,
  associationStatus as asEnum,
  contributionStatus as csEnum,
  sex as sexEnum,
  maritalStatus as msEnum,
  missionType as mtEnum,
  careerOrigin as coEnum,
  paymentMethod as pmEnum,
} from '@/lib/db/schema';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { logDataAccess } from '@/lib/audit/service';
import { buildPiiPatch, decryptAssociatePii } from './pii-mapping';

type FsEnum = (typeof fsEnum.enumValues)[number];
type AsEnum = (typeof asEnum.enumValues)[number];
type CsEnum = (typeof csEnum.enumValues)[number];
type SexEnum = (typeof sexEnum.enumValues)[number];
type MsEnum = (typeof msEnum.enumValues)[number];
type MtEnum = (typeof mtEnum.enumValues)[number];
type CoEnum = (typeof coEnum.enumValues)[number];
type PmEnum = (typeof pmEnum.enumValues)[number];

const isFsEnum = (v: string): v is FsEnum => fsEnum.enumValues.includes(v as FsEnum);
const isAsEnum = (v: string): v is AsEnum => asEnum.enumValues.includes(v as AsEnum);
const isCsEnum = (v: string): v is CsEnum => csEnum.enumValues.includes(v as CsEnum);
const isSexEnum = (v: string): v is SexEnum => sexEnum.enumValues.includes(v as SexEnum);
const isMsEnum = (v: string): v is MsEnum => msEnum.enumValues.includes(v as MsEnum);
const isMtEnum = (v: string): v is MtEnum => mtEnum.enumValues.includes(v as MtEnum);
const isCoEnum = (v: string): v is CoEnum => coEnum.enumValues.includes(v as CoEnum);
const isPmEnum = (v: string): v is PmEnum => pmEnum.enumValues.includes(v as PmEnum);

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
  rg: string | null;
  rgIssuer: string | null;
  rgState: string | null;
  rgExpeditionDate: string | null;
  siape: string | null;
  sex: string | null;
  maritalStatus: string | null;
  birthDate: string | null;
  birthCity: string | null;
  birthState: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  neighborhood: string | null;
  addressState: string | null;
  zipCode: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  assignment: string | null;
  assignmentStartDate: string | null;
  classPattern: string | null;
  associationCategory: string | null;
  functionalStatus: string | null;
  associationStatus: string;
  contributionStatus: string;
  paymentMethod: string;
  missionType: string | null;
  careerOrigin: string | null;
  admissionDate: string | null;
  inaugurationDate: string | null;
  cancellationDate: string | null;
  ceocMember: boolean | null;
  caocMember: boolean | null;
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
  searchBy?: AssociateSearchMode,
) {
  return findAssociatesPaginated(page, pageSize, searchQuery, filters, searchBy);
}

export async function getAssociateForEdit(
  id: number,
  role: Role,
  adminId: number,
): Promise<EditAssociateDTO | null> {
  const row = await findAssociateById(id);
  if (!row) return null;

  const decrypted = decryptAssociatePii(row);

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
    cpf: decrypted.cpf,
    rg: decrypted.rg,
    rgIssuer: row.rgIssuer,
    rgState: row.rgState,
    rgExpeditionDate: row.rgExpeditionDate,
    siape: decrypted.siape,
    sex: row.sex,
    maritalStatus: row.maritalStatus,
    birthDate: row.birthDate,
    birthCity: row.birthCity,
    birthState: row.birthState,
    primaryEmail: decrypted.primaryEmail,
    secondaryEmail: row.secondaryEmail,
    phone: decrypted.phone,
    whatsapp: decrypted.whatsapp,
    address: decrypted.address,
    neighborhood: row.neighborhood,
    addressState: row.addressState,
    zipCode: row.zipCode,
    locationCity: row.locationCity,
    locationCountry: row.locationCountry,
    assignment: row.assignment,
    assignmentStartDate: row.assignmentStartDate,
    classPattern: row.classPattern,
    associationCategory: row.associationCategory,
    functionalStatus: row.functionalStatus,
    associationStatus: row.associationStatus,
    contributionStatus: row.contributionStatus,
    paymentMethod: row.paymentMethod,
    missionType: row.missionType,
    careerOrigin: row.careerOrigin,
    admissionDate: row.admissionDate,
    inaugurationDate: row.inaugurationDate,
    cancellationDate: row.cancellationDate,
    ceocMember: row.ceocMember,
    caocMember: row.caocMember,
    internalNotes: row.internalNotes,
    canEditInternalNotes: role === 'admin',
  };
}

export interface UpdateAssociateInput {
  id: number;
  fullName: string;
  cpf?: string | null;
  rg?: string | null;
  rgIssuer?: string | null;
  rgState?: string | null;
  rgExpeditionDate?: string | null;
  siape?: string | null;
  sex?: string | null;
  maritalStatus?: string | null;
  birthDate?: string | null;
  birthCity?: string | null;
  birthState?: string | null;
  primaryEmail?: string | null;
  secondaryEmail?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  addressState?: string | null;
  zipCode?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  assignment?: string | null;
  assignmentStartDate?: string | null;
  classPattern?: string | null;
  associationCategory?: string | null;
  functionalStatus?: string | null;
  associationStatus?: string | null;
  contributionStatus?: string | null;
  paymentMethod?: string | null;
  missionType?: string | null;
  careerOrigin?: string | null;
  admissionDate?: string | null;
  inaugurationDate?: string | null;
  cancellationDate?: string | null;
  ceocMember?: boolean | null;
  caocMember?: boolean | null;
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
  'paymentMethod',
  'missionType',
  'careerOrigin',
  'ceocMember',
  'caocMember',
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
    birthCity: input.birthCity,
    birthState: input.birthState,
    neighborhood: input.neighborhood,
    addressState: input.addressState,
    zipCode: input.zipCode,
    locationCity: input.locationCity,
    locationCountry: input.locationCountry,
    assignment: input.assignment,
    assignmentStartDate: input.assignmentStartDate,
    classPattern: input.classPattern,
    associationCategory: input.associationCategory,
    rgIssuer: input.rgIssuer,
    rgState: input.rgState,
    rgExpeditionDate: input.rgExpeditionDate,
    admissionDate: input.admissionDate,
    inaugurationDate: input.inaugurationDate,
    cancellationDate: input.cancellationDate,
    ceocMember: input.ceocMember,
    caocMember: input.caocMember,
    ...buildPiiPatch({
      cpf: input.cpf,
      rg: input.rg,
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
  if (input.sex !== undefined) {
    if (input.sex !== null && !isSexEnum(input.sex)) {
      throw new Error('sex inválido.');
    }
    values.sex = input.sex as SexEnum | null;
  }
  if (input.maritalStatus !== undefined) {
    if (input.maritalStatus !== null && !isMsEnum(input.maritalStatus)) {
      throw new Error('maritalStatus inválido.');
    }
    values.maritalStatus = input.maritalStatus as MsEnum | null;
  }
  if (input.missionType !== undefined) {
    if (input.missionType !== null && !isMtEnum(input.missionType)) {
      throw new Error('missionType inválido.');
    }
    values.missionType = input.missionType as MtEnum | null;
  }
  if (input.careerOrigin !== undefined) {
    if (input.careerOrigin !== null && !isCoEnum(input.careerOrigin)) {
      throw new Error('careerOrigin inválido.');
    }
    values.careerOrigin = input.careerOrigin as CoEnum | null;
  }
  if (input.paymentMethod !== undefined) {
    if (input.paymentMethod === null) {
      // Column is NOT NULL with default 'folha' — skip update to preserve existing value
    } else if (!isPmEnum(input.paymentMethod)) {
      throw new Error('paymentMethod inválido.');
    } else {
      values.paymentMethod = input.paymentMethod;
    }
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
