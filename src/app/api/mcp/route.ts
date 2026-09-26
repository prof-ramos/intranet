import type { AuthInfo } from '@modelcontextprotocol/server';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { isAuthRole } from '@/lib/auth/config';
import { env } from '@/lib/env';
import { getRequestId } from '@/lib/integrations/http';
import { createLogger } from '@/lib/logger';
import { isMcpRateLimitResult, isMcpUnavailableResult, verifyMcpAuth } from '@/lib/mcp/auth';
import { mcpError } from '@/lib/mcp/respond';
import type { OperatorMcpPrincipal } from '@/lib/mcp/tokens';
import { toolsForRole } from '@/lib/mcp/tools/registry';
import { logAuditAction } from '@/lib/audit/service';
import { sanitizePiiValue } from '@/lib/sanitize-pii';

const authByRequest = new WeakMap<Request, AuthInfo>();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const logger = createLogger('mcp');

function principalFromAuth(authInfo?: AuthInfo): OperatorMcpPrincipal | null {
  const extra = authInfo?.extra;
  const role = typeof extra?.role === 'string' ? extra.role : undefined;
  if (
    !extra ||
    typeof extra.userId !== 'number' ||
    !Number.isInteger(extra.userId) ||
    extra.userId <= 0 ||
    typeof extra.tokenId !== 'number' ||
    !Number.isInteger(extra.tokenId) ||
    extra.tokenId <= 0 ||
    typeof extra.name !== 'string' ||
    !isAuthRole(role)
  ) {
    return null;
  }

  return {
    userId: extra.userId,
    role,
    tokenId: extra.tokenId,
    name: extra.name,
  };
}

const handler = async (request: Request): Promise<Response> => {
  const requestPrincipal = principalFromAuth(request.auth);
  if (!requestPrincipal) {
    return jsonErrorResponse(request, 401, 'Autenticação MCP inválida.');
  }

  const routeHandler = createMcpHandler(
    (server) => {
      for (const tool of toolsForRole(requestPrincipal.role)) {
        server.registerTool(
          tool.name,
          {
            title: tool.title,
            description: tool.description,
            inputSchema: tool.inputSchema,
            annotations: tool.annotations,
          },
          async (input, context) => {
            const principal = principalFromAuth(context.http?.authInfo);
            if (!principal) {
              return mcpError(
                'O contexto de autenticação da ferramenta MCP está ausente.',
                'UNAUTHORIZED',
                401,
              );
            }
            return tool.execute(input, principal);
          },
        );
      }
    },
    {
      serverInfo: { name: 'asof-intranet', version: '1.0.0' },
      maxSubscriptions: 0,
      onEvent: (event) => {
        if (event.type === 'ERROR') {
          logger.error(
            'Falha no processamento de uma requisição MCP.',
            sanitizePiiValue({
              source: event.source,
              severity: event.severity,
            }) as Record<string, unknown>,
          );
        }
      },
    },
  );

  return routeHandler(request);
};

export async function verifyToken(
  request: Request,
  _bearerToken?: string,
): Promise<AuthInfo | undefined> {
  return authByRequest.get(request);
}

const authenticatedHandler = withMcpAuth(handler, verifyToken, { required: true });

// Invariante de rate limit (ADR 022): exceder o limite é 429 com Retry-After;
// falha do armazenamento do limitador é 503. NUNCA 401 — um limitador quebrado
// não pode ser tratado como credencial inválida, senão uma indisponibilidade
// do Postgres vira lockout de credenciais válidas.
function jsonErrorResponse(
  request: Request,
  status: number,
  message: string,
  headers?: Record<string, string>,
): Response {
  const requestId = getRequestId(request);
  return new Response(JSON.stringify({ error: message, requestId }), {
    status,
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
      ...headers,
    },
  });
}

async function routeEntry(request: Request): Promise<Response> {
  if (!env.MCP_ENABLED) {
    return jsonErrorResponse(request, 503, 'O servidor MCP está desabilitado.');
  }

  const auth = await verifyMcpAuth(request);
  if (isMcpRateLimitResult(auth)) {
    return jsonErrorResponse(request, 429, 'Muitas requisições. Tente novamente mais tarde.', {
      'retry-after': String(Math.max(1, Math.ceil(auth.retryAfterMs / 1000))),
    });
  }
  if (isMcpUnavailableResult(auth)) {
    return jsonErrorResponse(
      request,
      503,
      'Serviço temporariamente indisponível. Tente novamente mais tarde.',
    );
  }
  if (auth) {
    authByRequest.set(request, auth);
    const principal = principalFromAuth(auth);
    if (principal) {
      // ADR 022: cada chamada autenticada registra canal MCP + adminId no limite da rota.
      await logAuditAction({
        adminId: principal.userId,
        action: 'mcp_request',
        entityType: 'admin',
        entityId: principal.userId,
        metadata: {
          channel: 'mcp',
          method: request.method,
          tokenId: principal.tokenId,
        },
      });
    }
  }
  return authenticatedHandler(request);
}

export { routeEntry as GET, routeEntry as POST, routeEntry as DELETE };
