import type { Role } from './lgpd';
import { canViewSensitiveFields } from './lgpd';
import {
  findAssociatesPaginated,
  findAssociateById,
  updateAssociateById,
  insertAssociate,
  createDependentsBatch,
  findAssociateByCpfHash,
  findAssociateBySiapeHash,
  findAssociateByPrimaryEmailHash,
  createDependent,
  updateDependentById,
  deleteDependentById,
  createHealthAgreement,
  updateHealthAgreementById,
  deleteHealthAgreementById,
  type UpdateAssociateValues,
  type AssociatesFilters,
  type CreateDependentInput,
  type UpdateDependentInput,
  type CreateHealthAgreementInput,
  type UpdateHealthAgreementInput,
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
import { logAuditAction, logDataAccess } from '@/lib/audit/service';
import { buildPiiPatch, decryptAssociatePii } from './pii-mapping';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { emptyToNull } from '@/lib/utils/strings';
import { toJoinedAtTimestamp } from './form-helpers';
import { createLogger } from '@/lib/logger';

const logger = createLogger('associates:service');

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

interface AssociateFields {
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
  retirementDate: string | null;
  cancellationDate: string | null;
  leaveDate: string | null;
  joinedAt: string | null;
  ceocMember: boolean | null;
  caocMember: boolean | null;
  numberOfDependents: number | null;
  internalNotes: string | null;
}

export interface EditAssociateDTO extends AssociateFields {
  id: number;
  canEditInternalNotes: boolean;
}

export function getAssociateStatusLabel(value: string | null) {
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    aposentado: 'Aposentado',
    cedido: 'Cedido',
    em_licenca: 'Em licença',
    associado: 'Associado',
    nao_associado: 'Não associado',
    em_dia: 'Em dia',
    inadimplente: 'Inadimplente',
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

function mapRowToEditDTO(
  row: NonNullable<Awaited<ReturnType<typeof findAssociateById>>>,
  decrypted: ReturnType<typeof decryptAssociatePii>,
  role: Role,
): EditAssociateDTO {
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
    retirementDate: row.retirementDate,
    cancellationDate: row.cancellationDate,
    leaveDate: row.leaveDate,
    joinedAt: row.joinedAt,
    ceocMember: row.ceocMember,
    caocMember: row.caocMember,
    numberOfDependents: row.numberOfDependents,
    internalNotes: row.internalNotes,
    canEditInternalNotes: role === 'admin',
  };
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

  return mapRowToEditDTO(row, decrypted, role);
}

export type UpdateAssociateInput = Partial<AssociateFields> & {
  id: number;
  fullName: string;
};

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
      values[field] !== undefined &&
      normalizeComparableValue(current[field]) !== normalizeComparableValue(values[field]),
  );
}

const PII_AUDIT_FIELDS = [
  'cpf',
  'rg',
  'siape',
  'primaryEmail',
  'phone',
  'whatsapp',
  'address',
] as const;

const PII_STORAGE_FIELDS = new Set<string>([
  ...PII_AUDIT_FIELDS,
  ...PII_AUDIT_FIELDS.flatMap((field) => [`${field}Ciphertext`, `${field}Hash`]),
]);

function normalizePiiComparableValue(value: string | null | undefined) {
  return value === undefined || value === null || value.trim() === '' ? null : value;
}

function getChangedAuditFields(
  current: NonNullable<Awaited<ReturnType<typeof findAssociateById>>>,
  values: UpdateAssociateValues,
  input: UpdateAssociateInput,
) {
  const changedFields = new Set<string>();

  for (const [field, value] of Object.entries(values)) {
    if (value === undefined || PII_STORAGE_FIELDS.has(field)) continue;
    const currentValue = current[field as keyof typeof current];
    if (normalizeComparableValue(currentValue) !== normalizeComparableValue(value)) {
      changedFields.add(field);
    }
  }

  const suppliedPiiFields = PII_AUDIT_FIELDS.filter(
    (field) => Object.prototype.hasOwnProperty.call(input, field) && input[field] !== undefined,
  );
  if (suppliedPiiFields.length === 0) return [...changedFields];

  try {
    const decrypted = decryptAssociatePii(current);
    for (const field of suppliedPiiFields) {
      if (
        normalizePiiComparableValue(decrypted[field]) !==
        normalizePiiComparableValue(input[field] as string | null | undefined)
      ) {
        changedFields.add(field);
      }
    }
  } catch {
    // Audit comparison is best-effort: when legacy PII cannot be decrypted, record only
    // the canonical fields supplied by the caller and let the mutation proceed.
    for (const field of suppliedPiiFields) {
      changedFields.add(field);
    }
  }

  return [...changedFields];
}

