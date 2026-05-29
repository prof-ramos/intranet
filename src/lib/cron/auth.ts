import { safeCompare } from '@/lib/crypto/safe-compare';
import { env } from '@/lib/env';
import { getRequestId, jsonError } from '@/lib/integrations/http';

export function authorizeCronRequest(request: Request) {
  const requestId = getRequestId(request);
  const raw = request.headers.get('authorization')?.trim() ?? '';
  const bearerToken = raw.toLowerCase().startsWith('bearer ')
    ? raw.slice('bearer '.length).trim()
    : null;

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

  return { ok: true as const, requestId };
}

const MAX_LIMIT = 100;

export function parseLimit(request: Request, defaultLimit: number) {
  const raw = new URL(request.url).searchParams.get('limit');
  if (!raw) return defaultLimit;
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) return null;
  return parsed;
}
