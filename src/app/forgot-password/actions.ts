'use server';

import { redirect } from 'next/navigation';
import { forgotPasswordSchema } from '@/lib/validation/schemas';
import { requestPasswordReset, RESPONSE_TIME_FLOOR_MS } from '@/lib/auth/password-reset';
import { firstZodError } from '@/lib/server-actions/utils';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:forgot-password');

export async function requestReset(formData: FormData) {
  const startTime = Date.now();

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  });

  if (!parsed.success) {
    redirect(`/forgot-password?error=${encodeURIComponent(firstZodError(parsed.error.issues))}`);
  }

  const { email } = parsed.data;

  try {
    await requestPasswordReset(email);
  } catch (error) {
    logger.error(
      '[forgot-password] Error processing reset request.',
      { error: toSafeErrorLog(error) },
      error as Error,
    );
    // Não revelar erro ao cliente por segurança
  }

  // Garante tempo mínimo de resposta para mitigar timing attack
  const elapsed = Date.now() - startTime;
  const wait = Math.max(0, RESPONSE_TIME_FLOOR_MS - elapsed + Math.floor(Math.random() * 150) + 50);
  await new Promise((resolve) => setTimeout(resolve, wait));

  // Sempre redireciona com mensagem de sucesso (timing-safe)
  redirect('/forgot-password?sent=1');
}
