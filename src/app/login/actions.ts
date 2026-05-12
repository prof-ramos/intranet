'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { loginRateLimiter } from '@/lib/auth/login-rate-limit';
import { loginSchema } from '@/lib/validation/schemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    redirect('/login?error=1');
  }

  const { email, password } = parsed.data;

  const rateLimit = await loginRateLimiter.consume(email);
  if (!rateLimit.allowed) redirect('/login?error=rate-limit');

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

  const [user] = await db
    .select({
      id: admins.id,
      email: admins.email,
      isActive: admins.isActive,
      mustChangePassword: admins.mustChangePassword,
    })
    .from(admins)
    .where(eq(admins.email, authUser.email.toLowerCase()))
    .limit(1);

  if (!user || !user.isActive) {
    await supabase.auth.signOut();
    redirect('/login?error=1');
  }

  await loginRateLimiter.reset(email);
  redirect(user.mustChangePassword ? '/change-password' : '/app');
}
