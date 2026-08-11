'use server';

import { defineServerAction } from '@/lib/server-actions/define-form-action';
import { generateEmailContent } from '@/lib/ai/gemini';
import { GeminiError } from '@/lib/ai/errors';
import { isGeminiConfigured } from '@/lib/ai/settings';
import { ALLOWED_EMAIL_TYPES, type EmailType } from '@/lib/ai/constants';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const logger = createLogger('secretaria:emails:gerar');

function isValidEmailType(value: unknown): value is EmailType {
  return (ALLOWED_EMAIL_TYPES as readonly unknown[]).includes(value);
}

export type GenerateEmailResult =
  | { success: true; subject: string; html: string }
  | { success: false; error: string };

const _generateEmailAction = defineServerAction({
  auth: ['admin', 'secretaria'],
  schema: z.object({
    emailType: z.string(),
    prompt: z.string(),
  }),
  rateLimit: { key: 'ai_generate_email', windowMs: 60_000, maxRequests: 5 },
  service: async (input: { emailType: string; prompt: string }): Promise<GenerateEmailResult> => {
    const trimmedPrompt = input.prompt?.trim();
    if (!trimmedPrompt) {
      return { success: false, error: 'Descreva o conteúdo do e-mail.' };
    }

    if (!isValidEmailType(input.emailType)) {
      return { success: false, error: 'Tipo de e-mail inválido.' };
    }

    const configured = await isGeminiConfigured();
    if (!configured) {
      return {
        success: false,
        error:
          'A chave da API Gemini não está configurada. Solicite ao administrador que configure em Configurações → Integrações → IA.',
      };
    }

    try {
      const { subject, html } = await generateEmailContent({
        emailType: input.emailType,
        prompt: trimmedPrompt,
      });
      return { success: true, subject, html };
    } catch (error) {
      logger.error(
        'Failed to generate email',
        { error: toSafeErrorLog(error) },
        error instanceof Error ? error : undefined,
      );
      if (error instanceof GeminiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Falha ao gerar e-mail.' };
    }
  },
});

export async function generateEmailAction(
  emailType: string,
  prompt: string,
): Promise<GenerateEmailResult> {
  return _generateEmailAction({ emailType, prompt });
}
