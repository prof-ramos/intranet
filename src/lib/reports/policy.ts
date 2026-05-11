import { type AuthRole, getDevAuthUser, isSkipAuthEnabled } from '@/lib/auth/config';
import { isPrivilegedRole } from '@/lib/auth/permissions';
import { getSession } from '@/lib/auth/session';

export interface ReportAccess {
  userId: number;
}

export function canGenerateReports(role: AuthRole | string): boolean {
  return isPrivilegedRole(role);
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

  const { requireAuth } = await import('@/lib/auth/require-auth');
  try {
    const user = await requireAuth();
    return { userId: user.userId };
  } catch {
    return new Response(null, { status: 302, headers: { Location: '/login' } });
  }
}