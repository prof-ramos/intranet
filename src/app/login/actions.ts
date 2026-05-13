'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { loginRateLimiter } from '@/lib/auth/login-rate-limit';
import { loginSchema } from '@/lib/validation/schemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

    console.warn('[Login] Retrying after transient database connection closure.');
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
    console.error('[Login] Rate-limit check failed; denying login.', {
      error: error instanceof Error ? error.message : 'unknown',
    });
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

  const [user] = await retryTransientConnection(() =>
    db
      .select({
        id: admins.id,
        email: admins.email,
        isActive: admins.isActive,
        mustChangePassword: admins.mustChangePassword,
      })
      .from(admins)
      .where(eq(admins.email, authUser.email!.toLowerCase()))
      .limit(1),
  );

  if (!user || !user.isActive) {
    await supabase.auth.signOut();
    redirect('/login?error=1');
  }

  try {
    await retryTransientConnection(() => loginRateLimiter.reset(email));
  } catch (error) {
    console.warn('[Login] Rate-limit reset failed after successful login.', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
  redirect(user.mustChangePassword ? '/change-password' : '/app');
}
