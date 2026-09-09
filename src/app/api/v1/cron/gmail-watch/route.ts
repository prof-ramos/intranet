import { authorizeCronRequest } from '@/lib/cron/auth';
import { jsonMethodNotAllowed, jsonOk } from '@/lib/integrations/http';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['GET'] as const;

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  return jsonOk(
    { mode: 'scheduled', skipped: 'gmail_webhook_deactivated' },
    { requestId: authorization.requestId },
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

export async function DELETE(request: Request) {
  return jsonMethodNotAllowed(ALLOWED_METHODS, {
    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}
