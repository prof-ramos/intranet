'use server';

// not defineFormAction: intentional holdout — custom redirect-on-error
// (query-string errors, timing floor) cannot map to the factory without
// changing public UX. See #255 / plan 017.

import { redirect } from 'next/navigation';
import { randomInt } from 'node:crypto';
import { forgotPasswordSchema } from '@/lib/validation/schemas';
import { requestPasswordReset, RESPONSE_TIME_FLOOR_MS } from '@/lib/auth/password-reset';
import { firstZodError } from '@/lib/server-actions/utils';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';
import { headers } from 'next/headers';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';

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

  let requestAllowed = false;
  try {
    const requestHeaders = await headers();
    const [ipBudget, globalBudget] = await Promise.all([
      consumeIpRateLimit(
        getTrustedClientIp(requestHeaders),
        'forgot_password',
        { windowMs: 15 * 60_000, maxRequests: 20 },
      ),
      consumeIpRateLimit('global', 'forgot_password', {
        windowMs: 15 * 60_000,
        maxRequests: 200,
      }),
    ]);
    requestAllowed = ipBudget.allowed && globalBudget.allowed;
  } catch (error) {
    logger.warn(
      '[forgot-password] Rate-limit check failed; denying request.',
      { error: toSafeErrorLog(error) },
      error instanceof Error ? error : undefined,
    );
  }

  if (requestAllowed) {
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
  }

  // Garante tempo mínimo de resposta para mitigar timing attack
  const elapsed = Date.now() - startTime;
  const wait = Math.max(0, RESPONSE_TIME_FLOOR_MS - elapsed + randomInt(50, 200));
  await new Promise((resolve) => setTimeout(resolve, wait));

  // Sempre redireciona com mensagem de sucesso (timing-safe)
  redirect('/forgot-password?sent=1');
}
