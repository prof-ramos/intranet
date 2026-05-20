import { safeCompare } from '@/lib/crypto/safe-compare';
import { env } from '@/lib/env';
import { getRequestId, jsonError, jsonMethodNotAllowed, jsonOk } from '@/lib/integrations/http';
import { checkAndEmitSlaWarnings } from '@/lib/juridico/sla-notifications';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['GET'] as const;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  return authorization.slice('bearer '.length).trim();
}

function authorizeCronRequest(request: Request) {
  const requestId = getRequestId(request);
  const bearerToken = getBearerToken(request);

  if (!bearerToken) {
    return {
      ok: false as const,
      response: jsonError(401, 'unauthorized', 'Cron bearer authorization is required.', {
        requestId,
      }),
    };
  }

  if (!env.CRON_SECRET) {
    return {
      ok: false as const,
      response: jsonError(503, 'integration_auth_misconfigured', 'CRON_SECRET is not configured.', {
        requestId,
      }),
    };
  }

  if (!safeCompare(env.CRON_SECRET, bearerToken)) {
    return {
      ok: false as const,
      response: jsonError(401, 'unauthorized', 'Invalid cron authorization.', {
        requestId,
      }),
    };
  }

  return {
    ok: true as const,
    requestId,
  };
}

function parseLimit(request: Request) {
  const raw = new URL(request.url).searchParams.get('limit');
  if (!raw) {
    return DEFAULT_LIMIT;
  }
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    return null;
  }
  return parsed;
}

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
