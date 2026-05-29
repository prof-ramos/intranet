import { authorizeCronRequest, parseLimit } from '@/lib/cron/auth';
import { createMethodNotAllowedHandlers } from '@/lib/cron/method-not-allowed';
import { jsonError, jsonOk } from '@/lib/integrations/http';
import { checkAndEmitSlaWarnings } from '@/lib/juridico/sla-notifications';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['GET'] as const;
const { POST, PUT, PATCH, DELETE } = createMethodNotAllowedHandlers(ALLOWED_METHODS);

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const limit = parseLimit(request);
  if (limit == null) {
    return jsonError(400, 'invalid_request', 'limit must be an integer between 1 and 100.', {
      requestId: authorization.requestId,
    });
  }

  const result = await checkAndEmitSlaWarnings({ limit });

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
