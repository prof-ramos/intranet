import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getDevAuthUser, isSkipAuthEnabled, type AuthUser } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const requireAuth = cache(async (): Promise<AuthUser> => {
  if (isSkipAuthEnabled()) {
    return getDevAuthUser();
  }

  const session = await getSession();
  if (!session?.isLoggedIn) {
    redirect('/login');
  }

  const user = await db
    .select()
    .from(admins)
    .where(eq(admins.id, session.userId))
    .get();

  if (!user || !user.isActive) {
    redirect('/login');
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
});
