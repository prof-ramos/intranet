export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { getAssociatesForReport } from '@/lib/reports/queries';
import { generateCsv } from '@/lib/reports/csv';
import { auditReportDownload } from '@/lib/reports/audit';
import { parseReportExportParams } from '@/lib/reports/export-filters';
import { requireReportAccess } from '@/lib/reports/policy';
import { consumeIpRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

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

  let rows: Awaited<ReturnType<typeof getAssociatesForReport>>;
  let csv: string;
  try {
    rows = await getAssociatesForReport(filters);
    csv = generateCsv(rows, selectedKeys);
  } catch (error) {
    console.error('[report-download] failed to generate CSV', { error });
    return new Response('Falha ao gerar relatório.', { status: 500 });
  }

  try {
    await auditReportDownload(access.userId, filters, selectedKeys, rows.length);
  } catch (error) {
    console.warn('[report-download] failed to persist audit log', { error });
  }

  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-asof-${date}.csv"`,
    },
  });
}
