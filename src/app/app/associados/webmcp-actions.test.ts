import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOfficialProfileAction, searchOfficialsAction } from './webmcp-actions';

const {
  requireAuthMock,
  getAssociatesListPageMock,
  getAssociateProfileMock,
  serializeOfficialProfileMock,
} = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  getAssociatesListPageMock: vi.fn(),
  getAssociateProfileMock: vi.fn(),
  serializeOfficialProfileMock: vi.fn(),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/associates/service', () => ({
  getAssociatesListPage: (...args: unknown[]) => getAssociatesListPageMock(...args),
  getAssociateProfile: (...args: unknown[]) => getAssociateProfileMock(...args),
}));

vi.mock('@/lib/webmcp/serialize', () => ({
  serializeOfficialProfile: (...args: unknown[]) => serializeOfficialProfileMock(...args),
}));

describe('searchOfficialsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: 7, role: 'secretaria' });
  });

  it('asks for a query or filter when both are missing', async () => {
    const result = await searchOfficialsAction({ q: '' });
    expect(result.rows).toEqual([]);
    expect(result.message).toMatch(/mínimo 2 caracteres/);
    expect(getAssociatesListPageMock).not.toHaveBeenCalled();
  });

  it('searches by name through the list page service', async () => {
    getAssociatesListPageMock.mockResolvedValue({
      rows: [
        {
          id: 4,
          fullName: 'Ana Silva',
          assignment: 'SERE',
          classPattern: null,
          functionalStatus: 'ativo',
          associationStatus: 'associado',
          contributionStatus: 'em_dia',
        },
      ],
      total: 1,
    });

    const result = await searchOfficialsAction({ q: 'Ana', searchBy: 'name' });

    expect(getAssociatesListPageMock).toHaveBeenCalledWith(
      1,
      20,
      'Ana',
      {
        contributionStatus: undefined,
        functionalStatus: undefined,
        associationStatus: undefined,
        location: undefined,
      },
      'name',
    );
    expect(result.rows[0]).toMatchObject({ id: 4, href: '/app/associados/4' });
    expect(result.total).toBe(1);
  });

  it('rejects invalid searchBy values before querying', async () => {
    await expect(searchOfficialsAction({ q: 'Ana', searchBy: 'email' } as never)).rejects.toThrow();
    expect(getAssociatesListPageMock).not.toHaveBeenCalled();
  });
});

describe('getOfficialProfileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: 7, role: 'secretaria' });
  });

  it('returns found:false when the official does not exist', async () => {
    getAssociateProfileMock.mockResolvedValue(null);
    await expect(getOfficialProfileAction({ id: 99 })).resolves.toEqual({ found: false, id: 99 });
  });

  it('serializes the profile for a found official', async () => {
    const profile = { associate: { id: 9, fullName: 'Ana' } };
    getAssociateProfileMock.mockResolvedValue(profile);
    serializeOfficialProfileMock.mockReturnValue({ id: 9, fullName: 'Ana', href: '/app/associados/9' });

    await expect(getOfficialProfileAction({ id: 9 })).resolves.toEqual({
      found: true,
      official: { id: 9, fullName: 'Ana', href: '/app/associados/9' },
    });
    expect(getAssociateProfileMock).toHaveBeenCalledWith(9, 'secretaria');
  });
});
