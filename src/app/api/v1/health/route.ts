import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { jsonOk } from '@/lib/integrations/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authorization = await authorizeIntegrationRequest(request, {
    allowSessionRoles: ['admin', 'diretoria'],
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
