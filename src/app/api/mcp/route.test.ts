import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { MCP_ENABLED: true } }));

vi.mock('@/lib/mcp/auth', () => ({
  isMcpRateLimitResult: (result: unknown) =>
    typeof result === 'object' &&
    result !== null &&
    'rateLimited' in result &&
    (result as { rateLimited: unknown }).rateLimited === true,
  isMcpUnavailableResult: (result: unknown) =>
    typeof result === 'object' &&
    result !== null &&
    'unavailable' in result &&
    (result as { unavailable: unknown }).unavailable === true,
  verifyMcpAuth: vi.fn(async (request: Request, token?: string) => {
    const rawAuth = token ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (rawAuth === 'asof_mcp_valid') {
      return {
        token: rawAuth,
        clientId: '5',
        scopes: ['secretaria'],
        extra: { userId: 5, role: 'secretaria', tokenId: 7, name: 'Teste' },
      };
    }
    if (rawAuth === 'asof_mcp_limited') {
      return {
        rateLimited: true as const,
        retryAfterMs: 30000,
      };
    }
    if (rawAuth === 'asof_mcp_unavailable') {
      return { unavailable: true as const };
    }
    return undefined;
  }),
  parseBearerToken: vi.fn((request: Request) => {
    const authorization = request.headers.get('authorization');
    if (!authorization) return undefined;
    const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
    return match?.[1];
  }),
}));

vi.mock('@/lib/mcp/tools/registry', () => ({
  toolsForRole: vi.fn((role: string) => {
    if (role !== 'secretaria' && role !== 'admin' && role !== 'diretoria') {
      return [];
    }
    return [
      'officials_search',
      'official_get',
      'official_list_dependents',
      'official_list_health_agreements',
      'global_search',
    ].map((name) => ({
      name,
      title: name,
      description: name,
      inputSchema: undefined,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
      execute: vi.fn(),
    }));
  }),
}));

import { verifyMcpAuth } from '@/lib/mcp/auth';
import { DELETE, GET, POST } from './route';

function toolsListRequest(authorization?: string) {
  const headers = new Headers({
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  });
  if (authorization) headers.set('authorization', authorization);

  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  });
}

function parseMcpBody(text: string): Record<string, unknown> {
  if (text.trimStart().startsWith('{')) {
    return JSON.parse(text) as Record<string, unknown>;
  }
  const dataLine = text.split('\n').find((line) => line.startsWith('data:'));
  if (!dataLine) throw new Error('Resposta MCP sem payload JSON.');
  return JSON.parse(dataLine.slice(5).trim()) as Record<string, unknown>;
}

describe('handshake HTTP MCP', () => {
  describe('POST /api/mcp', () => {
    it('rejeita requisição sem Bearer', async () => {
      const response = await POST(toolsListRequest());
      expect(response.status).toBe(401);
    });

    it('rejeita PAT revogado ou expirado', async () => {
      const response = await POST(toolsListRequest('Bearer asof_mcp_revogado'));
      expect(response.status).toBe(401);
    });

    it('retorna 429 quando limite de requisições é excedido', async () => {
      const response = await POST(toolsListRequest('Bearer asof_mcp_limited'));
      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBe('30');
      const body = await response.json();
      expect(body).toMatchObject({ error: 'Muitas requisições. Tente novamente mais tarde.' });
      expect(typeof body.requestId).toBe('string');
    });

    it('retorna 503 quando o armazenamento de rate limit está indisponível', async () => {
      const response = await POST(toolsListRequest('Bearer asof_mcp_unavailable'));
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body).toMatchObject({
        error: 'Serviço temporariamente indisponível. Tente novamente mais tarde.',
      });
      expect(typeof body.requestId).toBe('string');
    });

    it('retorna 503 quando a flag MCP_ENABLED está desligada', async () => {
      const { env } = await import('@/lib/env');
      const mutable = env as { MCP_ENABLED: boolean };
      const original = mutable.MCP_ENABLED;
      mutable.MCP_ENABLED = false;
      try {
        const response = await POST(toolsListRequest('Bearer asof_mcp_valid'));
        expect(response.status).toBe(503);
        const body = await response.json();
        expect(body).toMatchObject({ error: 'O servidor MCP está desabilitado.' });
      } finally {
        mutable.MCP_ENABLED = original;
      }
    });

    it('não reconsome o limitador em PAT inválido — withMcpAuth só devolve 401', async () => {
      vi.mocked(verifyMcpAuth).mockClear();
      const response = await POST(toolsListRequest('Bearer asof_mcp_revogado'));
      expect(response.status).toBe(401);
      expect(verifyMcpAuth).toHaveBeenCalledTimes(1);
    });

    it('lista ferramentas para principal autenticado', async () => {
      const response = await POST(toolsListRequest('Bearer asof_mcp_valid'));
      const body = parseMcpBody(await response.text());

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        result: {
          tools: expect.arrayContaining([
            expect.objectContaining({ name: 'officials_search' }),
            expect.objectContaining({ name: 'official_get' }),
            expect.objectContaining({ name: 'official_list_dependents' }),
            expect.objectContaining({ name: 'official_list_health_agreements' }),
            expect.objectContaining({ name: 'global_search' }),
          ]),
        },
      });
    });
  });

  describe('GET /api/mcp', () => {
    it('rejeita requisição GET sem Bearer', async () => {
      const request = new Request('http://localhost/api/mcp', { method: 'GET' });
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('processa requisição GET com principal autenticado', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'GET',
        headers: {
          authorization: 'Bearer asof_mcp_valid',
          accept: 'text/event-stream',
        },
      });
      const response = await GET(request);
      expect(response.status).not.toBe(401);
    });
  });

  describe('DELETE /api/mcp', () => {
    it('rejeita requisição DELETE sem Bearer', async () => {
      const request = new Request('http://localhost/api/mcp', { method: 'DELETE' });
      const response = await DELETE(request);
      expect(response.status).toBe(401);
    });

    it('processa requisição DELETE com principal autenticado', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'DELETE',
        headers: { authorization: 'Bearer asof_mcp_valid' },
      });
      const response = await DELETE(request);
      expect(response.status).not.toBe(401);
    });
  });
});
