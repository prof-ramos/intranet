import { cache } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { type AuthUser } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { toSafeErrorLog, ensureError } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:require-auth');

function pathnameFromHeaders(reqHeaders: Headers): string {
  const explicitPathname = reqHeaders.get('x-pathname');
  if (explicitPathname) {
    return explicitPathname;
  }

  const nextUrl = reqHeaders.get('next-url');
  if (!nextUrl) {
    return '';
  }

  try {
    return new URL(nextUrl).pathname;
  } catch {
    return '';
  }
}

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

  let dbFailed = false;
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
    logger.error('requireAuth DB query failed', { error: toSafeErrorLog(error) }, ensureError(error));
    dbFailed = true;
  }

  if (dbFailed || !admin || !admin.isActive) {
    redirect('/login');
  }

  if (admin.mustChangePassword) {
    const reqHeaders = await headers();
    const pathname = pathnameFromHeaders(reqHeaders);
    if (!pathname.startsWith('/change-password')) {
      redirect('/change-password');
    }
  }

  return {
    userId: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
  };
});
