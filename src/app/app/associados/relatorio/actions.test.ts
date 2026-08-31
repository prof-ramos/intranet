import { beforeEach, describe, expect, it, vi } from 'vitest';
import { countReportAssociatesAction } from './actions';

const { requireRoleMock, countAssociatesForReportMock } = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  countAssociatesForReportMock: vi.fn(),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/reports/queries', () => ({
  countAssociatesForReport: (...args: unknown[]) => countAssociatesForReportMock(...args),
}));

const ALL_TODOS = {
  functionalStatus: 'todos',
  associationStatus: 'todos',
  contributionStatus: 'todos',
  missionType: 'todos',
  careerOrigin: 'todos',
  paymentMethod: 'todos',
  birthMonth: 'todos',
};

describe('countReportAssociatesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({
      userId: 7,
      name: 'Operador',
      email: 'operador@asof.local',
      role: 'diretoria',
      mustChangePassword: false,
    });
    countAssociatesForReportMock.mockResolvedValue(42);
  });

  it('counts the current recorte after stripping neutral filters', async () => {
    await expect(countReportAssociatesAction(ALL_TODOS)).resolves.toEqual({ count: 42 });
    expect(requireRoleMock).toHaveBeenCalledWith(['admin', 'diretoria']);
    expect(countAssociatesForReportMock).toHaveBeenCalledWith({});
  });

  it('forwards parsed filters to the count query', async () => {
    countAssociatesForReportMock.mockResolvedValue(4);
    await expect(
      countReportAssociatesAction({
        ...ALL_TODOS,
        functionalStatus: 'ativo',
        contributionStatus: 'em_dia',
        birthMonth: '5',
      }),
    ).resolves.toEqual({ count: 4 });
    expect(countAssociatesForReportMock).toHaveBeenCalledWith({
      functionalStatus: 'ativo',
      contributionStatus: 'em_dia',
      birthMonth: 5,
    });
  });

  it('rejects callers without report access', async () => {
    requireRoleMock.mockRejectedValue(new Error('Forbidden'));
    await expect(countReportAssociatesAction(ALL_TODOS)).rejects.toThrow('Forbidden');
    expect(countAssociatesForReportMock).not.toHaveBeenCalled();
  });
});
