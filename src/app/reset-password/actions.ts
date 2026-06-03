'use server';

import { redirect } from 'next/navigation';
import { resetPasswordSchema } from '@/lib/validation/schemas';
import { consumeResetToken, InvalidResetTokenError } from '@/lib/auth/password-reset';
import { validateNewPassword } from '@/lib/auth/password';
import { firstZodError } from '@/lib/server-actions/utils';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:reset-password');

export async function resetPassword(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    const token = formData.get('token') as string;
    redirect(
      `/reset-password?token=${encodeURIComponent(token || '')}&error=${encodeURIComponent(firstZodError(parsed.error.issues))}`,
    );
  }

  const { token, newPassword } = parsed.data;

  // Valida regras de senha
  const validation = validateNewPassword(newPassword);
  if (!validation.valid) {
    redirect(
      `/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(validation.message)}`,
    );
  }

  try {
    await consumeResetToken(token, newPassword);
  } catch (error) {
    if (error instanceof InvalidResetTokenError) {
      redirect(
        `/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent('Token inválido ou expirado. Solicite uma nova redefinição.')}`,
      );
    }
    logger.error(
      '[reset-password] Error consuming reset token.',
      { error: toSafeErrorLog(error) },
      error as Error,
    );
    redirect(
      `/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent('Não foi possível redefinir a senha. Tente novamente.')}`,
    );
  }

  redirect('/login?reset=success');
}
