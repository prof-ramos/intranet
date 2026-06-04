/**
 * Email triage analyzer — PII redaction, HTML-to-text, Gemini analysis.
 *
 * Port of the Python MVP (scripts/email-triage/email_triage_mvp.py) to
 * TypeScript for server-side use in the Next.js pipeline.
 */

import { createLogger } from '@/lib/logger';
import { SYSTEM_PROMPT } from './system-prompt';
import {
  emailTriageResultSchema,
  type EmailPayload,
  type EmailTriageResult,
} from './schema';
import { createHash } from 'node:crypto';

const log = createLogger('email-triage/analyzer');

const ANALYSIS_EXCERPT_LIMIT = 4000;
const PERSISTED_EXCERPT_LIMIT = 500;
const GEMINI_TIMEOUT_MS = 30_000;
const DEFAULT_MODEL = 'gemini-2.5-flash';

const EMAIL_RE = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g;
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const LONG_NUMBER_RE = /\b\d{6,}\b/g;

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': '\u00A0',
  '&aacute;': '\u00E1',
  '&eacute;': '\u00E9',
  '&iacute;': '\u00ED',
  '&oacute;': '\u00F3',
  '&uacute;': '\u00FA',
  '&atilde;': '\u00E3',
  '&otilde;': '\u00F5',
  '&acirc;': '\u00E2',
  '&ecirc;': '\u00EA',
  '&icirc;': '\u00EE',
  '&ocirc;': '\u00F4',
  '&ucirc;': '\u00FB',
  '&agrave;': '\u00E0',
  '&egrave;': '\u00E8',
  '&igrave;': '\u00EC',
  '&ograve;': '\u00F2',
  '&ugrave;': '\u00F9',
  '&auml;': '\u00E4',
  '&euml;': '\u00EB',
  '&iuml;': '\u00EF',
  '&ouml;': '\u00F6',
  '&uuml;': '\u00FC',
  '&ccedil;': '\u00E7',
  '&ntilde;': '\u00F1',
  '&Aacute;': '\u00C1',
  '&Eacute;': '\u00C9',
  '&Iacute;': '\u00CD',
  '&Oacute;': '\u00D3',
  '&Uacute;': '\u00DA',
  '&Atilde;': '\u00C3',
  '&Otilde;': '\u00D5',
  '&Ccedil;': '\u00C7',
  '&Ntilde;': '\u00D1',
};

const NAMED_ENTITY_RE = /&[a-zA-Z]+;/g;
const DECIMAL_ENTITY_RE = /&#(\d+);/g;
const HEX_ENTITY_RE = /&#x([0-9a-fA-F]+);/g;

function decodeHtmlEntities(text: string): string {
  let result = text;
  result = result.replace(HEX_ENTITY_RE, (_match: string, code: string) =>
    String.fromCharCode(parseInt(code, 16)),
  );
  result = result.replace(DECIMAL_ENTITY_RE, (_match: string, code: string) =>
    String.fromCharCode(parseInt(code, 10)),
  );
  result = result.replace(NAMED_ENTITY_RE, (match) => ENTITY_MAP[match] ?? match);
  return result;
}

