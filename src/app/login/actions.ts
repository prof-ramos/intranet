'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { loginRateLimiter } from '@/lib/auth/login-rate-limit';
import { loginSchema } from '@/lib/validation/schemas';
import { createSession } from '@/lib/auth/session';
import { authenticate, InvalidCredentialsError } from '@/lib/auth/service';
import { sanitizePiiValue } from '@/lib/sanitize-pii';
import { toSafeErrorLog, ensureError } from '@/lib/error-log';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';
import { createLogger } from '@/lib/logger';

const logger = createLogger('login');

function toLoginLogContext(value: unknown): Record<string, unknown> {
  const sanitized = sanitizePiiValue(value);
  if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    return Object.fromEntries(Object.entries(sanitized));
  }
  return { value: sanitized };
}

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    logger.warn('[Login] Invalid login form submission', {
      reason: 'validation_failed',
      issues: parsed.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join('.'),
      })),
    });
    redirect('/login?error=1');
  }

  const { email, password } = parsed.data;

  // ponytail: IP rate limit before email rate limit (fail-closed — deny by default)
  let ipRateLimitAllowed = false;
  try {
    const h = await headers();
    const ip = getTrustedClientIp(h);
    const ipLimit = await consumeIpRateLimit(ip, 'login', {
      windowMs: 15 * 60 * 1000,
      maxRequests: 200,
    });
    ipRateLimitAllowed = ipLimit.allowed;
  } catch (error) {
    logger.warn(
      '[Login] IP rate-limit check failed; blocking login attempt.',
      { error: toSafeErrorLog(error) },
      ensureError(error),
    );
    redirect('/login?error=1');
  }

  if (!ipRateLimitAllowed) {
    logger.warn('[Login] IP rate limit exceeded', { reason: 'ip_rate_limited' });
    redirect('/login?error=rate-limit');
  }

  let rateLimitAllowed = false;
  try {
    const rateLimit = await loginRateLimiter.consume(email);
    rateLimitAllowed = rateLimit.allowed;
  } catch (error) {
    logger.warn(
      '[Login] Email rate-limit check failed; blocking login attempt.',
      { error: toSafeErrorLog(error) },
      ensureError(error),
    );
    redirect('/login?error=1');
  }

  if (!rateLimitAllowed) {
    logger.warn('[Login] Login rate limit exceeded', {
      reason: 'rate_limited',
    });
    redirect('/login?error=rate-limit');
  }

  let user;
  try {
    user = await authenticate(email, password);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      logger.warn(
        '[Login] Authentication failed',
        toLoginLogContext({
          reason: 'invalid_credentials',
          error: toSafeErrorLog(error),
        }),
        ensureError(error),
      );
    } else {
      logger.error(
        '[Login] Authentication error',
        {
          reason: 'auth_error',
          error: toSafeErrorLog(error),
        },
        ensureError(error),
      );
    }
    redirect('/login?error=1');
  }

  try {
    await loginRateLimiter.reset(email);
    await createSession({ userId: user.id, email: user.email });
    return redirect(user.mustChangePassword ? '/change-password' : '/app');
  } catch (error) {
    logger.warn(
      '[Login] Rate-limit reset failed after successful login.',
      { error: toSafeErrorLog(error) },
      ensureError(error),
    );
  }
  redirect(user.mustChangePassword ? '/change-password' : '/app');
}
