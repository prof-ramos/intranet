import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('./associates', () => ({
  searchAssociates: vi.fn(),
  getAssociate: vi.fn(),
  listAssociateDependents: vi.fn(),
  listAssociateHealthAgreements: vi.fn(),
}));

import { filterToolsForRole, toolsForRole, type ToolDef } from './registry';

describe('registro de ferramentas MCP', () => {
  it('expõe as quatro ferramentas de cadastro para secretaria', () => {
    expect(toolsForRole('secretaria').map((tool) => tool.name)).toEqual([
      'asof_search_associates',
      'asof_get_associate',
      'asof_list_associate_dependents',
      'asof_list_associate_health_agreements',
    ]);
  });

  it('mantém anotações estritamente somente leitura na onda 1', () => {
    for (const tool of toolsForRole('admin')) {
      expect(tool.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      });
    }
  });

  it('rejeita offset desalinhado e convênio sem opt-in sensível', async () => {
    const searchTool = toolsForRole('secretaria').find(
      (tool) => tool.name === 'asof_search_associates',
    );
    const healthTool = toolsForRole('secretaria').find(
      (tool) => tool.name === 'asof_list_associate_health_agreements',
    );
    const principal = {
      userId: 3,
      role: 'secretaria' as const,
      tokenId: 8,
      name: 'Teste',
    };

    await expect(searchTool?.execute({ offset: 5, limit: 20 }, principal)).rejects.toThrow(
      'offset deve ser múltiplo de limit',
    );
    await expect(healthTool?.execute({ associateId: 1 }, principal)).rejects.toThrow();
  });

  it('filtra futuras ferramentas privilegiadas para secretaria', () => {
    const futureFinanceTool: ToolDef = {
      name: 'asof_future_finance',
      title: 'Financeiro futuro',
      description: 'Ferramenta reservada para onda futura.',
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
      allowedRoles: ['admin', 'diretoria'],
      execute: vi.fn(),
    };

    expect(filterToolsForRole([futureFinanceTool], 'secretaria')).toEqual([]);
    expect(filterToolsForRole([futureFinanceTool], 'diretoria')).toEqual([futureFinanceTool]);
  });
});
