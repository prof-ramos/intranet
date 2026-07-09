import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAssociatesForEtiquetas } from './actions';

const requireRole = vi.fn();
const searchAssociatesForEtiquetas = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));

vi.mock('@/lib/etiquetas/associates', () => ({
  searchAssociatesForEtiquetas: (...args: unknown[]) => searchAssociatesForEtiquetas(...args),
}));

describe('etiquetas actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({
      userId: 3,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      mustChangePassword: false,
    });
  });

  it('requires admin, diretoria or secretaria and searches without query', async () => {
    const options = [{ id: 1, nome: 'Ana', lotacao: null, cidade: null, uf: null }];
    searchAssociatesForEtiquetas.mockResolvedValue(options);

    await expect(fetchAssociatesForEtiquetas()).resolves.toEqual(options);

    expect(requireRole).toHaveBeenCalledWith(['admin', 'diretoria', 'secretaria']);
    expect(searchAssociatesForEtiquetas).toHaveBeenCalledWith(undefined);
  });

  it('forwards the search query to the associates helper', async () => {
    searchAssociatesForEtiquetas.mockResolvedValue([]);

    await expect(fetchAssociatesForEtiquetas('paris')).resolves.toEqual([]);

    expect(searchAssociatesForEtiquetas).toHaveBeenCalledWith('paris');
  });

  it('rejects non-string query input via schema validation', async () => {
    await expect(fetchAssociatesForEtiquetas(42 as unknown as string)).rejects.toThrow();
    expect(searchAssociatesForEtiquetas).not.toHaveBeenCalled();
  });
});
