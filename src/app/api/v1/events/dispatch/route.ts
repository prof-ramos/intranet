import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { authorizeCronRequest, parseLimit } from '@/lib/cron/auth';
import { jsonError, jsonMethodNotAllowed, jsonOk } from '@/lib/integrations/http';
import { dispatchPendingDomainEvents } from '@/lib/integrations/webhooks/service';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['GET'] as const;
const DEFAULT_LIMIT = 20;

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const limit = parseLimit(request, DEFAULT_LIMIT);
  if (limit == null) {
    return jsonError(400, 'invalid_request', 'limit must be an integer between 1 and 100.', {
      requestId: authorization.requestId,
    });
  }

  const result = await dispatchPendingDomainEvents(limit);

  await db.insert(auditLogs).values({
    action: 'domain_event_dispatch_scheduled',
    entityType: 'domain_event',
    entityId: null,
    performedBy: null,
    changes: null,
    metadata: {
      limit,
      result,
    },
  });

  return jsonOk(
    {
      mode: 'scheduled',
      result,
    },
    {
      requestId: authorization.requestId,
    },
  );
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
