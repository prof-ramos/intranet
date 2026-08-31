import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  logAuditAction: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    transaction: mocks.transaction,
    select: mocks.select,
    update: mocks.update,
  },
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: mocks.logAuditAction,
}));

import {
  createOperatorMcpToken,
  hashMcpToken,
  revokeOperatorMcpToken,
  TOKEN_PREFIX,
  verifyOperatorMcpToken,
} from './tokens';

function selectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const innerJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ where, innerJoin }));
  return { select: vi.fn(() => ({ from })) };
}

function updateChain(rows: unknown[] = []) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  return { update: vi.fn(() => ({ set })) };
}

describe('tokens MCP de operador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gera token com prefixo e hash SHA-256 determinístico', async () => {
    const createdAt = new Date('2026-08-31T12:00:00Z');
    const tx = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            {
              id: 10,
              name: 'Meu cliente',
              expiresAt: new Date('2026-11-29T12:00:00Z'),
              createdAt,
            },
          ]),
        })),
      })),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const result = await createOperatorMcpToken({
      adminId: 1,
      name: '  Meu cliente  ',
      lgpdAcknowledged: true,
    });

    expect(result.token).toMatch(/^asof_mcp_[A-Za-z0-9_-]{43}$/);
    expect(result.name).toBe('Meu cliente');
    expect(hashMcpToken(result.token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashMcpToken(result.token)).toBe(hashMcpToken(result.token));
    expect(mocks.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'mcp_token_created',
        entityType: 'admin',
        metadata: { channel: 'mcp', tokenId: 10 },
        executor: tx,
      }),
    );
  });

  it('rejeita criação sem ciência LGPD', async () => {
    await expect(
      createOperatorMcpToken({
        adminId: 1,
        name: 'Cliente',
        lgpdAcknowledged: false as true,
      }),
    ).rejects.toThrow('ciência');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['proprietário', 2, 'secretaria' as const, 2, true],
    ['admin para terceiro', 1, 'admin' as const, 2, true],
    ['secretaria para terceiro', 3, 'secretaria' as const, 2, false],
  ])('revogação: %s', async (_case, actorId, actorRole, ownerId, expected) => {
    let selectCount = 0;
    const txSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockImplementation(async () => {
            selectCount++;
            if (selectCount === 1) {
              return [{ role: actorRole, isActive: true }];
            }
            return [{ adminId: ownerId }];
          }),
        })),
      })),
    }));
    const update = updateChain([{ id: 9 }]);
    const tx = { select: txSelect, update: update.update };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    await expect(revokeOperatorMcpToken({ id: 9, actorId, actorRole })).resolves.toBe(expected);
    expect(update.update).toHaveBeenCalledTimes(expected ? 1 : 0);
  });

  it('verifica token válido e usa role viva do administrador', async () => {
    const select = selectChain([
      {
        userId: 7,
        role: 'diretoria',
        isActive: true,
        passwordChangeRequired: false,
        tokenId: 22,
        name: 'Claude',
        lastUsedAt: null,
      },
    ]);
    const update = updateChain();
    mocks.select.mockImplementation(select.select);
    mocks.update.mockImplementation(update.update);

    await expect(verifyOperatorMcpToken(`${TOKEN_PREFIX}valid`)).resolves.toEqual({
      userId: 7,
      role: 'diretoria',
      tokenId: 22,
      name: 'Claude',
    });
    expect(update.update).toHaveBeenCalled();
  });

  it('não atualiza lastUsedAt quando o último uso foi recente (< 5 min)', async () => {
    const recent = new Date(Date.now() - 2 * 60 * 1000);
    const select = selectChain([
      {
        userId: 7,
        role: 'admin',
        isActive: true,
        passwordChangeRequired: false,
        tokenId: 22,
        name: 'Claude',
        lastUsedAt: recent,
      },
    ]);
    mocks.select.mockImplementation(select.select);

    await expect(verifyOperatorMcpToken(`${TOKEN_PREFIX}recent`)).resolves.toEqual({
      userId: 7,
      role: 'admin',
      tokenId: 22,
      name: 'Claude',
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('atualiza lastUsedAt quando nunca foi usado', async () => {
    const select = selectChain([
      {
        userId: 7,
        role: 'admin',
        isActive: true,
        passwordChangeRequired: false,
        tokenId: 22,
        name: 'Claude',
        lastUsedAt: null,
      },
    ]);
    const update = updateChain();
    mocks.select.mockImplementation(select.select);
    mocks.update.mockImplementation(update.update);

    await verifyOperatorMcpToken(`${TOKEN_PREFIX}fresh`);

    expect(update.update).toHaveBeenCalledTimes(1);
  });

  it('atualiza lastUsedAt quando o último uso é antigo (> 5 min)', async () => {
    const stale = new Date(Date.now() - 10 * 60 * 1000);
    const select = selectChain([
      {
        userId: 7,
        role: 'admin',
        isActive: true,
        passwordChangeRequired: false,
        tokenId: 22,
        name: 'Claude',
        lastUsedAt: stale,
      },
    ]);
    const update = updateChain();
    mocks.select.mockImplementation(select.select);
    mocks.update.mockImplementation(update.update);

    await verifyOperatorMcpToken(`${TOKEN_PREFIX}stale`);

    expect(update.update).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['inativo', { isActive: false, passwordChangeRequired: false }],
    ['com troca de senha pendente', { isActive: true, passwordChangeRequired: true }],
  ])('rejeita administrador %s', async (_case, state) => {
    const select = selectChain([
      {
        userId: 7,
        role: 'admin',
        tokenId: 22,
        name: 'Cursor',
        ...state,
      },
    ]);
    mocks.select.mockImplementation(select.select);

    await expect(verifyOperatorMcpToken(`${TOKEN_PREFIX}invalid-admin`)).resolves.toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejeita token com prefixo inválido sem consultar banco', async () => {
    await expect(verifyOperatorMcpToken('invalid_token_without_prefix')).resolves.toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejeita token não encontrado, revogado ou expirado', async () => {
    const select = selectChain([]);
    mocks.select.mockImplementation(select.select);

    await expect(verifyOperatorMcpToken(`${TOKEN_PREFIX}unavailable`)).resolves.toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
