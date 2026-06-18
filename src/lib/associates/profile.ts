import type { Role } from './lgpd';
import { toAssociateProfileDTO, toActivityDTO, canViewSensitiveFields } from './lgpd';
import { findAssociateById, findLinkedActivities, findDependentsByAssociateId, findHealthAgreementsByAssociateId } from './repository';
import { getAssociateAuditHistory } from '@/lib/audit/queries';
import { getPaymentHistoryForAssociate, type PaymentHistoryItem } from '@/lib/finance/repository';
import { getConsultationsByAssociate } from '@/lib/juridico/repository';
import { formatLongDate, yearsSinceDate } from '@/lib/utils/date';

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

export interface DependentViewItem {
  id: number;
  name: string;
  relationship: string;
}

export interface HealthAgreementViewItem {
  id: number;
  provider: string;
  startDate: string | null;
  endDate: string | null;
}

export interface AssociateProfileViewModel {
  associate: ReturnType<typeof toAssociateProfileDTO>;
  linkedActivities: AssociateLinkedActivity[];
  dependents: DependentViewItem[];
  healthAgreements: HealthAgreementViewItem[];
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

  const [linkedActivities, auditHistory, paymentHistory, consultations, dependents, healthAgreements] = await Promise.all([
    findLinkedActivities(associate.id),
    getAssociateAuditHistory(associateId),
    getPaymentHistoryForAssociate(associateId),
    getConsultationsByAssociate(associateId),
    findDependentsByAssociateId(associateId),
    findHealthAgreementsByAssociateId(associateId),
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
    dependents,
    healthAgreements,
    isAssociationActive: associate.associationStatus === 'associado',
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
