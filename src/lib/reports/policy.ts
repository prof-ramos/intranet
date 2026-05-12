import { type AuthRole, getDevAuthUser, isSkipAuthEnabled } from '@/lib/auth/config';
import { isPrivilegedRole } from '@/lib/auth/permissions';
import { getSession } from '@/lib/auth/session';

export interface ReportAccess {
  userId: number;
}

export async function requireReportAccess(): Promise<ReportAccess | Response> {
  if (isSkipAuthEnabled()) {
    const user = getDevAuthUser();
    return isPrivilegedRole(user.role)
      ? { userId: user.userId }
      : new Response(null, { status: 403 });
  }

  const session = await getSession();
  if (!session?.isLoggedIn || !session.userId) {
    return new Response(null, { status: 302, headers: { Location: '/login' } });
  }

  try {
    const { requireAuth } = await import('@/lib/auth/require-auth');
    const user = await requireAuth();
    if (!isPrivilegedRole(user.role)) {
      return new Response(null, { status: 403 });
    }
    return { userId: user.userId };
  } catch {
    return new Response(null, { status: 302, headers: { Location: '/login' } });
  }
}