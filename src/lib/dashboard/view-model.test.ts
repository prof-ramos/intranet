import { beforeEach, describe, expect, it, vi } from 'vitest';

const queriesMock = vi.hoisted(() => ({
  getAssociateMetrics: vi.fn(),
  getActivityMetrics: vi.fn(),
  countActiveAssociates: vi.fn(),
  countActiveAssociatesByLocation: vi.fn(),
  countContributionsOkAssociates: vi.fn(),
  countInadimplentesAssociates: vi.fn(),
  countOpenActivities: vi.fn(),
  countOverdueActivities: vi.fn(),
  getActivitiesByStatus: vi.fn(),
  getBirthdaysThisMonth: vi.fn(),
  getTopRegions: vi.fn(),
  getUrgentActivities: vi.fn(),
  getKanbanCards: vi.fn(),
}));

vi.mock('@/lib/dashboard/queries', () => ({
  getAssociateMetrics: queriesMock.getAssociateMetrics,
  getActivityMetrics: queriesMock.getActivityMetrics,
  countActiveAssociates: queriesMock.countActiveAssociates,
  countActiveAssociatesByLocation: queriesMock.countActiveAssociatesByLocation,
  countContributionsOkAssociates: queriesMock.countContributionsOkAssociates,
  countInadimplentesAssociates: queriesMock.countInadimplentesAssociates,
  countOpenActivities: queriesMock.countOpenActivities,
  countOverdueActivities: queriesMock.countOverdueActivities,
  getActivitiesByStatus: queriesMock.getActivitiesByStatus,
  getBirthdaysThisMonth: queriesMock.getBirthdaysThisMonth,
  getTopRegions: queriesMock.getTopRegions,
  getUrgentActivities: queriesMock.getUrgentActivities,
  getKanbanCards: queriesMock.getKanbanCards,
}));

import { formatDashboardDueDate, getDashboardViewModel } from '@/lib/dashboard/view-model';

describe('formatDashboardDueDate', () => {
  it('formats ISO-like values as dd/mm', () => {
    expect(formatDashboardDueDate('2026-05-11')).toBe('11/05');
    expect(formatDashboardDueDate('2026-05-11T12:00:00.000Z')).toBe('11/05');
  });

  it('returns null for empty values', () => {
    expect(formatDashboardDueDate(null)).toBeNull();
    expect(formatDashboardDueDate(undefined)).toBeNull();
  });

  it('returns null for invalid date strings', () => {
    expect(formatDashboardDueDate('invalid')).toBeNull();
    expect(formatDashboardDueDate('2026-13-01')).toBeNull();
    expect(formatDashboardDueDate('2026-02-30')).toBeNull();
  });

  it('formats edge ISO dates with leading zeros', () => {
    expect(formatDashboardDueDate('2026-01-05')).toBe('05/01');
    expect(formatDashboardDueDate('2026-12-31')).toBe('31/12');
  });
});

