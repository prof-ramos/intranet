import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import { generateCampaignEtiquetasPdf } from '@/lib/mailing';
import { requireRole } from '@/lib/auth/authorization';
import { logDataAccess } from '@/lib/audit/service';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';

const logger = createLogger('mailing:etiquetas-pdf');

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(['admin', 'diretoria', 'secretaria']);
    const rateLimitOptions = { windowMs: 60_000, maxRequests: 10 };
    const [ipRateLimit, accountRateLimit] = await Promise.all([
      consumeIpRateLimit(
        getTrustedClientIp(req.headers),
        'mailing_etiquetas_pdf',
        rateLimitOptions,
      ),
      consumeIpRateLimit(`account:${user.userId}`, 'mailing_etiquetas_pdf', rateLimitOptions),
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

    const pdfBytes = await generateCampaignEtiquetasPdf(campaignId);

    await logDataAccess({
      adminId: user.userId,
      action: 'export',
      entityType: 'associate',
      metadata: {
        format: 'pdf_labels',
        campaignId,
      },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="etiquetas-campanha-${campaignId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error(
      'Erro ao gerar etiquetas da campanha',
      { error: toSafeErrorLog(error) },
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: 'Não foi possível gerar o PDF de etiquetas.' },
      { status: 500 },
    );
  }
}
