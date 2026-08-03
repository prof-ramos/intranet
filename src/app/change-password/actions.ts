'use server';

// not defineFormAction: intentional holdout — custom redirect-on-error
// (query-string errors) cannot map to the factory without changing public UX.
// See #255 / plan 017.

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
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
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';

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

  const requestHeaders = await headers();
  const rateLimitOptions = { windowMs: 15 * 60_000, maxRequests: 5 };
  const [ipRateLimit, accountRateLimit] = await Promise.all([
    consumeIpRateLimit(
      getTrustedClientIp(requestHeaders),
      'change_password_current_password',
      rateLimitOptions,
    ),
    // The rate-limit store accepts an opaque key. A per-account budget prevents
    // a stolen session from bypassing the control simply by rotating source IPs.
    consumeIpRateLimit(
      `account:${user.userId}`,
      'change_password_current_password',
      rateLimitOptions,
    ),
  ]);
  if (!ipRateLimit.allowed || !accountRateLimit.allowed) {
    changePasswordError('Muitas tentativas. Aguarde alguns minutos.');
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
