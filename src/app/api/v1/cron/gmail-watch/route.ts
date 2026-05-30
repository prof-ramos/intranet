import { authorizeCronRequest } from '@/lib/cron/auth';
import { jsonError, jsonOk, jsonMethodNotAllowed } from '@/lib/integrations/http';
import { getGmailAccessToken, watchGmail } from '@/lib/email-triage/gmail';
import { createLogger } from '@/lib/logger';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['POST'] as const;
const log = createLogger('gmail-watch');

export async function POST(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const topicName = env.GMAIL_WATCH_TOPIC;
  if (!topicName) {
    return jsonError(500, 'invalid_request', 'GMAIL_WATCH_TOPIC not configured.', {
      requestId: authorization.requestId,
    });
  }

  const startTime = performance.now();

  try {
    log.info('Renewing Gmail watch...', { topic: topicName });

    const accessToken = await getGmailAccessToken();
    const result = await watchGmail(accessToken, topicName);

    const elapsed = Math.round(performance.now() - startTime);

    log.info('Gmail watch renewed successfully.', {
      historyId: result.historyId,
      expiration: result.expiration,
      duration_ms: elapsed,
    });

    return jsonOk({
      status: 'ok',
      historyId: result.historyId,
      expiration: result.expiration,
      duration: `${elapsed}ms`,
    }, {
      requestId: authorization.requestId,
    });
  } catch (error) {
    const elapsed = Math.round(performance.now() - startTime);
    log.error('Gmail watch renewal failed.', {
      error: error instanceof Error ? error.message : String(error),
      duration_ms: elapsed,
    });

    return jsonError(500, 'invalid_request', 'Gmail watch renewal failed.', {
      requestId: authorization.requestId,
    });
  }
}

export async function GET(request: Request) {
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
