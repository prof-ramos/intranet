import { eq } from 'drizzle-orm';
import { type AuthRole, getDevAuthUser, isSkipAuthEnabled } from '@/lib/auth/config';
import { getSession } from '@/lib/auth/session';
import { admins } from '@/lib/db/schema';

export interface ReportAccess {
  userId: number;
}

export function canGenerateReports(role: AuthRole | string): boolean {
  return role === 'admin' || role === 'diretoria';
}

export async function requireReportAccess(): Promise<ReportAccess | Response> {
  if (isSkipAuthEnabled()) {
    const user = getDevAuthUser();
    return canGenerateReports(user.role)
      ? { userId: user.userId }
      : new Response(null, { status: 403 });
  }

  const session = await getSession();
  if (!session?.isLoggedIn || !session.userId) {
    return new Response(null, { status: 302, headers: { Location: '/login' } });
  }

  let user: { role: AuthRole; isActive: boolean } | undefined;
  try {
    // Importacao tardia evita inicializacao do DB durante o build do Next.js.
    const { db } = await import('@/lib/db');
    [user] = await db
      .select({ role: admins.role, isActive: admins.isActive })
      .from(admins)
      .where(eq(admins.id, session.userId))
      .limit(1);
  } catch (error) {
    console.error('[reports] failed to fetch admin by session user id', {
      error,
      userId: session.userId,
    });
    return new Response('Não foi possível validar o acesso ao relatório.', { status: 500 });
  }

  if (!user) {
    return new Response('Sessão inválida.', { status: 401 });
  }

  if (!user.isActive) {
    return new Response(null, { status: 302, headers: { Location: '/login' } });
  }

  if (!canGenerateReports(user.role)) {
    return new Response(null, { status: 403 });
  }

  return { userId: session.userId };
}
