export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { generateReport } from '@/lib/reports/service';
import { parseReportExportParams } from '@/lib/reports/export-filters';
import { requireReportAccess } from '@/lib/reports/policy';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('reports:download');

export async function GET(request: NextRequest) {
  const clientIp = getTrustedClientIp(request.headers);

  const rateLimit = await consumeIpRateLimit(clientIp, 'report_download', {
    windowMs: 60 * 1000,
    maxRequests: 10,
  });

  if (!rateLimit.allowed) {
    return new Response('Too many requests.', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((rateLimit.retryAfterMs ?? 60000) / 1000)),
      },
    });
  }

  const access = await requireReportAccess();
  if (access instanceof Response) {
    return access;
  }

  const { searchParams } = new URL(request.url);
  const { filters, selectedKeys } = parseReportExportParams(searchParams);

  let csv: string;
  try {
    const result = await generateReport(access.userId, filters, selectedKeys);
    csv = result.csv;
  } catch (error) {
    logger.error(
      '[report-download] failed to generate CSV',
      { error: toSafeErrorLog(error) },
      error as Error,
    );
    return new Response('Falha ao gerar relatório.', { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-asof-${date}.csv"`,
    },
  });
}
