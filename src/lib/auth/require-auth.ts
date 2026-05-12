import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { type AuthUser } from '@/lib/auth/config';

export { requireRole } from '@/lib/auth/authorization';

export const requireAuth = cache(async (): Promise<AuthUser> => {
  const session = await getSession();
  if (!session?.isLoggedIn) {
    redirect('/login');
  }

  return {
    userId: session.userId,
    name: session.name,
    email: session.email,
    role: session.role,
    mustChangePassword: session.mustChangePassword,
  };
});
