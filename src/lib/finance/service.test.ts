import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  autoMarkOverduePaymentsService,
  cancelMonthlyPayment,
  updateMonthlyPayment,
  validateStatusTransition,
} from './service';
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
    insertValues: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn(async (callback: (tx: typeof transactionMock.tx) => Promise<unknown>) =>
      callback(transactionMock.tx),
    ),
    update: vi.fn(),
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
    const insertValues = values;
    const updateReturning = vi.fn();
    const updateWhere = vi.fn(() => ({ returning: updateReturning }));
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    const update = vi.fn(() => ({ set: updateSet }));

    transactionMock.tx.select = select;
    transactionMock.tx.insert = insert;
    transactionMock.tx.insertValues = insertValues;
    transactionMock.tx.update = update;

    limit.mockResolvedValue([
      {
        id: 5,
        associateId: 10,
        year: 2026,
        month: 5,
        status: 'pendente',
        paymentMethod: 'boleto',
        paidAt: null,
        cancelledAt: null,
        cancellationReason: null,
        cancelledBy: null,
        updatedAt: new Date('2026-05-13T00:00:00.000Z'),
      },
    ]);

    returning.mockResolvedValue([
      {
        id: 5,
      },
    ]);

    updateReturning.mockResolvedValue([
      {
        id: 5,
        associateId: 10,
        year: 2026,
        month: 4,
        status: 'atrasado',
        paymentMethod: 'boleto',
        paidAt: null,
      },
    ]);
  });

  it('audits and emits system domain events for automatic overdue transitions', async () => {
    const count = await autoMarkOverduePaymentsService();

    expect(count).toBe(1);
    expect(transactionMock.tx.update).toHaveBeenCalled();
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: null,
        action: 'auto_mark_overdue',
        entityType: 'monthly_payment',
        entityId: 5,
        changes: {
          old: {
            status: 'pendente',
          },
          new: {
            status: 'atrasado',
          },
        },
        metadata: {
          actorType: 'system',
          associateId: 10,
          year: 2026,
          month: 4,
        },
      }),
    );
    expect(emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'monthly_payment.updated',
        entityType: 'monthly_payment',
        entityId: 5,
        actorAdminId: null,
        payload: {
          associateId: 10,
          year: 2026,
          month: 4,
          previousStatus: 'pendente',
          status: 'atrasado',
          paymentMethod: 'boleto',
          paidAt: null,
          links: {
            app: '/app/financeiro/mensalidades?year=2026&month=4',
          },
        },
      }),
    );
    expect(JSON.stringify(vi.mocked(logAuditAction).mock.calls[0][0])).not.toMatch(
      /cpf|siape|address/i,
    );
    expect(JSON.stringify(vi.mocked(emitDomainEvent).mock.calls[0][0])).not.toMatch(
      /cpf|siape|address/i,
    );
  });

  it('emits a domain event when the payment status changes', async () => {
    await updateMonthlyPayment(1, {
      associateId: 10,
      year: 2026,
      month: 5,
      status: 'pago',
      paymentMethod: 'boleto',
    });

    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 1,
        action: 'update',
        entityType: 'monthly_payment',
        entityId: 5,
        changes: {
          old: expect.objectContaining({
            status: 'pendente',
            paymentMethod: 'boleto',
            paidAt: null,
          }),
          new: expect.objectContaining({
            status: 'pago',
            paymentMethod: 'boleto',
            paidAt: expect.any(Date),
          }),
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
        payload: expect.objectContaining({
          associateId: 10,
          year: 2026,
          month: 5,
          previousStatus: 'pendente',
          status: 'pago',
          paymentMethod: 'boleto',
          paidAt: expect.any(String),
          links: {
            app: '/app/financeiro/mensalidades?year=2026&month=5',
          },
        }),
      }),
      transactionMock.tx,
    );
    expect(JSON.stringify(vi.mocked(emitDomainEvent).mock.calls[0][0])).not.toMatch(
      /cpf|siape|address/i,
    );
  });

  it('preserves paidAt when re-updating an already-pago payment', async () => {
    // Scenario: admin changes paymentMethod on an already-paid record.
    // paidAt should NOT be reset to new Date() — the original payment date must be preserved.
    const originalPaidAt = new Date('2026-04-15T10:30:00.000Z');

    // Override the default mock to return a 'pago' record with an existing paidAt
    transactionMock.tx.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 5,
              associateId: 10,
              year: 2026,
              month: 5,
              status: 'pago',
              paymentMethod: 'boleto',
              paidAt: originalPaidAt,
              cancelledAt: null,
              cancellationReason: null,
              cancelledBy: null,
              updatedAt: new Date('2026-05-13T00:00:00.000Z'),
            },
          ]),
        }),
      }),
    });

    await updateMonthlyPayment(1, {
      associateId: 10,
      year: 2026,
      month: 5,
      status: 'pago',
      paymentMethod: 'pix', // changing method, status stays 'pago'
    });

    // The audit should show the old paidAt is preserved, not replaced with now()
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: expect.objectContaining({
          old: expect.objectContaining({ paidAt: originalPaidAt }),
          new: expect.objectContaining({ paidAt: originalPaidAt }),
        }),
      }),
    );
  });

  it('does not emit a domain event when the payment status is unchanged', async () => {
    await updateMonthlyPayment(1, {
      associateId: 10,
      year: 2026,
      month: 5,
      status: 'pendente',
      paymentMethod: 'boleto',
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

  it('cancels a payment with before/after audit and domain event', async () => {
    const cancelledAt = new Date('2026-05-21T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(cancelledAt);

    const updateReturning = vi.fn().mockResolvedValue([
      {
        id: 5,
        associateId: 10,
        year: 2026,
        month: 5,
        status: 'cancelado',
        paymentMethod: 'boleto',
        paidAt: null,
        cancelledAt,
        cancellationReason: 'Lançamento em duplicidade',
        cancelledBy: 1,
      },
    ]);
    const updateWhere = vi.fn(() => ({ returning: updateReturning }));
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    transactionMock.tx.update = vi.fn(() => ({ set: updateSet }));

    await cancelMonthlyPayment(1, 5, ' Lançamento em duplicidade ');

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelado',
        paidAt: null,
        cancelledAt,
        cancellationReason: 'Lançamento em duplicidade',
        cancelledBy: 1,
        updatedBy: 1,
      }),
    );
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 1,
        action: 'cancel',
        entityType: 'monthly_payment',
        entityId: 5,
        changes: {
          old: {
            status: 'pendente',
            paymentMethod: 'boleto',
            paidAt: null,
            cancelledAt: null,
            cancellationReason: null,
            cancelledBy: null,
          },
          new: {
            status: 'cancelado',
            paymentMethod: 'boleto',
            paidAt: null,
            cancelledAt: cancelledAt,
            cancellationReason: 'Lançamento em duplicidade',
            cancelledBy: 1,
          },
        },
        metadata: {
          associateId: 10,
          year: 2026,
          month: 5,
          cancellationReason: 'Lançamento em duplicidade',
        },
        executor: transactionMock.tx,
      }),
    );
    expect(emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'monthly_payment.updated',
        entityType: 'monthly_payment',
        entityId: 5,
        actorAdminId: 1,
        payload: expect.objectContaining({
          associateId: 10,
          year: 2026,
          month: 5,
          previousStatus: 'pendente',
          status: 'cancelado',
          paidAt: null,
          cancelledAt: '2026-05-21T12:00:00.000Z',
          cancellationReason: 'Lançamento em duplicidade',
        }),
      }),
      transactionMock.tx,
    );

    vi.useRealTimers();
  });

  it('rejects cancellation without a reason', async () => {
    await expect(cancelMonthlyPayment(1, 5, '  ')).rejects.toThrow(
      'Motivo de cancelamento obrigatório.',
    );
    expect(transactionMock.tx.update).not.toHaveBeenCalled();
  });
});

