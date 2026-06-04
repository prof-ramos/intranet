import { z } from 'zod';
import { EMAIL_TRIAGE_CATEGORIAS, EMAIL_TRIAGE_RISCOS } from './status';

export const CATEGORIAS = EMAIL_TRIAGE_CATEGORIAS;
export const CONFIANCA = ['baixa', 'media', 'alta'] as const;
export const NIVEL_RISCO = EMAIL_TRIAGE_RISCOS;

export const TIPO_PRAZO = [
  'processual',
  'administrativo',
  'contratual',
  'financeiro',
  'reuniao',
  'resposta',
  'outro',
] as const;

export const RESPONSAVEL = ['juridico', 'administrativo', 'financeiro', 'diretoria'] as const;

export const LEGAL_BASIS = [
  'interesse_legitimo',
  'cumprimento_obrigacao_legal',
  'execucao_contrato',
  'avaliacao_humana_necessaria',
] as const;

export const SOURCE_TIPO = ['corpo_email', 'anexo', 'cabecalho', 'thread'] as const;

// ─── Scalar Zod schemas ──────────────────────────────────────────────

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected ISO date format YYYY-MM-DD');
const timeString = z.string().regex(/^\d{2}:\d{2}$/, 'Expected time format HH:mm');

// ─── AttachmentSummary ───────────────────────────────────────────────

export const attachmentSummarySchema = z.object({
  filename: z.string().describe('Nome do arquivo anexo.'),
  mime_type: z.string().nullable().default(null).describe('Tipo MIME informado ou inferido.'),
  sha256: z.string().nullable().default(null).describe('Hash SHA256 do anexo, se fornecido.'),
  resumo: z.string().describe('Resumo factual do conteudo relevante do anexo.'),
  ha_prazo_no_anexo: z.boolean().describe('Indica se o anexo contem possivel prazo.'),
  trechos_relevantes: z.array(z.string()).default([]).describe('Trechos usados como evidencia.'),
});

export type AttachmentSummary = z.infer<typeof attachmentSummarySchema>;

// ─── SourceEvidence ──────────────────────────────────────────────────

export const sourceEvidenceSchema = z.object({
  tipo: z.enum(SOURCE_TIPO).describe('Origem da evidencia.'),
  referencia: z
    .string()
    .describe('Identificador da origem: corpo, header, anexo ou thread.'),
  trecho: z.string().describe('Trecho literal ou evidencia textual minima.'),
});

export type SourceEvidence = z.infer<typeof sourceEvidenceSchema>;

// ─── EmailPayload (pipeline input, not from Pydantic) ────────────────

export const emailPayloadSchema = z.object({
  message_id: z.string(),
  thread_id: z.string(),
  history_id: z.string(),
  received_at: z.string(),
  sender: z.string(),
  original_recipient: z.string(),
  subject: z.string(),
  body_hash: z.string(),
  body_excerpt: z.string(),
  analysis_excerpt: z.string(),
  attachments: z.array(attachmentSummarySchema),
});

export type EmailPayload = z.infer<typeof emailPayloadSchema>;

// ─── EmailTriageResult (port of EmailTriageSchema) ───────────────────

export const emailTriageResultSchema = z
  .object({
    // --- Core classification ---
    categoria: z
      .enum(CATEGORIAS)
      .describe('Classificacao principal do e-mail.'),
    resumo: z.string().describe('Resumo factual do e-mail. Maximo 3 frases.'),
    thread_context_summary: z
      .string()
      .nullable()
      .default(null)
      .describe('Resumo do contexto anterior da thread, se relevante.'),

    // --- Prazo (deadline) fields ---
    ha_prazo: z
      .boolean()
      .describe('True se houver prazo, data-limite, vencimento, reuniao ou resposta marcada.'),
    prazo_data: dateString
      .nullable()
      .default(null)
      .describe('Data do prazo em ISO YYYY-MM-DD.'),
    prazo_hora: timeString
      .nullable()
      .default(null)
      .describe('Hora do prazo em HH:mm.'),
    prazo_confianca_data: z
      .enum(CONFIANCA)
      .nullable()
      .default(null)
      .describe('Confianca especifica na data extraida.'),
    tipo_prazo: z
      .enum(TIPO_PRAZO)
      .nullable()
      .default(null)
      .describe('Natureza do prazo.'),
    trecho_fonte_do_prazo: z
      .string()
      .nullable()
      .default(null)
      .describe('Trecho literal que justifica o prazo.'),

    // --- Attachments & evidence ---
    resumo_anexos: z
      .array(attachmentSummarySchema)
      .default([])
      .describe('Resumo estruturado dos anexos analisados.'),
    source_evidence: z
      .array(sourceEvidenceSchema)
      .default([])
      .describe('Evidencias usadas para classificacao, prazo e risco.'),

    // --- Risk & confidence ---
    nivel_risco: z.enum(NIVEL_RISCO).describe('Risco operacional ou juridico.'),
    confianca: z.enum(CONFIANCA).describe('Confianca geral na interpretacao do e-mail.'),
    acao_recomendada: z.string().describe('Proxima acao operacional sugerida.'),
    responsavel_sugerido: z
      .enum(RESPONSAVEL)
      .nullable()
      .default(null)
      .describe('Setor sugerido.'),
    exige_validacao_humana: z
      .boolean()
      .describe('Indica necessidade excepcional de revisao operacional humana.'),

    // --- LGPD ---
    legal_basis: z
      .enum(LEGAL_BASIS)
      .describe('Sugestao operacional de base legal LGPD, sujeita a validacao.'),
    processed_purpose: z.string().describe('Finalidade explicita do processamento.'),
  })
  .superRefine((data, ctx) => {
    // Rule 1: If ha_prazo is false, no deadline fields should be present
    if (!data.ha_prazo) {
      const hasDeadlineFields =
        data.prazo_data !== null ||
        data.prazo_hora !== null ||
        data.prazo_confianca_data !== null ||
        data.tipo_prazo !== null ||
        data.trecho_fonte_do_prazo !== null;

      if (hasDeadlineFields) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Campos de prazo nao devem ser preenchidos sem ha_prazo.',
          path: ['ha_prazo'],
        });
      }
    }

    // Rule 2: prazo_data requires prazo_confianca_data
    if (data.prazo_data !== null && data.prazo_confianca_data === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'prazo_data preenchido exige prazo_confianca_data.',
        path: ['prazo_confianca_data'],
      });
    }

    // Rule 3: ha_prazo=true requires at least one source_evidence
    if (data.ha_prazo && data.source_evidence.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ha_prazo=true exige ao menos uma evidencia em source_evidence.',
        path: ['source_evidence'],
      });
    }

    // `exige_validacao_humana` means exceptional operational review, not legal merit review.
  });

export type EmailTriageResult = z.infer<typeof emailTriageResultSchema>;

// ─── TriageResponse (raw AI output with parsing metadata) ────────────

export const triageResponseSchema = z.object({
  raw: z.string().describe('Raw text response from Gemini.'),
  parsed: emailTriageResultSchema
    .nullable()
    .describe('Parsed structured result, or null on failure.'),
  model_name: z.string().describe('Gemini model name used.'),
  model_response_id: z
    .string()
    .nullable()
    .default(null)
    .describe('Response identifier from the model, if available.'),
});

export type TriageResponse = z.infer<typeof triageResponseSchema>;