type AssociateAuditArgs = Parameters<typeof logAuditAction>[0];

async function logAssociateAuditBestEffort(auditArgs: AssociateAuditArgs) {
  try {
    await logAuditAction(auditArgs);
  } catch {
    logger.warn('Audit log failed after committed associate mutation', {
      action: auditArgs.action,
      entityType: auditArgs.entityType,
      entityId: auditArgs.entityId,
    });
  }
}

export async function updateAssociateData(input: UpdateAssociateInput, actorId: number) {
  if (!Number.isInteger(actorId) || actorId <= 0) {
    throw new ValidationError('Ator inválido.');
  }

  // Normalização canônica de datas de domínio: só aqui (não no action).
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
    retirementDate: input.retirementDate,
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

  if (input.leaveDate !== undefined) {
    values.leaveDate = emptyToNull(input.leaveDate);
  }
  if (input.joinedAt !== undefined) {
    values.joinedAt = toJoinedAtTimestamp(input.joinedAt);
  }
  if (input.numberOfDependents !== undefined) {
    values.numberOfDependents = input.numberOfDependents;
  }

  if (input.functionalStatus !== undefined) {
    if (input.functionalStatus !== null && !isFsEnum(input.functionalStatus)) {
      throw new ValidationError('Situação funcional inválida.');
    }
    values.functionalStatus = input.functionalStatus as FsEnum | null;
  }
  if (input.associationStatus !== undefined) {
    if (input.associationStatus === null || !isAsEnum(input.associationStatus)) {
      throw new ValidationError('Vínculo ASOF inválido.');
    }
    values.associationStatus = input.associationStatus;
  }
  if (input.contributionStatus !== undefined) {
    if (input.contributionStatus === null || !isCsEnum(input.contributionStatus)) {
      throw new ValidationError('Status de contribuição inválido.');
    }
    values.contributionStatus = input.contributionStatus;
  }
  if (input.sex !== undefined) {
    if (input.sex !== null && !isSexEnum(input.sex)) {
      throw new ValidationError('Sexo inválido.');
    }
    values.sex = input.sex as SexEnum | null;
  }
  if (input.maritalStatus !== undefined) {
    if (input.maritalStatus !== null && !isMsEnum(input.maritalStatus)) {
      throw new ValidationError('Estado civil inválido.');
    }
    values.maritalStatus = input.maritalStatus as MsEnum | null;
  }
  if (input.missionType !== undefined) {
    if (input.missionType !== null && !isMtEnum(input.missionType)) {
      throw new ValidationError('Tipo de missão inválido.');
    }
    values.missionType = input.missionType as MtEnum | null;
  }
  if (input.careerOrigin !== undefined) {
    if (input.careerOrigin !== null && !isCoEnum(input.careerOrigin)) {
      throw new ValidationError('Origem de carreira inválida.');
    }
    values.careerOrigin = input.careerOrigin as CoEnum | null;
  }
  if (input.paymentMethod !== undefined) {
    if (input.paymentMethod === null) {
      // Column is NOT NULL with default 'folha' — skip update to preserve existing value
    } else if (!isPmEnum(input.paymentMethod)) {
      throw new ValidationError('Método de pagamento inválido.');
    } else {
      values.paymentMethod = input.paymentMethod;
    }
  }
  if (input.internalNotes !== undefined) values.internalNotes = input.internalNotes;

  const auditArgs = await db.transaction(async (tx) => {
    const current = await findAssociateById(input.id, tx);
    if (!current) {
      throw new NotFoundError('Associado');
    }

    const changedFields = getChangedWebhookSafeFields(current, values);
    const auditChangedFields = getChangedAuditFields(current, values, input);

    await updateAssociateById(input.id, values, tx);

    if (changedFields.length > 0) {
      await emitDomainEvent(
        {
          type: 'associate.updated',
          entityType: 'associate',
          entityId: input.id,
          actorAdminId: actorId,
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
    }

    return auditChangedFields.length > 0
      ? {
          adminId: actorId,
          action: 'associate_updated',
          entityType: 'associate' as const,
          entityId: input.id,
          metadata: { changedFields: auditChangedFields },
        }
      : null;
  });

  if (auditArgs) {
    await logAssociateAuditBestEffort(auditArgs);
  }
}

function assertPositiveInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${field} inválido.`);
  }
}

export async function createAssociateDependent(input: CreateDependentInput, actorId: number) {
  assertPositiveInteger(input.associateId, 'Associado');
  assertPositiveInteger(actorId, 'Ator');
  const result = await createDependent(input);
  await logAssociateAuditBestEffort({
    adminId: actorId,
    action: 'associate_dependent_created',
    entityType: 'associate',
    entityId: input.associateId,
    metadata: { dependentId: result.id },
  });
  return result;
}

export async function updateAssociateDependent(
  id: number,
  values: UpdateDependentInput,
  associateId: number,
  actorId: number,
) {
  assertPositiveInteger(id, 'Dependente');
  assertPositiveInteger(associateId, 'Associado');
  assertPositiveInteger(actorId, 'Ator');
  await updateDependentById(id, values, associateId);
  await logAssociateAuditBestEffort({
    adminId: actorId,
    action: 'associate_dependent_updated',
    entityType: 'associate',
    entityId: associateId,
    metadata: { dependentId: id },
  });
}

export async function deleteAssociateDependent(id: number, associateId: number, actorId: number) {
  assertPositiveInteger(id, 'Dependente');
  assertPositiveInteger(associateId, 'Associado');
  assertPositiveInteger(actorId, 'Ator');
  await deleteDependentById(id, associateId);
  await logAssociateAuditBestEffort({
    adminId: actorId,
    action: 'associate_dependent_deleted',
    entityType: 'associate',
    entityId: associateId,
    metadata: { dependentId: id },
  });
}

export async function createAssociateHealthAgreement(
  input: CreateHealthAgreementInput,
  actorId: number,
) {
  assertPositiveInteger(input.associateId, 'Associado');
  assertPositiveInteger(actorId, 'Ator');
  const result = await createHealthAgreement(input);
  await logAssociateAuditBestEffort({
    adminId: actorId,
    action: 'associate_health_agreement_created',
    entityType: 'associate',
    entityId: input.associateId,
    metadata: { healthAgreementId: result.id },
  });
  return result;
}

export async function updateAssociateHealthAgreement(
  id: number,
  values: UpdateHealthAgreementInput,
  associateId: number,
  actorId: number,
) {
  assertPositiveInteger(id, 'Convênio');
  assertPositiveInteger(associateId, 'Associado');
  assertPositiveInteger(actorId, 'Ator');
  await updateHealthAgreementById(id, values, associateId);
  await logAssociateAuditBestEffort({
    adminId: actorId,
    action: 'associate_health_agreement_updated',
    entityType: 'associate',
    entityId: associateId,
    metadata: { healthAgreementId: id },
  });
}

export async function deleteAssociateHealthAgreement(
  id: number,
  associateId: number,
  actorId: number,
) {
  assertPositiveInteger(id, 'Convênio');
  assertPositiveInteger(associateId, 'Associado');
  assertPositiveInteger(actorId, 'Ator');
  await deleteHealthAgreementById(id, associateId);
  await logAssociateAuditBestEffort({
    adminId: actorId,
    action: 'associate_health_agreement_deleted',
    entityType: 'associate',
    entityId: associateId,
    metadata: { healthAgreementId: id },
  });
}

export type CreateAssociateDependentInput = {
  name: string;
  relationship: string;
};

export type CreateAssociateInput = Partial<AssociateFields> & {
  fullName: string;
  createdBy?: number | null;
  /** Dependentes criados atomicamente com o oficial. */
  dependents?: CreateAssociateDependentInput[];
};

/**
 * Cria um novo associado criptografando PII, validando unicidade por blind
 * index (CPF/SIAPE/e-mail principal), aplicando defaults de status e
 * registrando auditoria. Não emite domain event — `associate.created` aguarda
 * adição ao enum `domain_event_type` (migration) para não onerar o pré-go-live.
 */
export async function createAssociateData(input: CreateAssociateInput): Promise<{ id: number }> {
  const functionalStatus = emptyToNull(input.functionalStatus);
  const sex = emptyToNull(input.sex);
  const maritalStatus = emptyToNull(input.maritalStatus);
  const missionType = emptyToNull(input.missionType);
  const careerOrigin = emptyToNull(input.careerOrigin);
  const paymentMethodRaw = emptyToNull(input.paymentMethod);
  const associationStatus = input.associationStatus ?? 'nao_associado';
  const contributionStatus = input.contributionStatus ?? 'inadimplente';

  if (functionalStatus !== null && !isFsEnum(functionalStatus)) {
    throw new ValidationError('Situação funcional inválida.');
  }
  if (!isAsEnum(associationStatus)) {
    throw new ValidationError('Vínculo ASOF inválido.');
  }
  if (!isCsEnum(contributionStatus)) {
    throw new ValidationError('Status de contribuição inválido.');
  }
  if (sex !== null && !isSexEnum(sex)) {
    throw new ValidationError('Sexo inválido.');
  }
  if (maritalStatus !== null && !isMsEnum(maritalStatus)) {
    throw new ValidationError('Estado civil inválido.');
  }
  if (missionType !== null && !isMtEnum(missionType)) {
    throw new ValidationError('Tipo de missão inválido.');
  }
  if (careerOrigin !== null && !isCoEnum(careerOrigin)) {
    throw new ValidationError('Origem de carreira inválida.');
  }
  if (paymentMethodRaw !== null && !isPmEnum(paymentMethodRaw)) {
    throw new ValidationError('Método de pagamento inválido.');
  }

  // emptyToNull: forms send blank inputs as ''; hashing '' would collide across creates.
  const piiPatch = buildPiiPatch({
    cpf: emptyToNull(input.cpf ?? null),
    rg: emptyToNull(input.rg ?? null),
    siape: emptyToNull(input.siape ?? null),
    primaryEmail: emptyToNull(input.primaryEmail ?? null),
    phone: emptyToNull(input.phone ?? null),
    whatsapp: emptyToNull(input.whatsapp ?? null),
    address: emptyToNull(input.address ?? null),
  });

  const id = await db.transaction(async (tx) => {
    // Unicidade por blind index (PII criptografada não permite busca por texto)
    if (piiPatch.cpfHash) {
      const dup = await findAssociateByCpfHash(piiPatch.cpfHash, tx);
      if (dup) throw new ValidationError('Já existe um oficial cadastrado com este CPF.');
    }
    if (piiPatch.siapeHash) {
      const dup = await findAssociateBySiapeHash(piiPatch.siapeHash, tx);
      if (dup) throw new ValidationError('Já existe um oficial cadastrado com este SIAPE.');
    }
    if (piiPatch.primaryEmailHash) {
      const dup = await findAssociateByPrimaryEmailHash(piiPatch.primaryEmailHash, tx);
      if (dup) {
        throw new ValidationError('Já existe um oficial cadastrado com este e-mail principal.');
      }
    }

    const dependents = (input.dependents ?? [])
      .map((d) => ({
        name: d.name.trim(),
        relationship: d.relationship.trim(),
      }))
      .filter((d) => d.name.length > 0 && d.relationship.length > 0);

    const values: UpdateAssociateValues = {
      fullName: input.fullName,
      secondaryEmail: emptyToNull(input.secondaryEmail),
      birthDate: emptyToNull(input.birthDate),
      birthCity: emptyToNull(input.birthCity),
      birthState: emptyToNull(input.birthState),
      neighborhood: emptyToNull(input.neighborhood),
      addressState: emptyToNull(input.addressState),
      zipCode: emptyToNull(input.zipCode),
      locationCity: emptyToNull(input.locationCity),
      locationCountry: emptyToNull(input.locationCountry),
      assignment: emptyToNull(input.assignment),
      assignmentStartDate: emptyToNull(input.assignmentStartDate),
      classPattern: emptyToNull(input.classPattern),
      associationCategory: emptyToNull(input.associationCategory),
      rgIssuer: emptyToNull(input.rgIssuer),
      rgState: emptyToNull(input.rgState),
      rgExpeditionDate: emptyToNull(input.rgExpeditionDate),
      admissionDate: emptyToNull(input.admissionDate),
      inaugurationDate: emptyToNull(input.inaugurationDate),
      retirementDate: emptyToNull(input.retirementDate),
      cancellationDate: emptyToNull(input.cancellationDate),
      leaveDate: emptyToNull(input.leaveDate),
      joinedAt: toJoinedAtTimestamp(input.joinedAt),
      ceocMember: input.ceocMember ?? null,
      caocMember: input.caocMember ?? null,
      numberOfDependents:
        dependents.length > 0 ? dependents.length : (input.numberOfDependents ?? null),
      ...piiPatch,
      functionalStatus: functionalStatus as FsEnum | null,
      associationStatus: associationStatus as AsEnum,
      contributionStatus: contributionStatus as CsEnum,
      paymentMethod: (paymentMethodRaw ?? 'folha') as PmEnum,
      sex: sex as SexEnum | null,
      maritalStatus: maritalStatus as MsEnum | null,
      missionType: missionType as MtEnum | null,
      careerOrigin: careerOrigin as CoEnum | null,
      internalNotes: input.internalNotes ?? null,
    };

    const id = await insertAssociate(values, tx);
    await createDependentsBatch(id, dependents, tx);

    return id;
  });

  // Best-effort audit AFTER the tx commits. A failed audit INSERT must not abort the
  // mutation's tx (the audit executor poisons PG tx on failure). Default `db` isolates the audit.
  try {
    await logAuditAction({
      adminId: input.createdBy ?? null,
      action: 'create',
      entityType: 'associate',
      entityId: id,
      metadata: { source: 'manual_create' },
    });
  } catch {
    // logAuditAction logs internally; swallow to protect the committed mutation.
  }

  return { id };
}