describe('validateStatusTransition', () => {
  it('allows valid transitions from pendente', () => {
    expect(() => validateStatusTransition('pendente', 'pago')).not.toThrow();
    expect(() => validateStatusTransition('pendente', 'atrasado')).not.toThrow();
    expect(() => validateStatusTransition('pendente', 'isento')).not.toThrow();
  });

  it('allows valid transitions from atrasado', () => {
    expect(() => validateStatusTransition('atrasado', 'pago')).not.toThrow();
    expect(() => validateStatusTransition('atrasado', 'pendente')).not.toThrow();
    expect(() => validateStatusTransition('atrasado', 'isento')).not.toThrow();
  });

  it('allows valid transitions from pago', () => {
    expect(() => validateStatusTransition('pago', 'pendente')).not.toThrow();
  });

  it('allows valid transitions from isento', () => {
    expect(() => validateStatusTransition('isento', 'pendente')).not.toThrow();
  });

  it('rejects transitions from cancelado (terminal state)', () => {
    expect(() => validateStatusTransition('cancelado', 'pago')).toThrow(
      /Transição inválida/,
    );
    expect(() => validateStatusTransition('cancelado', 'pendente')).toThrow(
      /Transição inválida/,
    );
  });

  it('rejects invalid transitions', () => {
    expect(() => validateStatusTransition('isento', 'pago')).toThrow(
      /Transição inválida/,
    );
    expect(() => validateStatusTransition('pago', 'isento')).toThrow(
      /Transição inválida/,
    );
    expect(() => validateStatusTransition('pago', 'atrasado')).toThrow(
      /Transição inválida/,
    );
    // Cancellation is a separate flow via cancelMonthlyPayment
    expect(() => validateStatusTransition('pendente', 'cancelado')).toThrow(
      /Transição inválida/,
    );
    expect(() => validateStatusTransition('atrasado', 'cancelado')).toThrow(
      /Transição inválida/,
    );
    expect(() => validateStatusTransition('pago', 'cancelado')).toThrow(
      /Transição inválida/,
    );
    expect(() => validateStatusTransition('isento', 'cancelado')).toThrow(
      /Transição inválida/,
    );
  });
});
