export const LEGAL_CONSULTATION_STATUSES = [
  'aberta',
  'aguardando_escritorio',
  'respondida',
  'arquivada',
] as const;

export type LegalConsultationStatus = (typeof LEGAL_CONSULTATION_STATUSES)[number];

export const LEGAL_CONSULTATION_STATUS_LABELS: Record<LegalConsultationStatus, string> = {
  aberta: 'Aberta',
  aguardando_escritorio: 'Aguardando escritório',
  respondida: 'Respondida',
  arquivada: 'Arquivada',
};

export const LEGAL_CONSULTATION_STATUS_OPTIONS = [
  { value: 'aberta', label: LEGAL_CONSULTATION_STATUS_LABELS.aberta },
  {
    value: 'aguardando_escritorio',
    label: LEGAL_CONSULTATION_STATUS_LABELS.aguardando_escritorio,
  },
  { value: 'respondida', label: LEGAL_CONSULTATION_STATUS_LABELS.respondida },
  { value: 'arquivada', label: LEGAL_CONSULTATION_STATUS_LABELS.arquivada },
] as const satisfies readonly { value: LegalConsultationStatus; label: string }[];

export const LEGAL_CONSULTATION_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'aberta', label: LEGAL_CONSULTATION_STATUS_LABELS.aberta },
  {
    value: 'aguardando_escritorio',
    label: LEGAL_CONSULTATION_STATUS_LABELS.aguardando_escritorio,
  },
  { value: 'respondida', label: LEGAL_CONSULTATION_STATUS_LABELS.respondida },
  { value: 'arquivada', label: LEGAL_CONSULTATION_STATUS_LABELS.arquivada },
] as const satisfies readonly { value: LegalConsultationStatus | ''; label: string }[];

export function isLegalConsultationStatus(value: string): value is LegalConsultationStatus {
  return LEGAL_CONSULTATION_STATUSES.includes(value as LegalConsultationStatus);
}

export function getLegalConsultationStatusLabel(value: string): string {
  if (isLegalConsultationStatus(value)) {
    return LEGAL_CONSULTATION_STATUS_LABELS[value];
  }
  return value;
}

export function getLegalConsultationStatusBadgeClass(status: string): string {
  if (status === 'aberta') {
    return 'bg-slate-50 text-slate-600 border border-slate-100';
  }
  if (status === 'aguardando_escritorio') {
    return 'bg-amber-100 text-amber-700';
  }
  if (status === 'respondida') {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (status === 'arquivada') {
    return 'bg-slate-50 text-slate-600 border border-slate-100';
  }
  return 'bg-slate-50 text-slate-600 border border-slate-100';
}
