import { createEnumMetadata } from '@/lib/ui/create-enum-metadata';

export const EMAIL_TRIAGE_STATUSES = [
  'novo',
  'analisado',
  'aguardando_validacao',
  'validado',
  'em_andamento',
  'concluido',
  'vencido',
  'arquivado',
  'erro_validacao_ia',
  'erro_processamento_anexo',
  'aguardando_reprocessamento',
  'descartado_por_irrelevancia',
  'pendente_validacao_lgpd',
] as const;

export type EmailTriageStatus = (typeof EMAIL_TRIAGE_STATUSES)[number];

export const EMAIL_TRIAGE_CATEGORIAS = [
  'juridico',
  'administrativo',
  'financeiro',
  'institucional',
  'comunicacao',
  'irrelevante',
] as const;

export type EmailTriageCategoria = (typeof EMAIL_TRIAGE_CATEGORIAS)[number];

export const EMAIL_TRIAGE_RISCOS = ['baixo', 'medio', 'alto', 'critico'] as const;

export type EmailTriageRisco = (typeof EMAIL_TRIAGE_RISCOS)[number];

// ─── Status metadata ───────────────────────────────────────────────

const statusMeta = createEnumMetadata({
  values: EMAIL_TRIAGE_STATUSES,
  labels: {
    novo: 'Novo',
    analisado: 'Analisado',
    aguardando_validacao: 'Aguardando revisão',
    validado: 'Validado',
    em_andamento: 'Em andamento',
    concluido: 'Concluído',
    vencido: 'Vencido',
    arquivado: 'Arquivado',
    erro_validacao_ia: 'Erro de validação IA',
    erro_processamento_anexo: 'Erro de processamento',
    aguardando_reprocessamento: 'Aguardando reprocessamento',
    descartado_por_irrelevancia: 'Descartado',
    pendente_validacao_lgpd: 'Pendente LGPD',
  },
  badges: {
    novo: 'bg-slate-100 text-slate-700',
    analisado: 'bg-blue-100 text-blue-700',
    aguardando_validacao: 'bg-amber-100 text-amber-700',
    validado: 'bg-emerald-100 text-emerald-700',
    em_andamento: 'bg-blue-100 text-blue-700',
    concluido: 'bg-emerald-100 text-emerald-700',
    vencido: 'bg-red-100 text-red-700',
    arquivado: 'bg-slate-50 text-slate-600 border border-slate-100',
    erro_validacao_ia: 'bg-red-100 text-red-700',
    erro_processamento_anexo: 'bg-red-100 text-red-700',
    aguardando_reprocessamento: 'bg-amber-100 text-amber-700',
    descartado_por_irrelevancia: 'bg-slate-50 text-slate-600 border border-slate-100',
    pendente_validacao_lgpd: 'bg-amber-100 text-amber-700',
  },
  defaultBadge: 'bg-slate-50 text-slate-600 border border-slate-100',
});

// ─── Categoria metadata ────────────────────────────────────────────

const categoriaMeta = createEnumMetadata({
  values: EMAIL_TRIAGE_CATEGORIAS,
  labels: {
    juridico: 'Jurídico',
    administrativo: 'Administrativo',
    financeiro: 'Financeiro',
    institucional: 'Institucional',
    comunicacao: 'Comunicação',
    irrelevante: 'Irrelevante',
  },
  badges: {
    juridico: 'bg-violet-100 text-violet-700',
    administrativo: 'bg-blue-100 text-blue-700',
    financeiro: 'bg-emerald-100 text-emerald-700',
    institucional: 'bg-indigo-100 text-indigo-700',
    comunicacao: 'bg-cyan-100 text-cyan-700',
    irrelevante: 'bg-slate-50 text-slate-600 border border-slate-100',
  },
  defaultBadge: 'bg-slate-50 text-slate-600 border border-slate-100',
});

// ─── Risco metadata ─────────────────────────────────────────────────

const riscoMeta = createEnumMetadata({
  values: EMAIL_TRIAGE_RISCOS,
  labels: {
    baixo: 'Baixo',
    medio: 'Médio',
    alto: 'Alto',
    critico: 'Crítico',
  },
  badges: {
    baixo: 'bg-emerald-100 text-emerald-700',
    medio: 'bg-amber-100 text-amber-700',
    alto: 'bg-orange-100 text-orange-700',
    critico: 'bg-red-100 text-red-700',
  },
  defaultBadge: 'bg-slate-50 text-slate-600 border border-slate-100',
});

// ─── Labels ──────────────────────────────────────────────────────────

export const EMAIL_TRIAGE_STATUS_LABELS = statusMeta.LABELS;
export const EMAIL_TRIAGE_CATEGORIA_LABELS = categoriaMeta.LABELS;
export const EMAIL_TRIAGE_RISCO_LABELS = riscoMeta.LABELS;

// ─── Filter options ──────────────────────────────────────────────────

export const EMAIL_TRIAGE_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  ...statusMeta.OPTIONS,
] as const satisfies readonly { value: EmailTriageStatus | ''; label: string }[];

export const EMAIL_TRIAGE_CATEGORIA_FILTER_OPTIONS = [
  { value: '', label: 'Todas' },
  ...categoriaMeta.OPTIONS,
] as const satisfies readonly { value: EmailTriageCategoria | ''; label: string }[];

export const EMAIL_TRIAGE_RISCO_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  ...riscoMeta.OPTIONS,
] as const satisfies readonly { value: EmailTriageRisco | ''; label: string }[];

// ─── Type guards ─────────────────────────────────────────────────────

export const isEmailTriageStatus = statusMeta.isStatus;
export const isEmailTriageCategoria = categoriaMeta.isStatus;
export const isEmailTriageRisco = riscoMeta.isStatus;

// ─── Label helpers ───────────────────────────────────────────────────

export const getStatusLabel = statusMeta.getLabel;
export const getCategoriaLabel = categoriaMeta.getLabel;
export const getRiscoLabel = riscoMeta.getLabel;

// ─── Badge classes ───────────────────────────────────────────────────

export const getStatusBadgeClass = statusMeta.getBadgeClass;
export const getCategoriaBadgeClass = categoriaMeta.getBadgeClass;
export const getRiscoBadgeClass = riscoMeta.getBadgeClass;
