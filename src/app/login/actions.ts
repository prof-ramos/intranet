'use server';

import { redirect } from 'next/navigation';
import { createSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { loginRateLimiter } from '@/lib/auth/login-rate-limit';

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) redirect('/login?error=1');

  const rateLimit = loginRateLimiter.consume(email);
  if (!rateLimit.allowed) redirect('/login?error=rate-limit');

  const user = await db.select().from(admins)
    .where(eq(admins.email, email)).get();

  // Always run bcrypt.compare to prevent timing-based user enumeration.
  const DUMMY_HASH = '$2b$12$..AtteJQVcIwONDECxQ3cue37ZA4VVeOy9MIxxuWQ4i6h4bjKJ3NK';
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.isActive || !valid) redirect('/login?error=1');

  loginRateLimiter.reset(email);

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    isLoggedIn: true,
  });

  redirect('/app');
}
