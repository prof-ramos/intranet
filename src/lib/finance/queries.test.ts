import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAssociatesWithPaymentsMock = vi.fn();

vi.mock('./repository', () => ({
  getAssociatesWithPayments: (...args: unknown[]) => getAssociatesWithPaymentsMock(...args),
}));

import { getMonthlyPaymentsData } from './queries';

describe('finance queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAssociatesWithPaymentsMock.mockResolvedValue([{ associateId: 1 }]);
  });

  it('calls the repository with year, month and filters', async () => {
    await getMonthlyPaymentsData(2026, 5, {
      q: '  Maria  ',
      status: 'pago',
      method: 'pix',
      location: 'brasil',
    });

    expect(getAssociatesWithPaymentsMock).toHaveBeenCalledWith(2026, 5, {
      q: '  Maria  ',
      status: 'pago',
      method: 'pix',
      location: 'brasil',
    });
  });

  it('rejects invalid year and month values before touching the repository', async () => {
    await expect(getMonthlyPaymentsData(1899, 5)).rejects.toThrow('Ano inválido.');
    await expect(getMonthlyPaymentsData(2026, 13)).rejects.toThrow('Mês inválido.');

    expect(getAssociatesWithPaymentsMock).not.toHaveBeenCalled();
  });
});
