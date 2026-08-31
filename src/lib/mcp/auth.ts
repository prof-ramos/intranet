import 'server-only';

import type { AuthInfo } from '@modelcontextprotocol/server';
import {
  createIntegrationRateLimiter,
  getIntegrationPreAuthRateLimitKey,
} from '@/lib/integrations/rate-limit';
import { createLogger } from '@/lib/logger';
import { TOKEN_PREFIX, verifyOperatorMcpToken } from './tokens';

const logger = createLogger('mcp');

export interface McpRateLimitResult {
  rateLimited: true;
  retryAfterMs: number;
}

export interface McpUnavailableResult {
  unavailable: true;
}

export type McpAuthOutcome = AuthInfo | McpRateLimitResult | McpUnavailableResult | undefined;

export function isMcpRateLimitResult(result: McpAuthOutcome | null): result is McpRateLimitResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'rateLimited' in result &&
    result.rateLimited === true
  );
}

export function isMcpUnavailableResult(
  result: McpAuthOutcome | null,
): result is McpUnavailableResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'unavailable' in result &&
    result.unavailable === true
  );
}

export const operatorMcpPreAuthRateLimiter = createIntegrationRateLimiter({
  maxRequests: 60,
  windowMs: 15 * 60 * 1000,
  scope: 'mcp_operator_preauth',
});

export const operatorMcpPrincipalRateLimiter = createIntegrationRateLimiter({
  maxRequests: 60,
  windowMs: 15 * 60 * 1000,
  scope: 'mcp_operator_principal',
});

export function parseBearerToken(request: Request): string | undefined {
  const authorization = request.headers.get('authorization');
  if (!authorization) return undefined;

  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  return match?.[1];
}

const MCP_UNAVAILABLE: McpUnavailableResult = { unavailable: true };

export async function verifyMcpAuth(
  request: Request,
  bearerToken?: string,
): Promise<McpAuthOutcome> {
  const token = bearerToken ?? parseBearerToken(request);
  if (!token || !token.startsWith(TOKEN_PREFIX)) return undefined;

  try {
    const preAuthRateLimit = await operatorMcpPreAuthRateLimiter.consume(
      getIntegrationPreAuthRateLimitKey(request),
    );
    if (!preAuthRateLimit.allowed) {
      logger.warn('Limite de autenticação MCP excedido.', {
        retryAfterMs: preAuthRateLimit.retryAfterMs,
      });
      return {
        rateLimited: true,
        retryAfterMs: preAuthRateLimit.retryAfterMs ?? 0,
      };
    }
  } catch (error) {
    logger.error('Falha ao aplicar limite de autenticação MCP.', undefined, error as Error);
    return MCP_UNAVAILABLE;
  }

  const principal = await verifyOperatorMcpToken(token);
  if (!principal) return undefined;

  try {
    const principalRateLimit = await operatorMcpPrincipalRateLimiter.consume(
      `token-id:${principal.tokenId}`,
    );
    if (!principalRateLimit.allowed) {
      logger.warn('Limite do operador MCP excedido.', {
        tokenId: principal.tokenId,
        retryAfterMs: principalRateLimit.retryAfterMs,
      });
      return {
        rateLimited: true,
        retryAfterMs: principalRateLimit.retryAfterMs ?? 0,
      };
    }
  } catch (error) {
    logger.error('Falha ao aplicar limite do operador MCP.', undefined, error as Error);
    return MCP_UNAVAILABLE;
  }

  return {
    token,
    clientId: String(principal.userId),
    scopes: [principal.role],
    extra: {
      userId: principal.userId,
      role: principal.role,
      tokenId: principal.tokenId,
      name: principal.name,
    },
  };
}
