import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findAssociateById: vi.fn(),
  findDependentsByAssociateId: vi.fn(),
  findHealthAgreementsByAssociateId: vi.fn(),
  getAssociatesListPage: vi.fn(),
  decryptAssociatePii: vi.fn(),
  logDataAccess: vi.fn(),
}));

vi.mock('@/lib/associates/repository', () => ({
  findAssociateById: mocks.findAssociateById,
  findDependentsByAssociateId: mocks.findDependentsByAssociateId,
  findHealthAgreementsByAssociateId: mocks.findHealthAgreementsByAssociateId,
}));
vi.mock('@/lib/associates/service', () => ({
  getAssociatesListPage: mocks.getAssociatesListPage,
}));
vi.mock('@/lib/associates/pii-mapping', () => ({
  decryptAssociatePii: mocks.decryptAssociatePii,
}));
vi.mock('@/lib/audit/service', () => ({
  logDataAccess: mocks.logDataAccess,
}));

import {
  getAssociate,
  listAssociateDependents,
  listAssociateHealthAgreements,
  searchAssociates,
} from './associates';

const principal = {
  userId: 3,
  role: 'secretaria' as const,
  tokenId: 8,
  name: 'Cursor',
};

describe('handlers MCP do Cadastro de Oficiais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca com paginação e sanitiza campos de armazenamento protegidos', async () => {
    mocks.getAssociatesListPage.mockResolvedValue({
      rows: [{ id: 1, fullName: 'Ana', cpfCiphertext: 'cipher-raw', cpfHash: 'hash-raw' }],
      total: 3,
    });

    const result = await searchAssociates(
      { q: 'Ana', offset: 20, limit: 20, associationStatus: 'associado' },
      principal,
    );

    expect(mocks.getAssociatesListPage).toHaveBeenCalledWith(
      2,
      20,
      'Ana',
      expect.objectContaining({ associationStatus: 'associado' }),
      undefined,
    );
    expect(result.structuredContent).toEqual({
      items: [{ id: 1, fullName: 'Ana' }],
      total: 3,
      limit: 20,
      offset: 20,
      has_more: false,
    });
    const firstItem = (result.structuredContent as { items: Record<string, unknown>[] }).items[0];
    expect(firstItem).not.toHaveProperty('cpfCiphertext');
    expect(firstItem).not.toHaveProperty('cpfHash');
  });

  it('retorna erro 404 acionável para oficial inexistente', async () => {
    mocks.findAssociateById.mockResolvedValue(null);

    const result = await getAssociate({ id: 999 }, principal);

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      error: {
        code: 'NOT_FOUND',
        status: 404,
        message: 'Oficial não encontrado.',
      },
    });
  });

  it('descriptografa PII somente quando solicitada e audita o acesso', async () => {
    mocks.findAssociateById.mockResolvedValue({
      id: 1,
      fullName: 'Ana',
      cpfCiphertext: 'cipher',
    });
    mocks.decryptAssociatePii.mockReturnValue({
      cpf: '12345678901',
      siape: null,
      primaryEmail: null,
      phone: null,
      whatsapp: null,
      address: null,
      rg: null,
    });

    const result = await getAssociate({ id: 1, include_sensitive: true }, principal);

    expect(mocks.decryptAssociatePii).toHaveBeenCalledOnce();
    expect(result.structuredContent).toMatchObject({ id: 1, cpf: '12345678901' });
    expect(mocks.logDataAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 3,
        entityId: 1,
        metadata: {
          channel: 'mcp',
          tool: 'asof_get_associate',
          includeSensitive: true,
        },
      }),
    );
  });

  it('rejeita acesso a dados sensíveis para papel não autorizado', async () => {
    mocks.findAssociateById.mockResolvedValue({
      id: 1,
      fullName: 'Ana',
      cpfCiphertext: 'cipher',
    });

    const unauthorizedPrincipal = {
      ...principal,
      role: 'convidado' as unknown as typeof principal.role,
    };

    const result = await getAssociate({ id: 1, include_sensitive: true }, unauthorizedPrincipal);

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      error: {
        code: 'FORBIDDEN',
        status: 403,
        message: 'Papel não autorizado para visualizar dados sensíveis.',
      },
    });
    expect(mocks.decryptAssociatePii).not.toHaveBeenCalled();
  });

  it('lista dependentes e convênios após validar o oficial com DTOs seguros', async () => {
    mocks.findAssociateById.mockResolvedValue({ id: 1 });
    mocks.findDependentsByAssociateId.mockResolvedValue([
      { id: 2, associateId: 1, name: 'Bia', relationship: 'filha', createdAt: new Date() },
    ]);
    mocks.findHealthAgreementsByAssociateId.mockResolvedValue([
      {
        id: 4,
        associateId: 1,
        provider: 'Plano',
        startDate: '2024-01-01',
        endDate: null,
        createdAt: new Date(),
      },
    ]);

    const dependents = await listAssociateDependents({ associateId: 1 }, principal);
    const agreements = await listAssociateHealthAgreements(
      { associateId: 1, include_sensitive: true },
      principal,
    );

    expect(dependents.structuredContent).toEqual({
      items: [{ id: 2, associateId: 1, name: 'Bia', relationship: 'filha' }],
    });
    expect(agreements.structuredContent).toEqual({
      items: [{ id: 4, associateId: 1, provider: 'Plano', startDate: '2024-01-01', endDate: null }],
    });
    expect(mocks.logDataAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          channel: 'mcp',
          tool: 'asof_list_associate_health_agreements',
          includeSensitive: true,
        },
      }),
    );
  });

  it('omite convênios de saúde quando include_sensitive for false', async () => {
    mocks.findAssociateById.mockResolvedValue({ id: 1 });
    mocks.findHealthAgreementsByAssociateId.mockResolvedValue([
      { id: 4, associateId: 1, provider: 'Plano', startDate: '2024-01-01', endDate: null },
    ]);

    const agreements = await listAssociateHealthAgreements(
      { associateId: 1, include_sensitive: false },
      principal,
    );

    expect(agreements.structuredContent).toEqual({ items: [] });
    expect(mocks.logDataAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          channel: 'mcp',
          tool: 'asof_list_associate_health_agreements',
          includeSensitive: false,
        },
      }),
    );
  });
});
