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
    aberta:
      'border border-slate-200 border-l-[3px] border-l-slate-400 bg-white text-slate-600 shadow-[0_1px_2px_rgba(4,9,32,0.06)]',
    aguardando_escritorio:
      'border border-amber-200 border-l-[3px] border-l-amber-500 bg-white text-amber-800 shadow-[0_1px_2px_rgba(4,9,32,0.06)]',
    respondida:
      'border border-emerald-200 border-l-[3px] border-l-emerald-500 bg-white text-emerald-700 shadow-[0_1px_2px_rgba(4,9,32,0.06)]',
    arquivada:
      'border border-slate-200 border-l-[3px] border-l-slate-300 bg-white text-slate-500 shadow-[0_1px_2px_rgba(4,9,32,0.06)]',
  },
  defaultBadge:
    'border border-slate-200 border-l-[3px] border-l-slate-400 bg-white text-slate-600 shadow-[0_1px_2px_rgba(4,9,32,0.06)]',
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
