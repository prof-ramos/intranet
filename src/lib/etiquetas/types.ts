export const PIMACO_TEMPLATE_CODES = ['6182', '3080', 'A4256'] as const;
export type PimacoTemplateCode = (typeof PIMACO_TEMPLATE_CODES)[number];

export const ETIQUETA_FIELD_KEYS = [
  'nome',
  'matricula',
  'categoria',
  'situacao_associativa',
  'lotacao',
  'posto',
  'endereco_completo',
  'complemento',
  'bairro',
  'cidade_uf',
  'cep',
  'email',
  'telefone',
  'observacao',
] as const;
export type EtiquetaFieldKey = (typeof ETIQUETA_FIELD_KEYS)[number];

export const ETIQUETA_PRINT_MODES = ['postal', 'mala_diplomatica', 'custom'] as const;
export type EtiquetaPrintMode = (typeof ETIQUETA_PRINT_MODES)[number];

export interface PimacoTemplate {
  code: PimacoTemplateCode;
  name: string;
  pageWidthMm: number;
  pageHeightMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  marginLeftMm: number;
  marginTopMm: number;
  gapHorizontalMm: number;
  gapVerticalMm: number;
  columns: number;
  rows: number;
  description: string;
}

export interface LabelContent {
  id?: string;
  lines: string[];
}

export interface LabelPosition {
  pageIndex: number;
  indexOnPage: number;
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LabelLayoutOptions {
  startPosition?: number;
  offsetXmm?: number;
  offsetYmm?: number;
}

export interface EtiquetaPrintFlags {
  peo?: boolean;
  ectOpenable?: boolean;
}

export interface EtiquetaRecipient {
  id: string;
  nome?: string | null;
  matricula?: string | null;
  categoria?: string | null;
  situacaoAssociativa?: string | null;
  lotacao?: string | null;
  posto?: string | null;
  enderecoCompleto?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  email?: string | null;
  telefone?: string | null;
  observacao?: string | null;
}

export interface EtiquetaGenerationInput {
  templateCode: PimacoTemplateCode;
  mode: EtiquetaPrintMode;
  recipients: EtiquetaRecipient[];
  selectedFields?: EtiquetaFieldKey[];
  flags?: EtiquetaPrintFlags;
  startPosition?: number;
  offsetXmm?: number;
  offsetYmm?: number;
  debug?: boolean;
}

export interface GenerateLabelsOptions {
  templateCode: PimacoTemplateCode;
  labels: LabelContent[];
  startPosition?: number;
  offsetXmm?: number;
  offsetYmm?: number;
  debug?: boolean;
}
