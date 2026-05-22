import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { jsonError, jsonOk } from '@/lib/integrations/http';
import { getIntegrationRateLimitKey, integrationRateLimiter } from '@/lib/integrations/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rateLimitResult = await integrationRateLimiter.consume(getIntegrationRateLimitKey(request));
  if (!rateLimitResult.allowed) {
    return jsonError(429, 'rate_limit_exceeded', 'Too many requests. Please try again later.', {
      details: { retryAfterMs: rateLimitResult.retryAfterMs },
    });
  }

  const authorization = await authorizeIntegrationRequest(request, {
    allowSessionRoles: ['admin', 'diretoria'],
    requiredScopes: ['health:read'],
  });

  if (!authorization.ok) {
    return authorization.response;
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
    },
    {
      requestId: authorization.requestId,
    },
  );
}
