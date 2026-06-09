import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  type GenerateContentResponse,
} from '@google/genai';
import { getGeminiApiKey } from '@/lib/ai/settings';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import { GeminiError } from './errors';
import {
  ALLOWED_EMAIL_TYPES,
  ALLOWED_MODELS,
  EMAIL_MODEL,
  LETTER_MODEL,
  type GeminiModel,
} from './constants';
import {
  SYSTEM_INSTRUCTION,
  EMAIL_SYSTEM_INSTRUCTION,
  buildLetterUserMessage,
  buildEmailUserMessage,
} from './prompts';

const logger = createLogger('ai/gemini');

const REQUEST_TIMEOUT_MS = 30000;

let cachedClient: GoogleGenAI | null = null;
let cachedKey: string | null = null;

async function getGeminiClient(): Promise<GoogleGenAI> {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    throw new GeminiError(
      'Chave de API do Gemini não configurada. Configure-a em Configurações → Integrações → IA.',
    );
  }

  if (cachedClient && cachedKey === apiKey) return cachedClient;
  cachedKey = apiKey;
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

/** Resolve o modelo a usar, validando seleções explícitas contra a allowlist. */
function resolveModel(model: string | undefined, fallback: GeminiModel): string {
  if (!model) return fallback;
  if (!(ALLOWED_MODELS as readonly string[]).includes(model)) {
    throw new GeminiError('Modelo de IA não suportado.');
  }
  return model;
}

/**
 * Executa uma chamada ao SDK com timeout que efetivamente ABORTA a requisição
 * subjacente via AbortSignal (ao contrário de um Promise.race que apenas deixa
 * a chamada órfã rodando até o fim).
 */
async function runWithAbort<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new GeminiError(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Valida a resposta do modelo e extrai o texto. Detecta bloqueios de segurança,
 * interrupções de geração e respostas vazias — que, de outra forma, retornariam
 * uma string vazia silenciosamente.
 */
function extractText(result: GenerateContentResponse): string {
  const blockReason = result.promptFeedback?.blockReason;
  if (blockReason) {
    throw new GeminiError(
      `A geração foi bloqueada pela política de conteúdo (${blockReason}).`,
    );
  }

  const finishReason = result.candidates?.[0]?.finishReason as string | undefined;
  if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
    throw new GeminiError(`A geração foi interrompida (motivo: ${finishReason}).`);
  }

  const text = result.text ?? '';
  if (!text.trim()) {
    throw new GeminiError('O modelo retornou conteúdo vazio. Tente novamente.');
  }
  return text;
}

function getSafetySettings() {
  return [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];
}

export async function generateOfficialLetterContent(params: {
  recipient: string;
  recipientRole: string;
  subject: string;
  itamaratySector: string;
  signatory: string;
  signatoryRole: string;
  instruction: string;
  model?: string;
}) {
  const userMessage = buildLetterUserMessage(params);

  const model = resolveModel(params.model, LETTER_MODEL);

  try {
    const ai = await getGeminiClient();
    const result = await runWithAbort(
      (abortSignal) =>
        ai.models.generateContent({
          model,
          contents: userMessage,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.4,
            maxOutputTokens: 4096,
            safetySettings: getSafetySettings(),
            abortSignal,
          },
        }),
      REQUEST_TIMEOUT_MS,
      'Falha ao gerar conteúdo do ofício. Tente novamente.',
    );
    return extractText(result);
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    logger.error(
      'Letter generation failed',
      { error: toSafeErrorLog(error) },
      error instanceof Error ? error : undefined,
    );
    throw new GeminiError('Falha ao gerar conteúdo do ofício. Tente novamente.');
  }
}

const EMAIL_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string', description: 'Assunto do e-mail' },
    html: { type: 'string', description: 'HTML completo do e-mail' },
  },
  required: ['subject', 'html'],
};

export async function generateEmailContent(params: {
  emailType: string;
  prompt: string;
  model?: string;
}): Promise<{ subject: string; html: string }> {
  if (!(ALLOWED_EMAIL_TYPES as readonly string[]).includes(params.emailType)) {
    throw new GeminiError('Tipo de e-mail inválido.');
  }

  const userMessage = buildEmailUserMessage(params.emailType, params.prompt);

  const model = resolveModel(params.model, EMAIL_MODEL);

  try {
    const ai = await getGeminiClient();
    const result = await runWithAbort(
      (abortSignal) =>
        ai.models.generateContent({
          model,
          contents: userMessage,
          config: {
            systemInstruction: EMAIL_SYSTEM_INSTRUCTION,
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema: EMAIL_RESPONSE_SCHEMA,
            safetySettings: getSafetySettings(),
            abortSignal,
          },
        }),
      REQUEST_TIMEOUT_MS,
      'Tempo esgotado. Tente novamente.',
    );

    const raw = extractText(result);

    let parsed: { subject?: unknown; html?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new GeminiError('O modelo retornou um JSON inválido. Tente novamente.');
    }

    if (!parsed.subject || typeof parsed.subject !== 'string') {
      throw new GeminiError('O modelo não retornou um assunto válido. Tente novamente.');
    }

    if (typeof parsed.html !== 'string' || !/<(!doctype\s+html|html[\s>])/i.test(parsed.html)) {
      throw new GeminiError('O modelo não retornou um documento HTML válido. Tente novamente.');
    }

    return { subject: parsed.subject, html: parsed.html };
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    logger.error(
      'Email generation failed',
      { error: toSafeErrorLog(error) },
      error instanceof Error ? error : undefined,
    );
    throw new GeminiError('Falha ao gerar e-mail. Tente novamente.');
  }
}

export async function* generateEmailContentStream(params: {
  emailType: string;
  prompt: string;
  model?: string;
}): AsyncGenerator<string> {
  if (!(ALLOWED_EMAIL_TYPES as readonly string[]).includes(params.emailType)) {
    throw new GeminiError('Tipo de e-mail inválido.');
  }

  const userMessage = buildEmailUserMessage(params.emailType, params.prompt);

  const model = resolveModel(params.model, EMAIL_MODEL);

  const ai = await getGeminiClient();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let accumulated = '';

  try {
    const result = await ai.models.generateContentStream({
      model,
      contents: userMessage,
      config: {
        systemInstruction: EMAIL_SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 8192,
        safetySettings: getSafetySettings(),
        abortSignal: controller.signal,
      },
    });

    for await (const chunk of result) {
      if (chunk.text) {
        accumulated += chunk.text;
        yield chunk.text;
      }
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new GeminiError('Tempo esgotado. Tente novamente.');
    }
    if (error instanceof GeminiError) throw error;
    logger.error(
      'Email stream generation failed',
      { error: toSafeErrorLog(error) },
      error instanceof Error ? error : undefined,
    );
    throw new GeminiError('Falha ao gerar e-mail. Tente novamente.');
  } finally {
    clearTimeout(timer);
  }

  if (!accumulated.trim()) {
    throw new GeminiError('O modelo retornou conteúdo vazio. Tente novamente.');
  }
}