'use server';

import { createHash } from 'node:crypto';
import type { AuthRole } from '@/lib/auth/config';
import { canAccessRole } from '@/lib/auth/authorization';
import { safeCompare } from '@/lib/crypto/safe-compare';
import { getSession } from '@/lib/auth/session';
import { getIntegrationConfig, isIntegrationAuthConfigured } from '@/lib/integrations/config';
import { findActiveApiKeyByHash, updateApiKeyLastUsed } from '@/lib/integrations/keys/repository';
import { decryptIntegrationSigningSecret } from '@/lib/integrations/keys/signing-secrets';
import { getRequestId, jsonError } from '@/lib/integrations/http';
import {
  INTEGRATION_AUTH_SCHEME,
  INTEGRATION_HEADER_NAMES,
  type IntegrationAuthResult,
  type IntegrationScope,
  type IntegrationSignatureInput,
  type RequestPrincipal,
} from '@/lib/integrations/types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('integrations:auth');

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeSignatureHeader(signature: string | null): string | null {
  if (!signature) {
    return null;
  }

  const normalized = signature.trim();
  if (!normalized) {
    return null;
  }

  return normalized.startsWith('sha256=') ? normalized.slice('sha256='.length) : normalized;
}

export async function readRequestBody(request: Request): Promise<string> {
  try {
    return await request.clone().text();
  } catch {
    return '';
  }
}

export function getPathWithQuery(request: Request): string {
  const url = new URL(request.url);
  return `${url.pathname}${url.search}`;
}

export function hasIntegrationHeaders(request: Request): boolean {
  return (
    request.headers.has(INTEGRATION_HEADER_NAMES.key) ||
    request.headers.has(INTEGRATION_HEADER_NAMES.timestamp) ||
    request.headers.has(INTEGRATION_HEADER_NAMES.signature)
  );
}

export function isTimestampWithinTolerance(
  timestamp: string,
  toleranceSeconds: number,
): Extract<IntegrationAuthResult, { ok: false }> | { ok: true } {
  if (!/^\d+$/.test(timestamp)) {
    return {
      ok: false,
      reason: 'invalid_timestamp',
    };
  }

  const parsed = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(parsed)) {
    return {
      ok: false,
      reason: 'invalid_timestamp',
    };
  }

  const skewSeconds = Math.abs(Math.floor(Date.now() / 1000) - parsed);
  if (skewSeconds > toleranceSeconds) {
    return {
      ok: false,
      reason: 'timestamp_skew',
      details: {
        skewSeconds,
        toleranceSeconds,
      },
    };
  }

  return { ok: true };
}

/**
 * Verify an incoming integration request against either the configured
 * environment-variable API key or a database-backed API key.
 *
 * Auth flow:
 * 1. Check if integrations are enabled and at least one auth source is available.
 * 2. Extract key, timestamp, and signature headers.
 * 3. Try env-var key match first (existing behaviour). If it matches, verify HMAC.
 * 4. If env-var key does not match, hash the incoming key and look it up in
 *    the `integration_api_keys` table.
 * 5. For table-backed keys, prefer the encrypted per-key signing secret.
 *    Legacy rows without one temporarily fall back to the shared hmacSecret.
 * 6. If neither path succeeds, return `invalid_key`.
 * 7. On success, return a principal that includes scopes for table-backed keys.
 */
