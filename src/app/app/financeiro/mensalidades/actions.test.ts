import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelPaymentAction, initializeMonthAction, updatePaymentAction } from './actions';

const requireRoleMock = vi.fn();
const updateMonthlyPaymentMock = vi.fn();
const cancelMonthlyPaymentMock = vi.fn();
const initializeMonthMock = vi.fn();
const revalidatePathMock = vi.fn();
const revalidateTagMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/finance/service', () => ({
  updateMonthlyPayment: (...args: unknown[]) => updateMonthlyPaymentMock(...args),
  cancelMonthlyPayment: (...args: unknown[]) => cancelMonthlyPaymentMock(...args),
  initializeMonth: (...args: unknown[]) => initializeMonthMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}));

describe('financeiro mensalidades actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7 });
    updateMonthlyPaymentMock.mockResolvedValue(undefined);
    cancelMonthlyPaymentMock.mockResolvedValue(undefined);
    initializeMonthMock.mockResolvedValue({ created: 12, maintained: 0, rejected: 0 });
  });

  it('updates payment and revalidates caches on success', async () => {
    const result = await updatePaymentAction({
      associateId: 10,
      year: 2026,
      month: 5,
      status: 'pago',
      paymentMethod: 'boleto',
      expectedUpdatedAt: '2026-05-17T11:00:00.000Z',
    });

    expect(result).toEqual({ success: true });
    expect(updateMonthlyPaymentMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        associateId: 10,
        year: 2026,
        month: 5,
        status: 'pago',
        paymentMethod: 'boleto',
      }),
      '2026-05-17T11:00:00.000Z',
    );
    expect(revalidateTagMock).toHaveBeenCalledWith('finance-monthly-2026-5', 'max');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/financeiro/mensalidades');
  });

  it('returns a typed concurrency conflict result', async () => {
    updateMonthlyPaymentMock.mockRejectedValue(new Error('CONCURRENCY_CONFLICT'));

    const result = await updatePaymentAction({
      associateId: 10,
      year: 2026,
      month: 5,
      status: 'pago',
      paymentMethod: 'boleto',
      expectedUpdatedAt: null,
    });

    expect(result).toEqual({ success: false, error: 'CONCURRENCY_CONFLICT' });
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('strips generated database fields before calling the service', async () => {
    await updatePaymentAction({
      id: 999,
      associateId: 10,
      year: 2026,
      month: 5,
      status: 'pago',
      paymentMethod: 'boleto',
      expectedUpdatedAt: null,
    } as Parameters<typeof updatePaymentAction>[0] & { id: number });

    expect(updateMonthlyPaymentMock.mock.calls[0]?.[1]).not.toHaveProperty('id');
  });

  it('rejects invalid associate ids before touching the service', async () => {
    await expect(
      updatePaymentAction({
        associateId: 0,
        year: 2026,
        month: 5,
        status: 'pago',
        paymentMethod: 'boleto',
        expectedUpdatedAt: null,
      }),
    ).rejects.toThrow('Associado inválido.');

    expect(updateMonthlyPaymentMock).not.toHaveBeenCalled();
  });

  it('rejects invalid payment methods before touching the service', async () => {
    await expect(
      updatePaymentAction({
        associateId: 10,
        year: 2026,
        month: 5,
        status: 'pago',
        paymentMethod: 'cartao' as never,
        expectedUpdatedAt: null,
      }),
    ).rejects.toThrow('Método de pagamento inválido.');

    expect(updateMonthlyPaymentMock).not.toHaveBeenCalled();
  });

  it('preserves localized year and month validation messages', async () => {
    const input = {
      associateId: 10,
      status: 'pago' as const,
      paymentMethod: 'boleto' as const,
      expectedUpdatedAt: null,
    };

    await expect(updatePaymentAction({ ...input, year: 1999, month: 5 })).rejects.toThrow(
      'Ano inválido.',
    );
    await expect(updatePaymentAction({ ...input, year: 2026, month: 13 })).rejects.toThrow(
      'Mês inválido.',
    );
    expect(updateMonthlyPaymentMock).not.toHaveBeenCalled();
  });

  it('initializes month and revalidates caches', async () => {
    const result = await initializeMonthAction(2026, 5);

    expect(result).toEqual({ success: true, created: 12, maintained: 0, rejected: 0 });
    expect(initializeMonthMock).toHaveBeenCalledWith(7, 2026, 5);
    expect(revalidateTagMock).toHaveBeenCalledWith('finance-monthly-2026-5', 'max');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/financeiro/mensalidades');
  });

  it('cancels a payment and revalidates caches', async () => {
    const result = await cancelPaymentAction({
      paymentId: 99,
      year: 2026,
      month: 5,
      reason: 'Lançamento em duplicidade',
    });

    expect(result).toEqual({ success: true });
    expect(cancelMonthlyPaymentMock).toHaveBeenCalledWith(7, 99, 'Lançamento em duplicidade');
    expect(revalidateTagMock).toHaveBeenCalledWith('finance-monthly-2026-5', 'max');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/financeiro/mensalidades');
  });

  it('returns a typed result when cancelling an already cancelled payment', async () => {
    cancelMonthlyPaymentMock.mockRejectedValue(new Error('PAYMENT_ALREADY_CANCELLED'));

    const result = await cancelPaymentAction({
      paymentId: 99,
      year: 2026,
      month: 5,
      reason: 'Duplicidade',
    });

    expect(result).toEqual({ success: false, error: 'PAYMENT_ALREADY_CANCELLED' });
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
