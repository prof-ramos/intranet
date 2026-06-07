'use server';

import { requireAuth } from '@/lib/auth/require-auth';
import { generateEmailContent } from '@/lib/ai/gemini';
import { isGeminiConfigured } from '@/lib/ai/settings';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';
import { headers } from 'next/headers';

import { ALLOWED_EMAIL_TYPES, type EmailType } from '@/lib/ai/constants';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('secretaria:emails:gerar');

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

  const h = await headers();
  const ip = getTrustedClientIp(h);
  const rateLimitResult = await consumeIpRateLimit(ip, 'ai_generate_email', {
    windowMs: 60 * 1000,
    maxRequests: 5,
  });

  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: `Limite de geração atingido. Tente novamente em ${Math.ceil((rateLimitResult.retryAfterMs ?? 60000) / 1000)} segundos.`,
    };
  }

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
    logger.error('Failed to generate email', { error: toSafeErrorLog(error) }, error instanceof Error ? error : undefined);
    return { success: false, error: 'Falha ao gerar e-mail.' };
  }
}
