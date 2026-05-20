import type { Role } from './lgpd';
import {
  toAssociateProfileDTO,
  toActivityDTO,
  canViewSensitiveFields,
  maskCpf,
  maskSiape,
} from './lgpd';
import {
  findAssociatesPaginated,
  findAssociateById,
  findLinkedActivities,
  updateAssociateById,
  type UpdateAssociateValues,
} from './repository';
import { db } from '@/lib/db';
import { functionalStatus as fsEnum, associationStatus as asEnum, contributionStatus as csEnum } from '@/lib/db/schema';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { logDataAccess } from '@/lib/audit/service';
import { getAssociateAuditHistory } from '@/lib/audit/queries';
import { getPaymentHistoryForAssociate, type PaymentHistoryItem } from '@/lib/finance/repository';
import { getConsultationsByAssociate } from '@/lib/juridico/repository';
import { formatLongDate, yearsSinceDate } from '@/lib/utils/date';
import { encryptPii, piiBlindIndex, decryptPiiField } from '@/lib/crypto/pii';

type FsEnum = (typeof fsEnum.enumValues)[number];
type AsEnum = (typeof asEnum.enumValues)[number];
type CsEnum = (typeof csEnum.enumValues)[number];

const isFsEnum = (v: string): v is FsEnum => fsEnum.enumValues.includes(v as FsEnum);
const isAsEnum = (v: string): v is AsEnum => asEnum.enumValues.includes(v as AsEnum);
const isCsEnum = (v: string): v is CsEnum => csEnum.enumValues.includes(v as CsEnum);

export { formatLongDate as formatAssociateDate, yearsSinceDate };
export { initialsFromName } from '@/lib/utils/initials';

export interface AssociateLinkedActivity {
  id: number;
  title: string;
  status: string;
  dueDate: string | null;
}

export interface AssociateTimelineItem {
  date: string | Date | null;
  event: string;
  detail: string;
  tone: 'neutral' | 'pos' | 'neg';
}

export interface AssociateProfileViewModel {
  associate: ReturnType<typeof toAssociateProfileDTO>;
  linkedActivities: AssociateLinkedActivity[];
  isAssociationActive: boolean;
  isFunctionalActive: boolean;
  joinedYears: number | null;
  careerYears: number | null;
  location: string | null;
  showSensitive: boolean;
  timeline: AssociateTimelineItem[];
  paymentHistory: PaymentHistoryItem[];
  consultationCount: number;
}

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
) {
  return findAssociatesPaginated(page, pageSize, searchQuery);
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
    cpf: input.cpf,
    cpfCiphertext: input.cpf != null ? encryptPii(input.cpf) : null,
    cpfHash: input.cpf != null ? piiBlindIndex(input.cpf) : null,
    siape: input.siape,
    siapeCiphertext: input.siape != null ? encryptPii(input.siape) : null,
    siapeHash: input.siape != null ? piiBlindIndex(input.siape) : null,
    primaryEmail: input.primaryEmail,
    primaryEmailCiphertext: input.primaryEmail != null ? encryptPii(input.primaryEmail) : null,
    primaryEmailHash: input.primaryEmail != null ? piiBlindIndex(input.primaryEmail) : null,
    secondaryEmail: input.secondaryEmail,
    phone: input.phone,
    phoneCiphertext: input.phone != null ? encryptPii(input.phone) : null,
    phoneHash: input.phone != null ? piiBlindIndex(input.phone) : null,
    whatsapp: input.whatsapp,
    whatsappCiphertext: input.whatsapp != null ? encryptPii(input.whatsapp) : null,
    whatsappHash: input.whatsapp != null ? piiBlindIndex(input.whatsapp) : null,
    birthDate: input.birthDate,
    address: input.address,
    addressCiphertext: input.address != null ? encryptPii(input.address) : null,
    addressHash: input.address != null ? piiBlindIndex(input.address) : null,
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

function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    associate_updated: 'Cadastro atualizado',
    associate_created: 'Cadastro criado',
    data_view: 'Dados visualizados',
    data_export: 'Dados exportados',
    data_edit: 'Dados editados',
  };
  return labels[action] ?? action;
}

function paymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pago: 'Pago',
    pendente: 'Pendente',
    atrasado: 'Atrasado',
    isento: 'Isento',
  };
  return labels[status] ?? status;
}

function consultationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    aberta: 'Aberta',
    em_analise: 'Em análise',
    aguardando_escritorio: 'Aguardando escritório',
    respondida: 'Respondida',
    arquivada: 'Arquivada',
  };
  return labels[status] ?? status;
}

export async function getAssociateProfile(
  associateId: number,
  role: Role,
): Promise<AssociateProfileViewModel | null> {
  const rawAssociate = await findAssociateById(associateId);
  if (!rawAssociate) return null;

  const associate = toAssociateProfileDTO(rawAssociate, role);

  const [linkedActivities, auditHistory, paymentHistory, consultations] = await Promise.all([
    findLinkedActivities(associate.id),
    getAssociateAuditHistory(associateId),
    getPaymentHistoryForAssociate(associateId),
    getConsultationsByAssociate(associateId),
  ]);

  const location =
    [associate.locationCity, associate.locationCountry].filter(Boolean).join(' / ') || null;

  const hardcodedEvents: AssociateTimelineItem[] = [
    {
      date: associate.updatedAt,
      event: 'Última atualização cadastral',
      detail: 'Registro sincronizado na base da intranet.',
      tone: 'neutral',
    },
    {
      date: associate.joinedAt,
      event: 'Adesão à ASOF',
      detail: associate.associationCategory ?? 'Categoria não informada.',
      tone: 'pos',
    },
    {
      date: associate.assignmentStartDate,
      event: 'Lotação registrada',
      detail: associate.assignment ?? 'Lotação não informada.',
      tone: 'neutral',
    },
  ];

  const auditEvents: AssociateTimelineItem[] = auditHistory.map((entry) => {
    const changedKeys =
      entry.changes && typeof entry.changes === 'object' && 'new' in entry.changes
        ? Object.keys((entry.changes as { new: Record<string, unknown> }).new)
        : [];
    const detail =
      changedKeys.length > 0
        ? `Campos alterados: ${changedKeys.join(', ')}`
        : 'Atualização registrada.';
    return {
      date: entry.createdAt,
      event: auditActionLabel(entry.action),
      detail,
      tone: 'neutral' as const,
    };
  });

  const paymentEvents: AssociateTimelineItem[] = paymentHistory.map((payment) => {
    const mm = payment.month.toString().padStart(2, '0');
    const tone =
      payment.status === 'pago' ? 'pos' : payment.status === 'atrasado' ? 'neg' : 'neutral';
    return {
      date: payment.paidAt ?? payment.updatedAt,
      event: `Mensalidade ${mm}/${payment.year}`,
      detail: paymentStatusLabel(payment.status),
      tone: tone as AssociateTimelineItem['tone'],
    };
  });

  const consultationEvents: AssociateTimelineItem[] = consultations.map((c) => {
    return {
      date: c.lastInteractionAt ?? c.createdAt,
      event: `Consulta ${c.internalNumber}`,
      detail: `${c.title} — ${consultationStatusLabel(c.status)}`,
      tone: c.status === 'respondida' ? 'pos' : ('neutral' as const),
    };
  });

  const allEvents = [
    ...hardcodedEvents,
    ...auditEvents,
    ...paymentEvents,
    ...consultationEvents,
  ].filter((item) => item.date != null);

  allEvents.sort((a, b) => {
    const da = new Date(a.date as string | Date).getTime();
    const db_ = new Date(b.date as string | Date).getTime();
    return db_ - da;
  });

  const timeline = allEvents.slice(0, 30);

  return {
    associate,
    linkedActivities: linkedActivities.map((activity) => toActivityDTO(activity, role)),
    isAssociationActive: associate.associationStatus === 'ativo',
    isFunctionalActive: associate.functionalStatus === 'ativo',
    joinedYears: yearsSinceDate(associate.joinedAt),
    careerYears: yearsSinceDate(associate.assignmentStartDate),
    location,
    showSensitive: canViewSensitiveFields(role),
    timeline,
    paymentHistory,
    consultationCount: consultations.length,
  };
}
