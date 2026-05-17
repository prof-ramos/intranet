import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAssociatesWithPaymentsMock = vi.fn();
const unstableCacheMock = vi.fn();

vi.mock('./repository', () => ({
  getAssociatesWithPayments: (...args: unknown[]) => getAssociatesWithPaymentsMock(...args),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (...args: unknown[]) => unstableCacheMock(...args),
}));

import { buildMonthlyPaymentsCacheKey, getMonthlyPaymentsData } from './queries';

describe('finance queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAssociatesWithPaymentsMock.mockResolvedValue([{ associateId: 1 }]);
    unstableCacheMock.mockImplementation((fn: () => Promise<unknown>) => fn);
  });

  it('normalizes the cache key for semantically equivalent search filters', () => {
    expect(
      buildMonthlyPaymentsCacheKey(2026, 5, {
        q: '  Maria  ',
        status: 'pago',
        method: 'pix',
        location: 'brasil',
      }),
    ).toEqual([
      'finance-monthly',
      '2026',
      '5',
      'Maria',
      'pago',
      'pix',
      'brasil',
    ]);
  });

  it('uses the normalized cache key when reading monthly payments data', async () => {
    await getMonthlyPaymentsData(2026, 5, {
      q: '  Maria  ',
      status: 'pago',
      method: 'pix',
      location: 'brasil',
    });

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ['finance-monthly', '2026', '5', 'Maria', 'pago', 'pix', 'brasil'],
      { tags: ['finance-monthly-2026-5'], revalidate: 3600 },
    );
    expect(getAssociatesWithPaymentsMock).toHaveBeenCalledWith(2026, 5, {
      q: '  Maria  ',
      status: 'pago',
      method: 'pix',
      location: 'brasil',
    });
  });

  it('rejects invalid year and month values before touching the repository', async () => {
    expect(() => getMonthlyPaymentsData(1899, 5)).toThrow('Ano inválido.');
    expect(() => getMonthlyPaymentsData(2026, 13)).toThrow('Mês inválido.');

    expect(unstableCacheMock).not.toHaveBeenCalled();
    expect(getAssociatesWithPaymentsMock).not.toHaveBeenCalled();
  });
});
