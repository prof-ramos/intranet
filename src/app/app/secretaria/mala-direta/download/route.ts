export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/authorization';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';
import { exportGmailContactsCsv, parseMalaDiretaFilters } from '@/lib/mala-direta';

const logger = createLogger('mala-direta:download');

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireRole(['admin', 'diretoria', 'secretaria']);
  } catch {
    return new Response(null, { status: 403 });
  }

  const clientIp = getTrustedClientIp(request.headers);
  const rateLimit = await consumeIpRateLimit(clientIp, 'mala_direta_gmail_csv', {
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

  const { searchParams } = new URL(request.url);
  const filters = parseMalaDiretaFilters(searchParams);

  let csv: string;
  try {
    const result = await exportGmailContactsCsv(user.userId, filters);
    csv = result.csv;
  } catch (error) {
    logger.error(
      '[mala-direta-download] failed to generate CSV',
      { error: toSafeErrorLog(error) },
      error as Error,
    );
    return new Response('Falha ao gerar a lista de contatos.', { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mala-direta-gmail-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
