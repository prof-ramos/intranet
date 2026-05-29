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
import { encryptPii, piiBlindIndex, decryptPiiField } from '@/lib/crypto/pii';

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

  const cpf = canViewSensitiveFields(role)
    ? decryptPiiField(row.cpfCiphertext, row.cpf)
    : maskCpf(decryptPiiField(row.cpfCiphertext, row.cpf));
  const siape = canViewSensitiveFields(role)
    ? decryptPiiField(row.siapeCiphertext, row.siape)
    : maskSiape(decryptPiiField(row.siapeCiphertext, row.siape));
  const primaryEmail = decryptPiiField(row.primaryEmailCiphertext, row.primaryEmail);
  const phone = decryptPiiField(row.phoneCiphertext, row.phone);
  const address = decryptPiiField(row.addressCiphertext, row.address);
  const whatsapp = decryptPiiField(row.whatsappCiphertext, row.whatsapp);

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
    primaryEmail,
    secondaryEmail: row.secondaryEmail,
    phone,
    whatsapp,
    birthDate: row.birthDate,
    address,
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
    // F-008: Do not write plaintext PII columns. Only write ciphertext + hash.
    // decryptPiiField() retains a fallback to plaintext for rows not yet backfilled.
    cpf: input.cpf !== undefined ? null : undefined,
    cpfCiphertext:
      input.cpf != null ? encryptPii(input.cpf) : input.cpf === null ? null : undefined,
    cpfHash: input.cpf != null ? piiBlindIndex(input.cpf) : input.cpf === null ? null : undefined,
    siape: input.siape !== undefined ? null : undefined,
    siapeCiphertext:
      input.siape != null ? encryptPii(input.siape) : input.siape === null ? null : undefined,
    siapeHash:
      input.siape != null ? piiBlindIndex(input.siape) : input.siape === null ? null : undefined,
    primaryEmail: input.primaryEmail !== undefined ? null : undefined,
    primaryEmailCiphertext:
      input.primaryEmail != null
        ? encryptPii(input.primaryEmail)
        : input.primaryEmail === null
          ? null
          : undefined,
    primaryEmailHash:
      input.primaryEmail != null
        ? piiBlindIndex(input.primaryEmail)
        : input.primaryEmail === null
          ? null
          : undefined,
    secondaryEmail: input.secondaryEmail,
    phone: input.phone !== undefined ? null : undefined,
    phoneCiphertext:
      input.phone != null ? encryptPii(input.phone) : input.phone === null ? null : undefined,
    phoneHash:
      input.phone != null ? piiBlindIndex(input.phone) : input.phone === null ? null : undefined,
    whatsapp: input.whatsapp !== undefined ? null : undefined,
    whatsappCiphertext:
      input.whatsapp != null
        ? encryptPii(input.whatsapp)
        : input.whatsapp === null
          ? null
          : undefined,
    whatsappHash:
      input.whatsapp != null
        ? piiBlindIndex(input.whatsapp)
        : input.whatsapp === null
          ? null
          : undefined,
    birthDate: input.birthDate,
    address: input.address !== undefined ? null : undefined,
    addressCiphertext:
      input.address != null ? encryptPii(input.address) : input.address === null ? null : undefined,
    addressHash:
      input.address != null
        ? piiBlindIndex(input.address)
        : input.address === null
          ? null
          : undefined,
    locationCity: input.locationCity,
    locationCountry: input.locationCountry,
    assignment: input.assignment,
    assignmentStartDate: input.assignmentStartDate,
    classPattern: input.classPattern,
    associationCategory: input.associationCategory,
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