export async function verifyIntegrationRequest(request: Request): Promise<IntegrationAuthResult> {
  const config = getIntegrationConfig();

  if (!config.enabled) {
    return {
      ok: false,
      reason: 'disabled',
    };
  }

  const key = request.headers.get(INTEGRATION_HEADER_NAMES.key)?.trim() || '';
  const timestamp = request.headers.get(INTEGRATION_HEADER_NAMES.timestamp)?.trim() || '';
  const signature = normalizeSignatureHeader(
    request.headers.get(INTEGRATION_HEADER_NAMES.signature),
  );

  if (!key || !timestamp || !signature) {
    return {
      ok: false,
      reason: 'missing_headers',
    };
  }

  const timestampResult = isTimestampWithinTolerance(timestamp, config.timestampToleranceSeconds);
  if (!timestampResult.ok) {
    return timestampResult;
  }

  const body = await readRequestBody(request);
  const signaturePayload: IntegrationSignatureInput = {
    method: request.method,
    pathWithQuery: getPathWithQuery(request),
    timestamp,
    body,
  };

  // --- Path 1: env-var key ---
  const envAuthConfigured = isIntegrationAuthConfigured(config);
  if (envAuthConfigured && safeCompare(config.apiKey ?? '', key)) {
    const { signIntegrationRequest } = await import('./sign-request');
    const expectedSignature = signIntegrationRequest(signaturePayload, config.hmacSecret ?? '');
    if (!safeCompare(expectedSignature, signature)) {
      return {
        ok: false,
        reason: 'invalid_signature',
      };
    }

    const requestId = getRequestId(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const url = new URL(request.url);
    logger.warn(
      'DEPRECATED: Request authorized using legacy ASOF_INTEGRATION_API_KEY environment variable. Client should migrate to table-backed API keys.',
      {
        requestId,
        method: request.method,
        path: url.pathname,
        userAgent,
      },
    );

    // Env-var keys have full access (no scopes restriction).
    updateApiKeyLastUsed(sha256Hex(key)).catch(() => {});

    return {
      ok: true,
      principal: {
        kind: 'integration',
        scheme: INTEGRATION_AUTH_SCHEME,
        keyId: key,
        // No scopes — env-var keys have unrestricted access.
      },
    };
  }

  // --- Path 2: table-backed key ---
  const keyHash = sha256Hex(key);
  const tableKey = await findActiveApiKeyByHash(keyHash);

  if (!tableKey) {
    return {
      ok: false,
      reason: 'invalid_key',
    };
  }

  let tableSigningSecret: string;
  if (tableKey.signingSecretCiphertext) {
    try {
      tableSigningSecret = decryptIntegrationSigningSecret(tableKey.signingSecretCiphertext);
    } catch {
      return {
        ok: false,
        reason: 'misconfigured',
      };
    }
  } else if (config.hmacSecret) {
    tableSigningSecret = config.hmacSecret;
  } else {
    return {
      ok: false,
      reason: 'misconfigured',
    };
  }

  const { signIntegrationRequest } = await import('./sign-request');
  const expectedSignature = signIntegrationRequest(signaturePayload, tableSigningSecret);
  if (!safeCompare(expectedSignature, signature)) {
    return {
      ok: false,
      reason: 'invalid_signature',
    };
  }

  // Update lastUsedAt for the table-backed key.
  updateApiKeyLastUsed(keyHash).catch(() => {});

  return {
    ok: true,
    principal: {
      kind: 'integration',
      scheme: INTEGRATION_AUTH_SCHEME,
      keyId: tableKey.name,
      scopes: tableKey.scopes,
    },
  };
}

async function getAuthorizedSessionPrincipal(allowedRoles: readonly AuthRole[]): Promise<
  | {
      ok: true;
      principal: RequestPrincipal;
    }
  | {
      ok: false;
      status: 401 | 403;
    }
> {
  const session = await getSession();
  if (!session?.isLoggedIn) {
    return {
      ok: false,
      status: 401,
    };
  }

  if (!canAccessRole(session.role, allowedRoles)) {
    return {
      ok: false,
      status: 403,
    };
  }

  return {
    ok: true,
    principal: {
      kind: 'session',
      userId: session.userId,
      email: session.email,
      role: session.role,
    },
  };
}

function mapIntegrationFailureToResponse(
  request: Request,
  reason: IntegrationAuthResult & { ok: false },
) {
  const requestId = getRequestId(request);

  switch (reason.reason) {
    case 'disabled':
      return jsonError(
        503,
        'integration_auth_disabled',
        'Integration authentication is disabled.',
        {
          requestId,
        },
      );
    case 'misconfigured':
      return jsonError(
        503,
        'integration_auth_misconfigured',
        'Integration authentication is enabled but incomplete.',
        { requestId },
      );
    case 'missing_headers':
      return jsonError(
        401,
        'integration_auth_missing',
        'Integration authentication headers are required.',
        { requestId },
      );
    case 'invalid_key':
    case 'invalid_signature':
      return jsonError(401, 'integration_auth_invalid', 'Integration authentication failed.', {
        requestId,
      });
    case 'invalid_timestamp':
      return jsonError(
        400,
        'invalid_request',
        'Integration timestamp must be a Unix time in seconds.',
        {
          requestId,
        },
      );
    case 'timestamp_skew':
      return jsonError(
        401,
        'integration_auth_invalid',
        'Integration timestamp is outside the allowed window.',
        {
          requestId,
          details: reason.details,
        },
      );
    case 'insufficient_scope':
      return jsonError(
        403,
        'insufficient_scope',
        'The API key does not have the required scope for this endpoint.',
        {
          requestId,
          details: reason.details,
        },
      );
  }
}

/**
 * Authorize an integration or session request.
 *
 * When `requiredScopes` is provided, table-backed API keys (those with a
 * `scopes` array on the principal) must possess at least one of the listed
 * scopes. Env-var-backed keys (no `scopes` on the principal) always pass
 * scope check — they have unrestricted access.
 */
export async function authorizeIntegrationRequest(
  request: Request,
  options: {
    allowSessionRoles?: readonly AuthRole[];
    requiredScopes?: readonly IntegrationScope[];
  } = {},
): Promise<
  | {
      ok: true;
      principal: RequestPrincipal;
      requestId: string;
    }
  | {
      ok: false;
      response: ReturnType<typeof jsonError>;
    }
> {
  const requestId = getRequestId(request);

  if (hasIntegrationHeaders(request)) {
    const integrationResult = await verifyIntegrationRequest(request);
    if (!integrationResult.ok) {
      return {
        ok: false,
        response: mapIntegrationFailureToResponse(request, integrationResult),
      };
    }

    // Scope check for table-backed keys.
    const { requiredScopes } = options;
    if (requiredScopes && requiredScopes.length > 0 && integrationResult.principal.scopes) {
      const hasScope = integrationResult.principal.scopes.some((s) =>
        requiredScopes.includes(s as IntegrationScope),
      );
      if (!hasScope) {
        return {
          ok: false,
          response: mapIntegrationFailureToResponse(request, {
            ok: false,
            reason: 'insufficient_scope',
            details: {
              required: requiredScopes,
              provided: integrationResult.principal.scopes,
            },
          }),
        };
      }
    }

    return {
      ok: true,
      principal: integrationResult.principal,
      requestId,
    };
  }

  const allowedSessionRoles = options.allowSessionRoles ?? [];
  if (allowedSessionRoles.length > 0) {
    const sessionResult = await getAuthorizedSessionPrincipal(allowedSessionRoles);
    if (sessionResult.ok) {
      return {
        ok: true,
        principal: sessionResult.principal,
        requestId,
      };
    }

    if (sessionResult.status === 403) {
      return {
        ok: false,
        response: jsonError(
          403,
          'forbidden',
          'Authenticated user does not have access to this route.',
          {
            requestId,
          },
        ),
      };
    }
  }

  return {
    ok: false,
    response: jsonError(
      401,
      'unauthorized',
      'Use a valid integration signature or an authorized operator session.',
      { requestId },
    ),
  };
}
