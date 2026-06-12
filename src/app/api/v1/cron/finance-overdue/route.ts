import { authorizeCronRequest } from '@/lib/cron/auth';
import { jsonError, jsonOk, jsonMethodNotAllowed } from '@/lib/integrations/http';
import { autoMarkOverduePaymentsService } from '@/lib/finance/service';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['GET'] as const;
const log = createLogger('cron:finance-overdue');

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const startTime = performance.now();

  try {
    log.info('Running autoMarkOverduePayments...');
    const count = await autoMarkOverduePaymentsService();
    const elapsed = Math.round(performance.now() - startTime);

    log.info('autoMarkOverduePayments completed.', {
      transitioned: count,
      duration_ms: elapsed,
    });

    return jsonOk(
      { status: 'ok', transitioned: count, duration: `${elapsed}ms` },
      { requestId: authorization.requestId },
    );
  } catch (error) {
    const elapsed = Math.round(performance.now() - startTime);
    log.error('autoMarkOverduePayments failed.', {
      error: error instanceof Error ? error.message : String(error),
      duration_ms: elapsed,
    });

    return jsonError(500, 'invalid_request', 'autoMarkOverduePayments failed.', {
      requestId: authorization.requestId,
    });
  }
}

export async function POST(request: Request) {
  return jsonMethodNotAllowed(ALLOWED_METHODS, {
    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}

export async function PUT(request: Request) {
  return jsonMethodNotAllowed(ALLOWED_METHODS, {
    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}

export async function DELETE(request: Request) {
  return jsonMethodNotAllowed(ALLOWED_METHODS, {
    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}
