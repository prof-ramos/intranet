import { authorizeCronRequest } from '@/lib/cron/auth';
import { jsonError, jsonMethodNotAllowed, jsonOk } from '@/lib/integrations/http';
import { processBatch } from '@/lib/email-triage/pipeline';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['GET'] as const;
const log = createLogger('email-triage/route');

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const startTime = performance.now();

  try {
    const result = await processBatch();
    const elapsed = Math.round(performance.now() - startTime);

    log.info('Email triage batch completed', {
      processed: result.processed,
      errors: result.errors,
      skipped: result.skipped,
      duration_ms: elapsed,
    });

    return jsonOk({
      processed: result.processed,
      errors: result.errors,
      skipped: result.skipped,
      duration: `${elapsed}ms`,
    }, {
      requestId: authorization.requestId,
    });
  } catch (error) {
    log.error('Email triage batch failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return jsonError(500, 'invalid_request', 'Email triage batch failed.', {
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

export async function PATCH(request: Request) {
  return jsonMethodNotAllowed(ALLOWED_METHODS, {
    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}

export async function DELETE(request: Request) {
  return jsonMethodNotAllowed(ALLOWED_METHODS, {
    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}
