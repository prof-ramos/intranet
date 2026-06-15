import { z } from 'zod';
import {
  ETIQUETA_FIELD_KEYS,
  ETIQUETA_PRINT_MODES,
  PIMACO_TEMPLATE_CODES,
  type EtiquetaFieldKey,
  type EtiquetaPrintMode,
} from './types';
import { getLabelsPerPage, getPimacoTemplate } from './templates';

export const MAX_LABELS_PER_GENERATION = 1000;
export const MAX_LABEL_LINES = 12;

export const pimacoTemplateCodeSchema = z.enum(PIMACO_TEMPLATE_CODES);
export const etiquetaPrintModeSchema = z.enum(ETIQUETA_PRINT_MODES);
export const etiquetaFieldKeySchema = z.enum(ETIQUETA_FIELD_KEYS);

export const etiquetaPrintFlagsSchema = z.object({
  peo: z.boolean().default(false),
  ectOpenable: z.boolean().default(false),
});

export const etiquetaRecipientSchema = z.object({
  id: z.string().min(1).max(80),
  nome: z.string().max(180).nullish(),
  matricula: z.string().max(40).nullish(),
  categoria: z.string().max(80).nullish(),
  situacaoAssociativa: z.string().max(40).nullish(),
  lotacao: z.string().max(180).nullish(),
  posto: z.string().max(180).nullish(),
  enderecoCompleto: z.string().max(240).nullish(),
  complemento: z.string().max(120).nullish(),
  bairro: z.string().max(120).nullish(),
  cidade: z.string().max(120).nullish(),
  uf: z.string().max(2).nullish(),
  cep: z.string().max(20).nullish(),
  email: z.string().max(180).nullish(),
  telefone: z.string().max(60).nullish(),
  observacao: z.string().max(120).nullish(),
});

const etiquetaGenerationBaseSchema = z.object({
  templateCode: pimacoTemplateCodeSchema,
  mode: etiquetaPrintModeSchema,
  recipients: z.array(etiquetaRecipientSchema).min(1).max(MAX_LABELS_PER_GENERATION),
  selectedFields: z.array(etiquetaFieldKeySchema).max(ETIQUETA_FIELD_KEYS.length).optional(),
  flags: etiquetaPrintFlagsSchema.default({ peo: false, ectOpenable: false }),
  startPosition: z.coerce.number().int().min(1).default(1),
  offsetXmm: z.coerce.number().min(-10).max(10).default(0),
  offsetYmm: z.coerce.number().min(-10).max(10).default(0),
  debug: z.boolean().default(false),
});

function validateStartPositionForTemplate(
  input: { templateCode: z.infer<typeof pimacoTemplateCodeSchema>; startPosition: number },
  ctx: z.RefinementCtx,
) {
  const labelsPerPage = getLabelsPerPage(getPimacoTemplate(input.templateCode));
  if (input.startPosition > labelsPerPage) {
    ctx.addIssue({
      code: 'custom',
      path: ['startPosition'],
      message: `A posição inicial deve estar entre 1 e ${labelsPerPage}.`,
    });
  }
}

export const etiquetaGenerationInputSchema = etiquetaGenerationBaseSchema.superRefine(
  validateStartPositionForTemplate,
);

const etiquetaRouteBaseSchema = etiquetaGenerationBaseSchema.omit({ recipients: true }).extend({
  recipientIds: z.array(z.coerce.number().int().positive()).max(MAX_LABELS_PER_GENERATION).optional(),
  recipients: z.array(etiquetaRecipientSchema).max(MAX_LABELS_PER_GENERATION).optional(),
});

export const etiquetaRouteRequestSchema = etiquetaRouteBaseSchema
  .superRefine(validateStartPositionForTemplate)
  .refine((input) => Boolean(input.recipientIds?.length) !== Boolean(input.recipients?.length), {
    message: 'Informe associados selecionados ou destinatários normalizados, mas não ambos.',
    path: ['recipientIds'],
  })
  .transform((input) => ({
    ...input,
    recipients: input.recipients ?? [],
  }));

export type ValidatedEtiquetaGenerationInput = z.infer<typeof etiquetaGenerationInputSchema>;
export type ValidatedEtiquetaRouteRequest = z.infer<typeof etiquetaRouteRequestSchema>;

export const DEFAULT_FIELDS_BY_MODE: Record<EtiquetaPrintMode, EtiquetaFieldKey[]> = {
  postal: ['nome', 'endereco_completo', 'complemento', 'bairro', 'cidade_uf', 'cep'],
  mala_diplomatica: ['nome', 'lotacao'],
  custom: ['nome', 'lotacao', 'endereco_completo', 'cidade_uf', 'cep'],
};

export function resolveFieldsForMode(
  mode: EtiquetaPrintMode,
  selectedFields?: EtiquetaFieldKey[],
): EtiquetaFieldKey[] {
  return selectedFields?.length ? selectedFields : DEFAULT_FIELDS_BY_MODE[mode];
}

export function assertStartPositionForTemplate(startPosition: number, labelsPerPage: number) {
  if (startPosition < 1 || startPosition > labelsPerPage) {
    throw new Error(`A posição inicial deve estar entre 1 e ${labelsPerPage}.`);
  }
}