describe('getDashboardViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queriesMock.getAssociateMetrics.mockResolvedValue({
      active: 763,
      byLocation: { brasil: 282, exterior: 481 },
      contributionsOk: 700,
      inadimplentes: 63,
    });
    queriesMock.getActivityMetrics.mockResolvedValue({
      open: 12,
      overdue: 3,
      byStatus: [
        { status: 'a_fazer', total: 4 },
        { status: 'em_andamento', total: 5 },
        { status: 'aguardando_terceiros', total: 2 },
        { status: 'concluido', total: 1 },
      ],
    });
    queriesMock.countActiveAssociates.mockResolvedValue(763);
    queriesMock.countActiveAssociatesByLocation.mockResolvedValue({
      brasil: 282,
      exterior: 481,
    });
    queriesMock.countContributionsOkAssociates.mockResolvedValue(700);
    queriesMock.countInadimplentesAssociates.mockResolvedValue(63);
    queriesMock.countOpenActivities.mockResolvedValue(12);
    queriesMock.countOverdueActivities.mockResolvedValue(3);
    queriesMock.getActivitiesByStatus.mockResolvedValue([
      { status: 'a_fazer', total: 4 },
      { status: 'em_andamento', total: 5 },
      { status: 'aguardando_terceiros', total: 2 },
      { status: 'concluido', total: 1 },
    ]);
    queriesMock.getTopRegions.mockResolvedValue([
      { country: 'Brasil', total: 381 },
      { country: 'Estados Unidos', total: 25 },
      { country: 'França', total: 15 },
    ]);
    queriesMock.getBirthdaysThisMonth.mockResolvedValue([]);
    queriesMock.getUrgentActivities.mockResolvedValue([
      {
        id: 1,
        title: 'Cobrar retorno',
        priority: 'urgente',
        dueDate: '2026-05-20',
        assigneeName: 'Ana Silva',
      },
    ]);
    queriesMock.getKanbanCards.mockResolvedValue([
      {
        id: 10,
        title: 'Atualizar cadastro',
        status: 'a_fazer',
        priority: 'alta',
        dueDate: '2026-05-21',
        associateName: 'Maria Oliveira',
      },
    ]);
  });

  it('builds the stripe with associate distribution by location', async () => {
    const viewModel = await getDashboardViewModel();

    expect(queriesMock.getAssociateMetrics).toHaveBeenCalledTimes(1);
    expect(queriesMock.getActivityMetrics).toHaveBeenCalledTimes(1);
    expect(queriesMock.countActiveAssociates).not.toHaveBeenCalled();
    expect(queriesMock.countActiveAssociatesByLocation).not.toHaveBeenCalled();
    expect(queriesMock.countContributionsOkAssociates).not.toHaveBeenCalled();
    expect(queriesMock.countInadimplentesAssociates).not.toHaveBeenCalled();
    expect(queriesMock.countOpenActivities).not.toHaveBeenCalled();
    expect(queriesMock.countOverdueActivities).not.toHaveBeenCalled();
    expect(queriesMock.getActivitiesByStatus).not.toHaveBeenCalled();
    expect(viewModel.stripe).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'active-associates',
          value: '763',
          label: 'associados ativos',
        }),
        expect.objectContaining({
          id: 'associates-location',
          label: 'distribuição de associados',
          segments: [
            {
              id: 'associates-brasil',
              value: '282',
              label: 'associados brasil',
              href: '/app/associados?associationStatus=associado&location=brasil',
            },
            {
              id: 'associates-exterior',
              value: '481',
              label: 'associados exterior',
              href: '/app/associados?associationStatus=associado&location=exterior',
            },
          ],
        }),
      ]),
    );
    expect(viewModel.stripe.find((item) => item.id === 'pending-migration')).toBeUndefined();
    expect(viewModel.stripe.find((item) => item.id === 'active-associates')?.href).toBe(
      '/app/associados?associationStatus=associado',
    );
    expect(viewModel.stripe.find((item) => item.id === 'open-activities')?.href).toBe(
      '/app/atividades?openOnly=1',
    );
  });

  it('calculates topRegions pct relative to total active associates', async () => {
    const viewModel = await getDashboardViewModel();

    // 381/763 ≈ 50%, 25/763 ≈ 3%, 15/763 ≈ 2%
    expect(viewModel.topRegions).toEqual([
      { country: 'Brasil', total: 381, pct: 50 },
      { country: 'Estados Unidos', total: 25, pct: 3 },
      { country: 'França', total: 15, pct: 2 },
    ]);
  });

  it('includes the assignee in urgent activities for the dispatch strip', async () => {
    const viewModel = await getDashboardViewModel();

    expect(viewModel.urgentActivities).toEqual([
      expect.objectContaining({ id: 1, assigneeName: 'Ana Silva' }),
    ]);
  });

  it('handles zero active associates without division by zero', async () => {
    queriesMock.getAssociateMetrics.mockResolvedValue({
      active: 0,
      byLocation: { brasil: 0, exterior: 0 },
      contributionsOk: 0,
      inadimplentes: 0,
    });
    queriesMock.countActiveAssociates.mockResolvedValue(0);
    queriesMock.getTopRegions.mockResolvedValue([]);

    const viewModel = await getDashboardViewModel();

    expect(viewModel.topRegions).toEqual([]);
    // contributionRate should be 0, not NaN
    expect(viewModel.stripe.find((s) => s.id === 'contribution-rate')?.value).toBe('0%');
  });

  it('includes Exterior (país não informado) as a valid region label', async () => {
    queriesMock.getTopRegions.mockResolvedValue([
      { country: 'Brasil', total: 279 },
      { country: 'Exterior (país não informado)', total: 102 },
      { country: 'Estados Unidos', total: 25 },
    ]);

    const viewModel = await getDashboardViewModel();

    expect(viewModel.topRegions).toEqual([
      { country: 'Brasil', total: 279, pct: 37 },
      { country: 'Exterior (país não informado)', total: 102, pct: 13 },
      { country: 'Estados Unidos', total: 25, pct: 3 },
    ]);
  });

  it('normalizes birthday names and assignments for display', async () => {
    queriesMock.getBirthdaysThisMonth.mockResolvedValue([
      {
        id: 1,
        fullName: 'PRISCILLA DE CARVALHO ANTONELLO',
        assignment: 'NOVA YORK - CONSULADO-GERAL',
        birthDayMonth: '01/06',
      },
      {
        id: 2,
        fullName: 'GABRIEL YURI SANT ANNA BARRETO',
        assignment: 'DINF - DIVISÃO DE INFRAESTRUTURA E SEGURANÇA DA INFORMAÇÃO',
        birthDayMonth: '03/06',
      },
    ]);

    const viewModel = await getDashboardViewModel();

    expect(viewModel.birthdaysThisMonth).toEqual([
      {
        id: 1,
        fullName: 'Priscilla de Carvalho Antonello',
        assignment: 'Nova York - Consulado-Geral',
        birthDayMonth: '01/06',
      },
      {
        id: 2,
        fullName: 'Gabriel Yuri Sant Anna Barreto',
        assignment: 'Dinf - Divisão de Infraestrutura e Segurança da Informação',
        birthDayMonth: '03/06',
      },
    ]);
  });
});
