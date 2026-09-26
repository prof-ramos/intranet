import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMcpTokenAction,
  listMcpTokensAction,
  revokeMcpTokenAction,
  rotateMcpTokenAction,
} from './actions';

const requireAuthMock = vi.fn();
const requireRoleMock = vi.fn();
const createMock = vi.fn();
const listMock = vi.fn();
const revokeMock = vi.fn();
const rotateMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/mcp/tokens', () => ({
  createOperatorMcpToken: (...args: unknown[]) => createMock(...args),
  listOperatorMcpTokens: (...args: unknown[]) => listMock(...args),
  revokeOperatorMcpToken: (...args: unknown[]) => revokeMock(...args),
  rotateOperatorMcpToken: (...args: unknown[]) => rotateMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

describe('ações de tokens MCP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: 7, role: 'admin' });
    requireRoleMock.mockResolvedValue({ userId: 7, role: 'admin' });
    createMock.mockResolvedValue({ id: 3, token: 'asof_mcp_new', name: 'Cursor' });
    listMock.mockResolvedValue([]);
    revokeMock.mockResolvedValue(true);
    rotateMock.mockResolvedValue({ id: 4, token: 'asof_mcp_rotated', name: 'Cursor' });
  });

  it('cria token com ciência LGPD e revalida a página', async () => {
    const result = await createMcpTokenAction('  Cursor  ', true);

    expect(result).toEqual({ data: { id: 3, token: 'asof_mcp_new', name: 'Cursor' } });
    expect(createMock).toHaveBeenCalledWith({
      adminId: 7,
      name: 'Cursor',
      lgpdAcknowledged: true,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/integracoes/mcp');
  });

  it('recusa criação sem ciência LGPD', async () => {
    const result = await createMcpTokenAction('Cursor', false);

    expect(result).toEqual({
      error: 'Confirme a ciência sobre o tratamento de dados via MCP.',
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('lista todos os tokens para o admin', async () => {
    await listMcpTokensAction();
    expect(listMock).toHaveBeenCalledWith({ adminId: 7, includeAll: true });
  });

  it('revoga e renova um token ativo', async () => {
    await expect(revokeMcpTokenAction(9)).resolves.toEqual({ data: { id: 9 } });
    await expect(rotateMcpTokenAction(9)).resolves.toEqual({
      data: { id: 4, token: 'asof_mcp_rotated', name: 'Cursor' },
    });
    expect(revokeMock).toHaveBeenCalledWith({ id: 9, actorId: 7 });
    expect(rotateMock).toHaveBeenCalledWith({ id: 9, actorId: 7 });
  });
});
