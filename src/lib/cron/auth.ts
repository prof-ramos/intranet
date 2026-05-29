import { safeCompare } from '@/lib/crypto/safe-compare';
import { env } from '@/lib/env';
import { getRequestId, jsonError } from '@/lib/integrations/http';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  return authorization.slice('bearer '.length).trim();
}

export function authorizeCronRequest(request: Request) {
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

export function parseLimit(request: Request, defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT) {
  const raw = new URL(request.url).searchParams.get('limit');
  if (!raw) {
    return defaultLimit;
  }
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxLimit) {
    return null;
  }
  return parsed;
}
