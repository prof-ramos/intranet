import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { type AuthUser } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { toSafeErrorLog } from '@/lib/error-log';

export const requireAuth = cache(async (): Promise<AuthUser> => {
  const session = await getSession();
  if (!session?.isLoggedIn) {
    redirect('/login');
  }

  let admin:
    | {
        id: number;
        name: string;
        email: string;
        role: AuthUser['role'];
        isActive: boolean;
        mustChangePassword: boolean;
      }
    | undefined;

  try {
    const result = await db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        role: admins.role,
        isActive: admins.isActive,
        mustChangePassword: admins.mustChangePassword,
      })
      .from(admins)
      .where(eq(admins.id, session.userId))
      .limit(1);
    admin = result[0];
  } catch (error) {
    console.error('requireAuth DB query failed', { error: toSafeErrorLog(error) });
    redirect('/login');
  }

  if (!admin || !admin.isActive) {
    redirect('/login');
  }

  return {
    userId: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
  };
});
