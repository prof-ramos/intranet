import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import { buildCampaignEtiquetasCsv } from '@/lib/mailing';
import { requireRole } from '@/lib/auth/authorization';
import { logDataAccess } from '@/lib/audit/service';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';

const logger = createLogger('mailing:etiquetas-csv');

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(['admin', 'diretoria', 'secretaria']);
    const rateLimitOptions = { windowMs: 60_000, maxRequests: 10 };
    const [ipRateLimit, accountRateLimit] = await Promise.all([
      consumeIpRateLimit(
        getTrustedClientIp(req.headers),
        'mailing_etiquetas_csv',
        rateLimitOptions,
      ),
      consumeIpRateLimit(`account:${user.userId}`, 'mailing_etiquetas_csv', rateLimitOptions),
    ]);
    if (!ipRateLimit.allowed || !accountRateLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde um momento.' },
        { status: 429 },
      );
    }

    const { id } = await params;
    const campaignId = Number(id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return NextResponse.json({ error: 'Campanha inválida.' }, { status: 400 });
    }

    const csv = await buildCampaignEtiquetasCsv(campaignId);

    await logDataAccess({
      adminId: user.userId,
      action: 'export',
      entityType: 'associate',
      metadata: {
        format: 'csv_labels',
        campaignId,
      },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="etiquetas-campanha-${campaignId}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error(
      'Erro ao gerar CSV da campanha',
      { error: toSafeErrorLog(error) },
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json({ error: 'Não foi possível gerar o CSV.' }, { status: 500 });
  }
}
