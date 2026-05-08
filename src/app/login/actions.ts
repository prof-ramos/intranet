'use server';

import { redirect } from 'next/navigation';
import { createSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) redirect('/login?error=1');

  const user = await db.select().from(admins)
    .where(eq(admins.email, email)).get();

  // Always run bcrypt.compare to prevent timing-based user enumeration.
  const DUMMY_HASH = '$2a$12$aaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.isActive || !valid) redirect('/login?error=1');

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