function decodeBase64Url(data: string | null | undefined): Buffer {
  if (!data) return Buffer.alloc(0);
  return Buffer.from(data, 'base64url');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getRecord(obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = obj[key];
  return isRecord(value) ? value : undefined;
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

function getNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const value = obj[key];
  return typeof value === 'number' ? value : undefined;
}

function getRecordArray(obj: Record<string, unknown>, key: string): Record<string, unknown>[] | undefined {
  const value = obj[key];
  if (!Array.isArray(value)) return undefined;
  const result: Record<string, unknown>[] = [];
  for (const item of value) {
    if (!isRecord(item)) return undefined;
    result.push(item);
  }
  return result;
}

export interface AttachmentInfo {
  filename: string;
  mimeType: string | null;
  sha256: string | null;
  size: number | null;
  textExcerpt: string | null;
}

export function redactExcerpt(value: string): string {
  let redacted = value.replace(EMAIL_RE, '[email-redacted]');
  redacted = redacted.replace(CPF_RE, '[cpf-redacted]');
  redacted = redacted.replace(LONG_NUMBER_RE, '[number-redacted]');
  return redacted;
}

const SCRIPT_STYLE_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const TAG_RE = /<[^>]+>/g;
const WHITESPACE_RE = /\s+/g;
const SPACE_PUNCT_RE = /\s+([.,;:!?])/g;

export function htmlToText(html: string): string {
  let text = html.replace(SCRIPT_STYLE_RE, ' ');
  text = text.replace(TAG_RE, ' ');
  text = decodeHtmlEntities(text);
  text = text.replace(WHITESPACE_RE, ' ').trim();
  text = text.replace(SPACE_PUNCT_RE, '$1');
  return text;
}

export function buildModelInput(payload: EmailPayload): Record<string, unknown> {
  return {
    message_id: payload.message_id,
    thread_id: payload.thread_id,
    received_at: payload.received_at,
    sender: payload.sender,
    original_recipient: payload.original_recipient,
    subject: payload.subject,
    body_excerpt: payload.analysis_excerpt,
    attachments: payload.attachments.map((att) => ({
      filename: att.filename,
      mime_type: att.mime_type,
      sha256: att.sha256,
      content_analyzed: att.resumo.length > 0,
      text_excerpt: att.resumo || null,
    })),
    lgpd_constraints: {
      full_body_is_not_persisted_by_default: true,
      legal_basis_is_ai_suggestion_only: true,
      ai_does_not_make_legal_merit_decisions: true,
      human_review_is_exceptional_operational_review: true,
    },
  };
}

export function buildPersistedExcerpt(bodyText: string): string {
  if (!bodyText) return '';
  if (bodyText.length <= PERSISTED_EXCERPT_LIMIT) {
    return '[short-body-redacted; sha256 stored]';
  }
  return `${bodyText.slice(0, PERSISTED_EXCERPT_LIMIT)}...[truncated; sha256 stored]`;
}

export function extractTextAndAttachments(
  message: Record<string, unknown>,
): { text: string; attachments: AttachmentInfo[] } {
  const textParts: string[] = [];
  const attachments: AttachmentInfo[] = [];

  function walk(part: Record<string, unknown>): void {
    const body = getRecord(part, 'body') ?? {};
    const mimeType = getString(part, 'mimeType') ?? null;
    const filename = getString(part, 'filename') ?? '';
    const data = decodeBase64Url(getString(body, 'data') ?? null);

    if (filename) {
      const sha256 =
        data.length > 0
          ? createHash('sha256').update(data).digest('hex')
          : null;

      let textExcerpt: string | null = null;
      if (data.length > 0 && mimeType && mimeType.startsWith('text/')) {
        const decoded = data.toString('utf-8');
        textExcerpt = redactExcerpt(decoded).slice(0, ANALYSIS_EXCERPT_LIMIT);
      }

      attachments.push({
        filename,
        mimeType,
        sha256,
        size: getNumber(body, 'size') ?? null,
        textExcerpt,
      });
      return;
    }

    if (mimeType === 'text/plain' && data.length > 0) {
      textParts.push(data.toString('utf-8'));
    } else if (mimeType === 'text/html' && data.length > 0) {
      textParts.push(htmlToText(data.toString('utf-8')));
    }

    const parts = getRecordArray(part, 'parts') ?? [];
    for (const child of parts) {
      walk(child);
    }
  }

  walk(getRecord(message, 'payload') ?? {});

  const text = textParts.join('\n\n').trim();
  return { text, attachments };
}

function postScanForPii(parsed: EmailTriageResult): void {
  const combined = JSON.stringify(parsed);

  EMAIL_RE.lastIndex = 0;
  if (EMAIL_RE.test(combined)) {
    log.warn('Gemini output contains unredacted email address');
  }

  CPF_RE.lastIndex = 0;
  if (CPF_RE.test(combined)) {
    log.warn('Gemini output contains unredacted CPF');
  }

  LONG_NUMBER_RE.lastIndex = 0;
  if (LONG_NUMBER_RE.test(combined)) {
    log.warn('Gemini output contains unredacted long number');
  }
}

/**
 * Minimal JSON Schema for Gemini structured output.
 *
 * Describes the main fields so Gemini generates valid JSON in the right
 * shape.  The full Zod schema (including superRefine rules) is applied
 * server-side for validation.
 */
const RESPONSE_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    categoria: {
      type: 'string',
      enum: ['juridico', 'administrativo', 'financeiro', 'institucional', 'comunicacao', 'irrelevante'],
      description: 'Classificacao principal do e-mail.',
    },
    resumo: { type: 'string', description: 'Resumo factual do e-mail. Maximo 3 frases.' },
    thread_context_summary: { type: 'string', description: 'Resumo do contexto anterior da thread, se relevante.' },
    ha_prazo: { type: 'boolean', description: 'True se houver prazo, data-limite, vencimento, reuniao ou resposta marcada.' },
    prazo_data: { type: 'string', description: 'Data do prazo em ISO YYYY-MM-DD.' },
    prazo_hora: { type: 'string', description: 'Hora do prazo em HH:mm.' },
    prazo_confianca_data: { type: 'string', enum: ['baixa', 'media', 'alta'], description: 'Confianca especifica na data extraida.' },
    tipo_prazo: { type: 'string', enum: ['processual', 'administrativo', 'contratual', 'financeiro', 'reuniao', 'resposta', 'outro'], description: 'Natureza do prazo.' },
    trecho_fonte_do_prazo: { type: 'string', description: 'Trecho literal que justifica o prazo.' },
    resumo_anexos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          filename: { type: 'string' },
          mime_type: { type: 'string' },
          sha256: { type: 'string' },
          resumo: { type: 'string' },
          ha_prazo_no_anexo: { type: 'boolean' },
          trechos_relevantes: { type: 'array', items: { type: 'string' } },
        },
        required: ['filename', 'resumo', 'ha_prazo_no_anexo', 'trechos_relevantes'],
      },
    },
    source_evidence: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['corpo_email', 'anexo', 'cabecalho', 'thread'] },
          referencia: { type: 'string' },
          trecho: { type: 'string' },
        },
        required: ['tipo', 'referencia', 'trecho'],
      },
    },
    nivel_risco: { type: 'string', enum: ['baixo', 'medio', 'alto', 'critico'], description: 'Risco operacional ou juridico.' },
    confianca: { type: 'string', enum: ['baixa', 'media', 'alta'], description: 'Confianca geral na interpretacao do e-mail.' },
    acao_recomendada: { type: 'string', description: 'Proxima acao operacional sugerida.' },
    responsavel_sugerido: { type: 'string', enum: ['juridico', 'administrativo', 'financeiro', 'diretoria'], description: 'Setor sugerido.' },
    exige_validacao_humana: { type: 'boolean', description: 'Indica necessidade excepcional de revisao operacional humana.' },
    legal_basis: { type: 'string', enum: ['interesse_legitimo', 'cumprimento_obrigacao_legal', 'execucao_contrato', 'avaliacao_humana_necessaria'], description: 'Sugestao operacional de base legal LGPD, sujeita a validacao.' },
    processed_purpose: { type: 'string', description: 'Finalidade explicita do processamento.' },
  },
  required: [
    'categoria', 'resumo', 'ha_prazo', 'nivel_risco', 'confianca',
    'acao_recomendada', 'exige_validacao_humana', 'legal_basis', 'processed_purpose',
  ],
};

