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

// ─── Labels ──────────────────────────────────────────────────────────

export const EMAIL_TRIAGE_STATUS_LABELS: Record<EmailTriageStatus, string> = {
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
};

export const EMAIL_TRIAGE_CATEGORIA_LABELS: Record<EmailTriageCategoria, string> = {
  juridico: 'Jurídico',
  administrativo: 'Administrativo',
  financeiro: 'Financeiro',
  institucional: 'Institucional',
  comunicacao: 'Comunicação',
  irrelevante: 'Irrelevante',
};

export const EMAIL_TRIAGE_RISCO_LABELS: Record<EmailTriageRisco, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
  critico: 'Crítico',
};

// ─── Filter options ──────────────────────────────────────────────────

export const EMAIL_TRIAGE_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  ...EMAIL_TRIAGE_STATUSES.map((s) => ({ value: s, label: EMAIL_TRIAGE_STATUS_LABELS[s] })),
] as const satisfies readonly { value: EmailTriageStatus | ''; label: string }[];

export const EMAIL_TRIAGE_CATEGORIA_FILTER_OPTIONS = [
  { value: '', label: 'Todas' },
  ...EMAIL_TRIAGE_CATEGORIAS.map((c) => ({ value: c, label: EMAIL_TRIAGE_CATEGORIA_LABELS[c] })),
] as const satisfies readonly { value: EmailTriageCategoria | ''; label: string }[];

export const EMAIL_TRIAGE_RISCO_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  ...EMAIL_TRIAGE_RISCOS.map((r) => ({ value: r, label: EMAIL_TRIAGE_RISCO_LABELS[r] })),
] as const satisfies readonly { value: EmailTriageRisco | ''; label: string }[];

// ─── Type guards ─────────────────────────────────────────────────────

export function isEmailTriageStatus(value: string): value is EmailTriageStatus {
  return EMAIL_TRIAGE_STATUSES.includes(value as EmailTriageStatus);
}

export function isEmailTriageCategoria(value: string): value is EmailTriageCategoria {
  return EMAIL_TRIAGE_CATEGORIAS.includes(value as EmailTriageCategoria);
}

export function isEmailTriageRisco(value: string): value is EmailTriageRisco {
  return EMAIL_TRIAGE_RISCOS.includes(value as EmailTriageRisco);
}

// ─── Label helpers ───────────────────────────────────────────────────

export function getStatusLabel(value: string): string {
  if (isEmailTriageStatus(value)) return EMAIL_TRIAGE_STATUS_LABELS[value];
  return value;
}

export function getCategoriaLabel(value: string): string {
  if (isEmailTriageCategoria(value)) return EMAIL_TRIAGE_CATEGORIA_LABELS[value];
  return value;
}

export function getRiscoLabel(value: string): string {
  if (isEmailTriageRisco(value)) return EMAIL_TRIAGE_RISCO_LABELS[value];
  return value;
}

// ─── Badge classes ───────────────────────────────────────────────────

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'novo':
      return 'bg-slate-100 text-slate-700';
    case 'analisado':
      return 'bg-blue-100 text-blue-700';
    case 'aguardando_validacao':
      return 'bg-amber-100 text-amber-700';
    case 'validado':
      return 'bg-emerald-100 text-emerald-700';
    case 'em_andamento':
      return 'bg-blue-100 text-blue-700';
    case 'concluido':
      return 'bg-emerald-100 text-emerald-700';
    case 'vencido':
      return 'bg-red-100 text-red-700';
    case 'arquivado':
      return 'bg-slate-50 text-slate-600 border border-slate-100';
    case 'erro_validacao_ia':
      return 'bg-red-100 text-red-700';
    case 'erro_processamento_anexo':
      return 'bg-red-100 text-red-700';
    case 'aguardando_reprocessamento':
      return 'bg-amber-100 text-amber-700';
    case 'descartado_por_irrelevancia':
      return 'bg-slate-50 text-slate-600 border border-slate-100';
    case 'pendente_validacao_lgpd':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-50 text-slate-600 border border-slate-100';
  }
}

export function getCategoriaBadgeClass(categoria: string): string {
  switch (categoria) {
    case 'juridico':
      return 'bg-violet-100 text-violet-700';
    case 'administrativo':
      return 'bg-blue-100 text-blue-700';
    case 'financeiro':
      return 'bg-emerald-100 text-emerald-700';
    case 'institucional':
      return 'bg-indigo-100 text-indigo-700';
    case 'comunicacao':
      return 'bg-cyan-100 text-cyan-700';
    case 'irrelevante':
      return 'bg-slate-50 text-slate-600 border border-slate-100';
    default:
      return 'bg-slate-50 text-slate-600 border border-slate-100';
  }
}

export function getRiscoBadgeClass(risco: string): string {
  switch (risco) {
    case 'baixo':
      return 'bg-emerald-100 text-emerald-700';
    case 'medio':
      return 'bg-amber-100 text-amber-700';
    case 'alto':
      return 'bg-orange-100 text-orange-700';
    case 'critico':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-50 text-slate-600 border border-slate-100';
  }
}
