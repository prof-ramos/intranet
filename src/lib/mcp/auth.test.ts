import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  preAuthConsume: vi.fn(),
  principalConsume: vi.fn(),
  verifyOperatorMcpToken: vi.fn(),
}));

vi.mock('@/lib/integrations/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/integrations/rate-limit')>();
  return {
    ...actual,
    createIntegrationRateLimiter: vi
      .fn()
      .mockReturnValueOnce({ consume: mocks.preAuthConsume })
      .mockReturnValueOnce({ consume: mocks.principalConsume }),
  };
});

vi.mock('./tokens', () => ({
  TOKEN_PREFIX: 'asof_mcp_',
  async verifyOperatorMcpToken(...args: unknown[]) {
    return mocks.verifyOperatorMcpToken(...args);
  },
}));

import { isMcpRateLimitResult, isMcpUnavailableResult, verifyMcpAuth } from './auth';

describe('autenticação MCP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.preAuthConsume.mockResolvedValue({ allowed: true, remaining: 59 });
    mocks.principalConsume.mockResolvedValue({ allowed: true, remaining: 59 });
    mocks.verifyOperatorMcpToken.mockResolvedValue(null);
  });

  it('limita tentativas inválidas por IP derivado dos headers, não pelo Bearer', async () => {
    const request = new Request('http://localhost/api/mcp', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    const resultA = await verifyMcpAuth(request, 'asof_mcp_invalid-a');
    const resultB = await verifyMcpAuth(request, 'asof_mcp_invalid-b');

    expect(resultA).toBeUndefined();
    expect(resultB).toBeUndefined();
    expect(mocks.preAuthConsume).toHaveBeenNthCalledWith(1, 'ip:203.0.113.10');
    expect(mocks.preAuthConsume).toHaveBeenNthCalledWith(2, 'ip:203.0.113.10');
    expect(mocks.principalConsume).not.toHaveBeenCalled();
  });

  it('retorna rateLimited quando o limite de pré-autenticação por IP é excedido', async () => {
    mocks.preAuthConsume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterMs: 30000,
    });

    const request = new Request('http://localhost/api/mcp', {
      headers: { 'x-forwarded-for': '198.51.100.25' },
    });

    const result = await verifyMcpAuth(request, 'asof_mcp_invalid');

    expect(isMcpRateLimitResult(result)).toBe(true);
    expect(result).toEqual({ rateLimited: true, retryAfterMs: 30000 });
    expect(mocks.preAuthConsume).toHaveBeenCalledWith('ip:198.51.100.25');
  });

  it('aplica o limite por identidade somente após validar o PAT', async () => {
    mocks.verifyOperatorMcpToken.mockResolvedValue({
      userId: 7,
      role: 'diretoria',
      tokenId: 22,
      name: 'Cliente',
    });

    const request = new Request('http://localhost/api/mcp', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    const auth = await verifyMcpAuth(request, 'asof_mcp_valid');

    expect(mocks.preAuthConsume).toHaveBeenCalledWith('ip:203.0.113.10');
    expect(mocks.principalConsume).toHaveBeenCalledWith('token-id:22');
    expect(isMcpRateLimitResult(auth)).toBe(false);
    expect(isMcpUnavailableResult(auth)).toBe(false);
    if (auth && !isMcpRateLimitResult(auth) && !isMcpUnavailableResult(auth)) {
      expect(auth.extra).toMatchObject({ userId: 7, tokenId: 22 });
    }
  });

  it('retorna rateLimited quando o limite por identidade do operador é excedido', async () => {
    mocks.verifyOperatorMcpToken.mockResolvedValue({
      userId: 7,
      role: 'diretoria',
      tokenId: 22,
      name: 'Cliente',
    });
    mocks.principalConsume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterMs: 45000,
    });

    const request = new Request('http://localhost/api/mcp', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    const result = await verifyMcpAuth(request, 'asof_mcp_valid');

    expect(isMcpRateLimitResult(result)).toBe(true);
    expect(result).toEqual({ rateLimited: true, retryAfterMs: 45000 });
  });

  it('sinaliza indisponibilidade quando o limite de pré-autenticação falha ao persistir', async () => {
    mocks.preAuthConsume.mockRejectedValue(new Error('rate_limits unavailable'));

    const request = new Request('http://localhost/api/mcp', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    const result = await verifyMcpAuth(request, 'asof_mcp_valid');

    expect(isMcpUnavailableResult(result)).toBe(true);
    expect(isMcpRateLimitResult(result)).toBe(false);
    expect(mocks.verifyOperatorMcpToken).not.toHaveBeenCalled();
  });

  it('sinaliza indisponibilidade quando o limite por identidade falha ao persistir', async () => {
    mocks.verifyOperatorMcpToken.mockResolvedValue({
      userId: 7,
      role: 'diretoria',
      tokenId: 22,
      name: 'Cliente',
    });
    mocks.principalConsume.mockRejectedValue(new Error('rate_limits unavailable'));

    const request = new Request('http://localhost/api/mcp', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    const result = await verifyMcpAuth(request, 'asof_mcp_valid');

    expect(isMcpUnavailableResult(result)).toBe(true);
    expect(isMcpRateLimitResult(result)).toBe(false);
  });
});
