import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { jsonError, jsonOk } from '@/lib/integrations/http';
import {
  getIntegrationPreAuthRateLimitKey,
  getIntegrationPrincipalRateLimitKey,
  integrationPreAuthRateLimiter,
  integrationPrincipalRateLimiter,
} from '@/lib/integrations/rate-limit';
import { normalizeFullGitSha } from '@/lib/smoke/runtime-contract';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const preAuthRateLimit = await integrationPreAuthRateLimiter.consume(
    getIntegrationPreAuthRateLimitKey(request),
  );
  if (!preAuthRateLimit.allowed) {
    return jsonError(429, 'rate_limit_exceeded', 'Too many requests. Please try again later.', {
      details: { retryAfterMs: preAuthRateLimit.retryAfterMs },
    });
  }

  const authorization = await authorizeIntegrationRequest(request, {
    allowSessionRoles: ['admin', 'diretoria'],
    requiredScopes: ['health:read'],
  });

  if (!authorization.ok) {
    return authorization.response;
  }

  const principalRateLimit = await integrationPrincipalRateLimiter.consume(
    getIntegrationPrincipalRateLimitKey(authorization.principal),
  );
  if (!principalRateLimit.allowed) {
    return jsonError(429, 'rate_limit_exceeded', 'Too many requests. Please try again later.', {
      requestId: authorization.requestId,
      details: { retryAfterMs: principalRateLimit.retryAfterMs },
    });
  }

  return jsonOk(
    {
      service: 'asof-intranet',
      scope: 'integrations',
      status: 'ok',
      auth: {
        authenticated: true,
        principalType: authorization.principal.kind,
      },
      capabilities: {
        inboundEvents: false,
        outboundWebhooks: true,
      },
      deployment: {
        gitCommitSha: normalizeFullGitSha(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA),
      },
    },
    {
      requestId: authorization.requestId,
    },
  );
}
