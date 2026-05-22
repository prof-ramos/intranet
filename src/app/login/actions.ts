'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { loginRateLimiter } from '@/lib/auth/login-rate-limit';
import { loginSchema } from '@/lib/validation/schemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('login');

function isTransientConnectionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  const code = (error as { code?: string }).code;
  return (
    msg.includes('connection closed') ||
    msg.includes('connection terminated') ||
    msg.includes('connection reset') ||
    msg.includes('client has encountered a connection error') ||
    code === '57P01' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED'
  );
}

async function retryTransientConnection<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientConnectionError(error)) {
      throw error;
    }

    logger.warn(
      '[Login] Retrying after transient database connection closure.',
      { error: toSafeErrorLog(error) },
      error as Error,
    );
    return operation();
  }
}

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    redirect('/login?error=1');
  }

  const { email, password } = parsed.data;

  try {
    const rateLimit = await retryTransientConnection(() => loginRateLimiter.consume(email));
    if (!rateLimit.allowed) redirect('/login?error=rate-limit');
  } catch (error) {
    logger.error(
      '[Login] Rate-limit check failed; denying login.',
      { error: toSafeErrorLog(error) },
      error as Error,
    );
    redirect('/login?error=rate-limit');
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect('/login?error=1');
  }

  if (!authUser?.email) {
    await supabase.auth.signOut();
    redirect('/login?error=1');
  }

  const normalizedAuthEmail = authUser.email.trim().toLowerCase();

  const [user] = await retryTransientConnection(() =>
    db
      .select({
        id: admins.id,
        email: admins.email,
        isActive: admins.isActive,
        mustChangePassword: admins.mustChangePassword,
      })
      .from(admins)
      .where(sql`lower(${admins.email}) = ${normalizedAuthEmail}`)
      .limit(1),
  );

  if (!user || !user.isActive) {
    await supabase.auth.signOut();
    redirect('/login?error=1');
  }

  try {
    await retryTransientConnection(() => loginRateLimiter.reset(email));
  } catch (error) {
    logger.warn(
      '[Login] Rate-limit reset failed after successful login.',
      { error: toSafeErrorLog(error) },
      error as Error,
    );
  }
  redirect(user.mustChangePassword ? '/change-password' : '/app');
}
