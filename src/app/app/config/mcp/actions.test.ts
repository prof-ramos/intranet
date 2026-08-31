import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOperatorMcpTokenAction,
  listOperatorMcpTokensAction,
  revokeOperatorMcpTokenAction,
} from './actions';

const {
  requireRoleMock,
  createOperatorMcpTokenMock,
  listOperatorMcpTokensMock,
  revokeOperatorMcpTokenMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  createOperatorMcpTokenMock: vi.fn(),
  listOperatorMcpTokensMock: vi.fn(),
  revokeOperatorMcpTokenMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/mcp/tokens', () => ({
  createOperatorMcpToken: (...args: unknown[]) => createOperatorMcpTokenMock(...args),
  listOperatorMcpTokens: (...args: unknown[]) => listOperatorMcpTokensMock(...args),
  revokeOperatorMcpToken: (...args: unknown[]) => revokeOperatorMcpTokenMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag: vi.fn(),
}));

describe('ações de tokens MCP do operador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({
      userId: 7,
      name: 'Operador',
      email: 'operador@asof.local',
      role: 'diretoria',
      mustChangePassword: false,
    });
    createOperatorMcpTokenMock.mockResolvedValue({
      id: 10,
      name: 'Cursor institucional',
      token: 'test-token-placeholder',
      expiresAt: new Date('2027-01-01T00:00:00Z'),
      createdAt: new Date('2026-08-31T12:00:00Z'),
    });
    listOperatorMcpTokensMock.mockResolvedValue([]);
    revokeOperatorMcpTokenMock.mockResolvedValue(true);
  });

  it('cria um token com ciência LGPD e revalida a página', async () => {
    const result = await createOperatorMcpTokenAction({
      name: '  Cursor institucional  ',
      lgpdAcknowledged: true,
    });

    expect(result).toMatchObject({
      data: {
        id: 10,
        name: 'Cursor institucional',
        token: 'test-token-placeholder',
      },
    });
    expect(createOperatorMcpTokenMock).toHaveBeenCalledWith({
      adminId: 7,
      name: 'Cursor institucional',
      lgpdAcknowledged: true,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/mcp');
  });

  it.each([
    {
      input: { name: '', lgpdAcknowledged: true },
      message: 'O nome deve ter pelo menos 2 caracteres.',
    },
    {
      input: { name: 'Cursor', lgpdAcknowledged: false },
      message: 'É necessário confirmar a ciência sobre a LGPD.',
    },
  ])('rejeita entrada inválida antes de chamar o serviço', async ({ input, message }) => {
    await expect(createOperatorMcpTokenAction(input)).rejects.toThrow(message);
    expect(createOperatorMcpTokenMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('revoga o token com a identidade e o papel do operador', async () => {
    const result = await revokeOperatorMcpTokenAction(12);

    expect(result).toEqual({ data: { id: 12 } });
    expect(revokeOperatorMcpTokenMock).toHaveBeenCalledWith({
      id: 12,
      actorId: 7,
      actorRole: 'diretoria',
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/mcp');
  });

  it('solicita todos os tokens para administradores', async () => {
    requireRoleMock.mockResolvedValue({
      userId: 1,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      mustChangePassword: false,
    });

    await listOperatorMcpTokensAction();

    expect(listOperatorMcpTokensMock).toHaveBeenCalledWith({
      adminId: 1,
      includeAll: true,
    });
  });

  it('lista somente os próprios tokens para outros operadores', async () => {
    await listOperatorMcpTokensAction();

    expect(listOperatorMcpTokensMock).toHaveBeenCalledWith({
      adminId: 7,
      includeAll: false,
    });
  });

  it('interrompe antes do serviço quando o papel não é autorizado', async () => {
    requireRoleMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/app'));

    await expect(listOperatorMcpTokensAction()).rejects.toThrow('NEXT_REDIRECT:/app');
    expect(listOperatorMcpTokensMock).not.toHaveBeenCalled();
    expect(requireRoleMock).toHaveBeenCalledWith(['admin', 'diretoria', 'secretaria']);
  });
});
