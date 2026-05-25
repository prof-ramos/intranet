'use server';

import { requireAuth } from '@/lib/auth/require-auth';
import { generateEmailContent } from '@/lib/ai/gemini';
import { isGeminiConfigured } from '@/lib/ai/settings';

import { ALLOWED_EMAIL_TYPES, type EmailType } from '@/lib/ai/constants';

function isValidEmailType(value: unknown): value is EmailType {
  return (ALLOWED_EMAIL_TYPES as readonly unknown[]).includes(value);
}

export type GenerateEmailResult =
  | { success: true; subject: string; html: string }
  | { success: false; error: string };

export async function generateEmailAction(
  emailType: string,
  prompt: string,
): Promise<GenerateEmailResult> {
  await requireAuth();

  const trimmedPrompt = prompt?.trim();
  if (!trimmedPrompt) {
    return { success: false, error: 'Descreva o conteúdo do e-mail.' };
  }

  if (!isValidEmailType(emailType)) {
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
    const { subject, html } = await generateEmailContent({ emailType, prompt: trimmedPrompt });
    return { success: true, subject, html };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gerar e-mail.';
    return { success: false, error: message };
  }
}
