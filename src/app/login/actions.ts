'use server';

import { redirect } from 'next/navigation';
import { loginRateLimiter } from '@/lib/auth/login-rate-limit';
import { loginSchema } from '@/lib/validation/schemas';
import { createSession } from '@/lib/auth/session';
import { authenticate } from '@/lib/auth/service';
import { toSafeErrorLog, ensureError } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('login');

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    redirect('/login?error=1');
  }

  const { email, password } = parsed.data;

  let rateLimitAllowed = true;
  try {
    const rateLimit = await loginRateLimiter.consume(email);
    rateLimitAllowed = rateLimit.allowed;
  } catch (error) {
    logger.warn(
      '[Login] Rate-limit check failed; allowing login attempt to proceed.',
      { error: toSafeErrorLog(error) },
      ensureError(error),
    );
  }

  if (!rateLimitAllowed) {
    redirect('/login?error=rate-limit');
  }

  let user;
  try {
    user = await authenticate(email, password);
  } catch (error) {
    logger.warn(
      '[Login] Authentication failed',
      { email, error: toSafeErrorLog(error) },
      ensureError(error),
    );
    redirect('/login?error=1');
  }

  await createSession({ userId: user.id, email: user.email });

  try {
    await loginRateLimiter.reset(email);
  } catch (error) {
    logger.warn(
      '[Login] Rate-limit reset failed after successful login.',
      { error: toSafeErrorLog(error) },
      ensureError(error),
    );
  }
  redirect(user.mustChangePassword ? '/change-password' : '/app');
}
