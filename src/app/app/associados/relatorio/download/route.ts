export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDevAuthUser, isSkipAuthEnabled } from '@/lib/auth/config';
import { getAssociatesForReport } from '@/lib/reports/queries';
import { generateCsv } from '@/lib/reports/csv';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function isFunctionalStatus(v: string): v is 'ativo' | 'aposentado' | 'cedido' | 'em_licenca' {
  return ['ativo', 'aposentado', 'cedido', 'em_licenca'].includes(v);
}

function isAssociationStatus(v: string): v is 'ativo' | 'inativo' {
  return ['ativo', 'inativo'].includes(v);
}

function isContributionStatus(
  v: string,
): v is 'em_dia' | 'inadimplente' | 'pendente_migracao' {
  return ['em_dia', 'inadimplente', 'pendente_migracao'].includes(v);
}

function canGenerateReports(role: string) {
  return role === 'admin' || role === 'diretoria';
}

export async function GET(request: NextRequest) {
  if (isSkipAuthEnabled()) {
    const user = getDevAuthUser();
    if (!canGenerateReports(user.role)) {
      return new Response(null, { status: 403 });
    }
  } else {
    const session = await getSession();
    if (!session?.isLoggedIn || !session.userId) {
      return new Response(null, { status: 302, headers: { Location: '/login' } });
    }

    // Importação tardia evita inicialização do DB durante o build do Next.js.
    const { db } = await import('@/lib/db');
    const [user] = await db
      .select({ role: admins.role, isActive: admins.isActive })
      .from(admins)
      .where(eq(admins.id, session.userId))
      .limit(1);

    if (!user?.isActive) {
      return new Response(null, { status: 302, headers: { Location: '/login' } });
    }

    if (!canGenerateReports(user.role)) {
      return new Response(null, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const selectedKeys = searchParams.getAll('fields');

  const filters: Parameters<typeof getAssociatesForReport>[0] = {};

  const functionalStatusParam = searchParams.get('functionalStatus');
  if (functionalStatusParam && functionalStatusParam !== 'todos' && isFunctionalStatus(functionalStatusParam)) {
    filters.functionalStatus = functionalStatusParam;
  }

  const associationStatusParam = searchParams.get('associationStatus');
  if (associationStatusParam && associationStatusParam !== 'todos' && isAssociationStatus(associationStatusParam)) {
    filters.associationStatus = associationStatusParam;
  }

  const contributionStatusParam = searchParams.get('contributionStatus');
  if (contributionStatusParam && contributionStatusParam !== 'todos' && isContributionStatus(contributionStatusParam)) {
    filters.contributionStatus = contributionStatusParam;
  }

  const birthMonthParam = searchParams.get('birthMonth');
  if (birthMonthParam && birthMonthParam !== 'todos') {
    const month = parseInt(birthMonthParam, 10);
    if (month >= 1 && month <= 12) {
      filters.birthMonth = month;
    }
  }

  const rows = await getAssociatesForReport(filters);
  const csv = generateCsv(rows, selectedKeys);

  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-asof-${date}.csv"`,
    },
  });
}