export async function analyzeEmail(
  payload: EmailPayload,
  apiKey: string,
  modelName: string = DEFAULT_MODEL,
): Promise<EmailTriageResult> {
  const modelInput = buildModelInput(payload);

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  log.info('Calling Gemini for email triage', {
    message_id: payload.message_id,
    model: modelName,
  });

  const startTime = performance.now();

  const response = await Promise.race([
    ai.models.generateContent({
      model: modelName,
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: JSON.stringify(modelInput) }] },
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
      },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Gemini timed out after 30s')),
        GEMINI_TIMEOUT_MS,
      ),
    ),
  ]);

  const elapsed = Math.round(performance.now() - startTime);
  log.info('Gemini response received', {
    message_id: payload.message_id,
    elapsed_ms: elapsed,
  });

  const rawText = response.text ?? '{}';
  let parsedJson: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawText);
    parsedJson = isRecord(parsed) ? parsed : {};
  } catch (parseErr) {
    const errorMessage = parseErr instanceof Error ? parseErr.message : String(parseErr);
    log.error('Failed to parse Gemini response as JSON', {
      message_id: payload.message_id,
      error: errorMessage,
    });
    throw new Error(
      `Gemini response is not valid JSON: ${errorMessage}`,
    );
  }

  const parseResult = emailTriageResultSchema.safeParse(parsedJson);

  if (!parseResult.success) {
    log.error('Gemini response failed Zod validation', {
      message_id: payload.message_id,
      issues: parseResult.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
      ),
    });
    throw new Error(
      `Gemini response failed validation: ${parseResult.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }

  const triageResult = parseResult.data;
  postScanForPii(triageResult);

  log.info('Email triage completed', {
    message_id: payload.message_id,
    categoria: triageResult.categoria,
    ha_prazo: triageResult.ha_prazo,
    nivel_risco: triageResult.nivel_risco,
  });

  return triageResult;
}
