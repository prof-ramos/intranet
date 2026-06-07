import { createEnumMetadata } from '@/lib/ui/create-enum-metadata';

export const LEGAL_CONSULTATION_STATUSES = [
  'aberta',
  'aguardando_escritorio',
  'respondida',
  'arquivada',
] as const;

export type LegalConsultationStatus = (typeof LEGAL_CONSULTATION_STATUSES)[number];

const meta = createEnumMetadata({
  values: LEGAL_CONSULTATION_STATUSES,
  labels: {
    aberta: 'Aberta',
    aguardando_escritorio: 'Aguardando escritório',
    respondida: 'Respondida',
    arquivada: 'Arquivada',
  },
  badges: {
    aberta: 'bg-slate-50 text-slate-600 border border-slate-100',
    aguardando_escritorio: 'bg-amber-100 text-amber-700',
    respondida: 'bg-emerald-100 text-emerald-700',
    arquivada: 'bg-slate-50 text-slate-600 border border-slate-100',
  },
  defaultBadge: 'bg-slate-50 text-slate-600 border border-slate-100',
});

export const LEGAL_CONSULTATION_STATUS_LABELS = meta.LABELS;
export const LEGAL_CONSULTATION_STATUS_OPTIONS = meta.OPTIONS;

export const LEGAL_CONSULTATION_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  ...meta.OPTIONS,
] as const satisfies readonly { value: LegalConsultationStatus | ''; label: string }[];

export const isLegalConsultationStatus = meta.isStatus;
export const getLegalConsultationStatusLabel = meta.getLabel;
export const getLegalConsultationStatusBadgeClass = meta.getBadgeClass;
