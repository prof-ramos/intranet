import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAssociatesWithPaymentsMock = vi.fn();
const unstableCacheMock = vi.hoisted(() => vi.fn((fn: (...args: unknown[]) => unknown) => fn));

vi.mock('./repository', () => ({
  getAssociatesWithPayments: (...args: unknown[]) => getAssociatesWithPaymentsMock(...args),
}));

vi.mock('next/cache', () => ({
  unstable_cache: unstableCacheMock,
}));

import { getMonthlyPaymentsData, reviveMonthlyPaymentsData } from './queries';

describe('finance queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unstableCacheMock.mockImplementation((fn: (...args: unknown[]) => unknown) => fn);
    getAssociatesWithPaymentsMock.mockResolvedValue({
      rows: [{ associateId: 1 }],
      total: 1,
      aggregates: {},
      page: 1,
      pageSize: 20,
    });
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
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      [
        'monthly-payments',
        '2026',
        '5',
        '{"q":"  Maria  ","status":"pago","method":"pix","origin":"","location":"brasil","page":"","pageSize":""}',
      ],
      {
        revalidate: 30,
        tags: ['finance:2026:5'],
      },
    );
  });

  it('rejects invalid year and month values before touching the repository', async () => {
    await expect(getMonthlyPaymentsData(1899, 5)).rejects.toThrow('Ano inválido.');
    await expect(getMonthlyPaymentsData(2026, 13)).rejects.toThrow('Mês inválido.');

    expect(getAssociatesWithPaymentsMock).not.toHaveBeenCalled();
  });

  it('revives Date fields after unstable_cache JSON round-trip', async () => {
    const paidAt = new Date('2026-05-10T03:00:00.000Z');
    const updatedAt = new Date('2026-05-13T12:34:56.789Z');
    getAssociatesWithPaymentsMock.mockResolvedValue({
      rows: [
        {
          associateId: 1,
          paidAt,
          cancelledAt: null,
          updatedAt,
        },
      ],
      total: 1,
      aggregates: {},
      page: 1,
      pageSize: 20,
    });
    unstableCacheMock.mockImplementation((fn: (...args: unknown[]) => unknown) => {
      return async () => JSON.parse(JSON.stringify(await (fn as () => Promise<unknown>)()));
    });

    const data = await getMonthlyPaymentsData(2026, 8);

    expect(data.rows[0].paidAt).toBeInstanceOf(Date);
    expect(data.rows[0].updatedAt).toBeInstanceOf(Date);
    expect(data.rows[0].cancelledAt).toBeNull();
    expect(data.rows[0].paidAt?.toISOString()).toBe(paidAt.toISOString());
    expect(data.rows[0].updatedAt?.toISOString()).toBe(updatedAt.toISOString());
  });
});

describe('reviveMonthlyPaymentsData', () => {
  it('converts ISO strings back into Date instances', () => {
    const revived = reviveMonthlyPaymentsData({
      rows: [
        {
          associateId: 1,
          fullName: 'Teste',
          defaultPaymentMethod: 'pix',
          functionalStatus: 'ativo',
          locationCountry: 'Brasil',
          locationCity: 'Brasília',
          paymentId: 10,
          paymentStatus: 'pago',
          monthPaymentMethod: 'pix',
          amount: '100.00',
          origin: 'comprovante',
          notes: null,
          paidAt: '2026-05-10T03:00:00.000Z' as unknown as Date,
          cancelledAt: null,
          updatedAt: '2026-05-13T00:00:00.000Z' as unknown as Date,
        },
      ],
      total: 1,
      aggregates: {
        total: 1,
        pagos: 1,
        pendentes: 0,
        atrasados: 0,
        isentos: 0,
        cancelados: 0,
        exterior: 0,
        folha: 0,
        boleto: 0,
        pix: 1,
        transferencia: 0,
        outros: 0,
        boletoPix: 0,
        paymentRecords: 1,
        valorRecebido: '100.00',
        sigepe: 0,
        itamaraty: 0,
        comprovante: 1,
        originOutros: 0,
      },
      page: 1,
      pageSize: 20,
    });

    expect(revived.rows[0].paidAt).toBeInstanceOf(Date);
    expect(revived.rows[0].updatedAt).toBeInstanceOf(Date);
    expect(revived.rows[0].paidAt?.toISOString()).toBe('2026-05-10T03:00:00.000Z');
  });
});
