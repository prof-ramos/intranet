import { z } from 'zod';
import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { jsonError, jsonMethodNotAllowed, jsonOk } from '@/lib/integrations/http';
import { dispatchDomainEventById, dispatchPendingDomainEvents } from '@/lib/integrations/webhooks/service';
import { getClientIp, integrationRateLimiter } from '@/lib/integrations/rate-limit';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:events');

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = ['GET', 'POST'] as const;
const dispatchEventSchema = z
  .object({
    eventId: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();

async function auditEventDispatch(input: {
  action: 'domain_event_dispatch_single' | 'domain_event_dispatch_batch';
  performedBy: number | null;
  eventId: number | null;
  limit: number | null;
  result: unknown;
}) {
  try {
    await db.insert(auditLogs).values({
      action: input.action,
      entityType: 'domain_event',
      entityId: input.eventId,
      performedBy: input.performedBy,
      changes: null,
      metadata: {
        eventId: input.eventId,
        limit: input.limit,
        result: input.result,
      },
    });
  } catch (error) {
    logger.error('[events-route] failed to persist audit log', {
      action: input.action,
      eventId: input.eventId,
      error: toSafeErrorLog(error),
    });
  }
}

function getOperatorId(authorization: Extract<Awaited<ReturnType<typeof authorizeIntegrationRequest>>, { ok: true }>) {
  return authorization.principal.kind === 'session' ? authorization.principal.userId : null;
}

export async function GET(request: Request) {
  const rateLimitResult = await integrationRateLimiter.consume(getClientIp(request));
  if (!rateLimitResult.allowed) {
    return jsonError(429, 'rate_limit_exceeded', 'Too many requests. Please try again later.', {
      details: { retryAfterMs: rateLimitResult.retryAfterMs },
    });
  }

  const authorization = await authorizeIntegrationRequest(request, {
    allowSessionRoles: ['admin'],
    requiredScopes: ['events:read'],
  });

  if (!authorization.ok) {
    return authorization.response;
  }

  return jsonOk(
    {
      stream: 'events',
      implemented: true,
      direction: 'outbound-only',
      message: 'Outbound dispatch is available through this operator route. Inbound event ingestion is not implemented.',
    },
    {
      requestId: authorization.requestId,
    },
  );
}

export async function POST(request: Request) {
  const rateLimitResult = await integrationRateLimiter.consume(getClientIp(request));
  if (!rateLimitResult.allowed) {
    return jsonError(429, 'rate_limit_exceeded', 'Too many requests. Please try again later.', {
      details: { retryAfterMs: rateLimitResult.retryAfterMs },
    });
  }

  const authorization = await authorizeIntegrationRequest(request, {
    allowSessionRoles: ['admin'],
    requiredScopes: ['events:write'],
  });

  if (!authorization.ok) {
    return authorization.response;
  }

  let parsedBody: unknown = {};

  try {
    parsedBody = await request.json();
  } catch {
    parsedBody = {};
  }

  const parseResult = dispatchEventSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    return jsonError(400, 'invalid_request', 'Invalid payload.', {
      requestId: authorization.requestId,
    });
  }

  const body = parseResult.data;

  if (body.eventId != null) {
    const result = await dispatchDomainEventById(body.eventId);
    await auditEventDispatch({
      action: 'domain_event_dispatch_single',
      performedBy: getOperatorId(authorization),
      eventId: body.eventId,
      limit: null,
      result,
    });

    return jsonOk(
      {
        mode: 'single',
        result,
      },
      {
        requestId: authorization.requestId,
      },
    );
  }

  const result = await dispatchPendingDomainEvents(body.limit ?? 20);
  await auditEventDispatch({
    action: 'domain_event_dispatch_batch',
    performedBy: getOperatorId(authorization),
    eventId: null,
    limit: body.limit ?? 20,
    result,
  });

  return jsonOk(
    {
      mode: 'batch',
      result,
    },
    {
      requestId: authorization.requestId,
    },
  );
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
