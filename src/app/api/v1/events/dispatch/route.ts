import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { authorizeCronRequest, parseLimit } from '@/lib/cron/auth';
import { createMethodNotAllowedHandlers } from '@/lib/cron/method-not-allowed';
import { jsonError, jsonOk } from '@/lib/integrations/http';
import { dispatchPendingDomainEvents } from '@/lib/integrations/webhooks/service';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['GET'] as const;
const { POST, PUT, PATCH, DELETE } = createMethodNotAllowedHandlers(ALLOWED_METHODS);

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const limit = parseLimit(request, 20);
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

export { POST, PUT, PATCH, DELETE };
