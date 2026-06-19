export const ALLOWED_EMAIL_TYPES = ['newsletter', 'convite', 'comunicado', 'aviso'] as const;
export type EmailType = (typeof ALLOWED_EMAIL_TYPES)[number];

/**
 * Identificadores de modelo Gemini centralizados.
 *
 * Mantenha todos os nomes de modelo aqui para evitar divergência ("drift")
 * entre os módulos que consomem a API (gerador de ofícios, e-mails, triagem).
 */
export const LETTER_MODEL = 'gemini-3.5-flash';
export const EMAIL_MODEL = 'gemini-3.5-flash';
export const EMAIL_TRIAGE_MODEL = 'gemini-2.5-flash';

/** Modelos cuja seleção explícita é permitida nas funções de geração. */
export const ALLOWED_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const;
export type GeminiModel = (typeof ALLOWED_MODELS)[number];

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gemini-3.5-flash': 'Gemini 3.5 Flash',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
};

export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] ?? modelId;
}
