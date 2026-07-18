'use server';

// not defineFormAction: intentional holdout — custom redirect-on-error
// (query-string errors) cannot map to the factory without changing public UX.
// See #255 / plan 017.

import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/require-auth';
import { destroySession } from '@/lib/auth/session';
import { validateNewPassword } from '@/lib/auth/password';
import {
  changePassword as changePasswordService,
  AdminNotFoundError,
  InvalidCurrentPasswordError,
} from '@/lib/auth/service';
import { firstZodError } from '@/lib/server-actions/utils';
import { changePasswordSchema } from '@/lib/validation/schemas';
import { ensureError, toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:change-password');

function changePasswordError(message: string): never {
  redirect(`/change-password?error=${encodeURIComponent(message)}`);
}

export async function changePassword(formData: FormData) {
  const user = await requireAuth();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    changePasswordError(firstZodError(parsed.error.issues));
  }

  const { currentPassword, newPassword } = parsed.data;

  const validation = validateNewPassword(newPassword);
  if (!validation.valid) {
    changePasswordError(validation.message);
  }

  if (!user.email) {
    changePasswordError('Sessão inválida.');
  }

  try {
    await changePasswordService(user.userId, currentPassword, newPassword);
  } catch (error) {
    if (error instanceof InvalidCurrentPasswordError) {
      changePasswordError('Senha atual inválida.');
    }
    if (error instanceof AdminNotFoundError) {
      changePasswordError('Sessão inválida.');
    }
    logger.error(
      '[change-password] failed to persist new password hash',
      { error: toSafeErrorLog(error) },
      error as Error,
    );
    changePasswordError('Não foi possível concluir a alteração de senha.');
  }

  try {
    await destroySession();
  } catch (error) {
    logger.error(
      '[change-password] failed to destroy the rotated session cookie',
      { error: toSafeErrorLog(error) },
      ensureError(error),
    );
  }
  redirect('/login?reset=success');
}
