import 'server-only';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  INTEGRATION_API_VERSION,
  INTEGRATION_HEADER_NAMES,
  type IntegrationErrorCode,
  type JsonEnvelopeMeta,
  type JsonErrorEnvelope,
  type JsonSuccessEnvelope,
} from '@/lib/integrations/types';

interface JsonResponseOptions {
  headers?: HeadersInit;
  requestId?: string;
  status?: number;
}

interface JsonErrorOptions extends JsonResponseOptions {
  details?: Record<string, unknown>;
}

function buildMeta(requestId: string): JsonEnvelopeMeta {
  return {
    apiVersion: INTEGRATION_API_VERSION,
    requestId,
    timestamp: new Date().toISOString(),
  };
}

function buildHeaders(requestId: string, headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  merged.set('cache-control', 'no-store');
  merged.set('content-type', 'application/json; charset=utf-8');
  merged.set(INTEGRATION_HEADER_NAMES.requestId, requestId);
  return merged;
}

export function getRequestId(request: Request): string {
  return request.headers.get(INTEGRATION_HEADER_NAMES.requestId)?.trim() || randomUUID();
}

export function jsonOk<T>(
  data: T,
  { headers, requestId = randomUUID(), status = 200 }: JsonResponseOptions = {},
): NextResponse<JsonSuccessEnvelope<T>> {
  return NextResponse.json(
    {
      ok: true,
      data,
      meta: buildMeta(requestId),
    },
    {
      status,
      headers: buildHeaders(requestId, headers),
    },
  );
}

export function jsonError(
  status: number,
  code: IntegrationErrorCode,
  message: string,
  { details, headers, requestId = randomUUID() }: JsonErrorOptions = {},
): NextResponse<JsonErrorEnvelope> {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      meta: buildMeta(requestId),
    },
    {
      status,
      headers: buildHeaders(requestId, headers),
    },
  );
}

export function jsonMethodNotAllowed(
  allowedMethods: readonly string[],
  { requestId }: { requestId?: string } = {},
): NextResponse<JsonErrorEnvelope> {
  return jsonError(405, 'method_not_allowed', 'HTTP method not allowed for this route.', {
    requestId,
    headers: {
      Allow: allowedMethods.join(', '),
    },
    details: {
      allowedMethods,
    },
  });
}
