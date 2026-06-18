import { authorizeCronRequest } from '@/lib/cron/auth';
import { jsonMethodNotAllowed, jsonOk } from '@/lib/integrations/http';
import { db } from '@/lib/db';
import { integrationSignatureNonces } from '@/lib/db/schema/integrations';
import { lt, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['GET'] as const;

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const result = await db
    .delete(integrationSignatureNonces)
    .where(lt(integrationSignatureNonces.expiresAt, sql`now()`))
    .returning({ id: integrationSignatureNonces.id });

  return jsonOk(
    { mode: 'scheduled', result: { deletedCount: result.length } },
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
