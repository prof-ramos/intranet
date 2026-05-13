import { requireRole } from '@/lib/auth/authorization';

export interface ReportAccess {
  userId: number;
}

export async function requireReportAccess(): Promise<ReportAccess | Response> {
  try {
    const user = await requireRole(['admin', 'diretoria']);
    return { userId: user.userId };
  } catch {
    return new Response(null, { status: 403 });
  }
}