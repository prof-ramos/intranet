'use server';

import { redirect } from 'next/navigation';
import { forgotPasswordSchema } from '@/lib/validation/schemas';
import { requestPasswordReset } from '@/lib/auth/password-reset';
import { firstZodError } from '@/lib/server-actions/utils';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:forgot-password');

export async function requestReset(formData: FormData) {
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

  // Sempre redireciona com mensagem de sucesso (timing-safe)
  redirect('/forgot-password?sent=1');
}
