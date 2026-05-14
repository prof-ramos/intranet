import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateMonthlyPayment } from './service';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { logAuditAction } from '@/lib/audit/service';

const transactionMock = vi.hoisted(() => ({
  tx: {
    __tx: true,
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn(async (callback: (tx: typeof transactionMock.tx) => Promise<unknown>) =>
      callback(transactionMock.tx),
    ),
  },
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: vi.fn(),
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: vi.fn(),
}));

describe('finance service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const limit = vi.fn();
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const returning = vi.fn();
    const onConflictDoUpdate = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const insert = vi.fn(() => ({ values }));

    transactionMock.tx.select = select;
    transactionMock.tx.insert = insert;

    limit.mockResolvedValue([
      {
        id: 5,
        status: 'pendente',
        paymentMethod: 'boleto',
        paidAt: null,
        updatedAt: new Date('2026-05-13T00:00:00.000Z'),
      },
    ]);

    returning.mockResolvedValue([
      {
        id: 5,
      },
    ]);
  });

  it('emits a domain event when the payment status changes', async () => {
    await updateMonthlyPayment(1, {
      associateId: 10,
      year: 2026,
      month: 5,
      status: 'pago',
      paymentMethod: 'boleto',
      paidAt: new Date('2026-05-13T12:00:00.000Z'),
    });

    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 1,
        action: 'update',
        entityType: 'monthly_payment',
        entityId: 5,
        changes: {
          old: {
            status: 'pendente',
            paymentMethod: 'boleto',
            paidAt: null,
          },
          new: {
            status: 'pago',
            paymentMethod: 'boleto',
            paidAt: new Date('2026-05-13T12:00:00.000Z'),
          },
        },
        metadata: {
          associateId: 10,
          year: 2026,
          month: 5,
        },
      }),
    );
    expect(JSON.stringify(vi.mocked(logAuditAction).mock.calls[0][0])).not.toMatch(
      /cpf|siape|address/i,
    );
    expect(emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'monthly_payment.updated',
        entityType: 'monthly_payment',
        entityId: 5,
        actorAdminId: 1,
        payload: {
          associateId: 10,
          year: 2026,
          month: 5,
          previousStatus: 'pendente',
          status: 'pago',
          paymentMethod: 'boleto',
          paidAt: '2026-05-13T12:00:00.000Z',
          links: {
            app: '/app/financeiro/mensalidades?year=2026&month=5',
          },
        },
      }),
      transactionMock.tx,
    );
    expect(JSON.stringify(vi.mocked(emitDomainEvent).mock.calls[0][0])).not.toMatch(
      /cpf|siape|address/i,
    );
  });

  it('does not emit a domain event when the payment status is unchanged', async () => {
    await updateMonthlyPayment(1, {
      associateId: 10,
      year: 2026,
      month: 5,
      status: 'pendente',
      paymentMethod: 'boleto',
      paidAt: null,
    });

    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        metadata: {
          associateId: 10,
          year: 2026,
          month: 5,
        },
      }),
    );
    expect(emitDomainEvent).not.toHaveBeenCalled();
  });

  it('does not emit a domain event when the payment row is created for the first time', async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const returning = vi.fn().mockResolvedValue([{ id: 9 }]);
    const onConflictDoUpdate = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const insert = vi.fn(() => ({ values }));

    transactionMock.tx.select = select;
    transactionMock.tx.insert = insert;

    await updateMonthlyPayment(1, {
      associateId: 10,
      year: 2026,
      month: 5,
      status: 'pendente',
      paymentMethod: 'boleto',
      paidAt: null,
    });

    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        changes: expect.objectContaining({
          old: {},
          new: expect.objectContaining({
            status: 'pendente',
          }),
        }),
        metadata: {
          associateId: 10,
          year: 2026,
          month: 5,
        },
      }),
    );
    expect(emitDomainEvent).not.toHaveBeenCalled();
  });
});
