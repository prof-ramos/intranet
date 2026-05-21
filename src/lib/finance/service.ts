import * as repository from './repository';
import { markOverduePaymentsForAudit, type OverduePaymentTransition } from './repository';
import { logAuditAction } from '@/lib/audit/service';
import { db, type Tx } from '@/lib/db';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { monthlyPayments, type MonthlyPayment, type NewMonthlyPayment } from '@/lib/db/schema/finance';
import { auditLogs, type NewAuditLog } from '@/lib/db/schema/audit';
import { associates } from '@/lib/db/schema/associates';
import { and, eq, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import { sanitizePiiValue } from '@/lib/sanitize-pii';

const logger = createLogger('finance:service');

export async function autoMarkOverduePaymentsService(): Promise<number> {
  const rows = await db.transaction(async (tx) => {
    const transitioned = await markOverduePaymentsForAudit(tx);

    for (const payment of transitioned) {
      await logSystemOverdueTransition(payment, tx);
      await emitDomainEvent(
        {
          type: 'monthly_payment.updated',
          entityType: 'monthly_payment',
          entityId: payment.id,
          actorAdminId: null,
          payload: {
            associateId: payment.associateId,
            year: payment.year,
            month: payment.month,
            previousStatus: 'pendente',
            status: 'atrasado',
            paymentMethod: payment.paymentMethod,
            paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
            links: {
              app: `/app/financeiro/mensalidades?year=${payment.year}&month=${payment.month}`,
            },
          },
        },
        tx,
      );
    }

    return transitioned;
  });

  const count = rows.length;

  if (count > 0) {
    logger.info('[autoMarkOverdue] Transitioned payments pendente → atrasado', { count });
  }

  return count;
}

async function logSystemOverdueTransition(
  payment: OverduePaymentTransition,
  executor: Pick<Tx, 'insert'>,
) {
  const changes = {
    old: {
      status: 'pendente',
    },
    new: {
      status: 'atrasado',
    },
  } satisfies NonNullable<NewAuditLog['changes']>;

  const metadata = {
    actorType: 'system',
    associateId: payment.associateId,
    year: payment.year,
    month: payment.month,
  };

  await executor.insert(auditLogs).values({
    performedBy: null,
    action: 'auto_mark_overdue',
    entityType: 'monthly_payment',
    entityId: payment.id,
    changes: sanitizePiiValue(changes) as NewAuditLog['changes'],
    metadata: sanitizePiiValue(metadata) as NewAuditLog['metadata'],
  });
}

function getPaymentAuditState(payment: MonthlyPayment) {
  return {
    status: payment.status,
    paymentMethod: payment.paymentMethod,
    paidAt: payment.paidAt,
    cancelledAt: payment.cancelledAt,
    cancellationReason: payment.cancellationReason,
    cancelledBy: payment.cancelledBy,
  };
}

function validateCancellationReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    throw new Error('Motivo de cancelamento obrigatório.');
  }
  if (trimmed.length > 500) {
    throw new Error('Motivo de cancelamento deve ter no máximo 500 caracteres.');
  }
  return trimmed;
}

export function validateYearMonth(year: number, month: number): void {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error('Ano inválido.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mês inválido.');
  }
}

export async function updateMonthlyPayment(
  adminId: number,
  payment: Omit<NewMonthlyPayment, 'updatedBy' | 'updatedAt'>,
  expectedUpdatedAt?: string | null,
) {
  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(monthlyPayments)
      .where(
        and(
          eq(monthlyPayments.associateId, payment.associateId),
          eq(monthlyPayments.year, payment.year),
          eq(monthlyPayments.month, payment.month),
        ),
      )
      .limit(1);

    const current = existing[0] ?? null;

    if (current && expectedUpdatedAt != null) {
      const currentUpdatedAt = current.updatedAt?.toISOString() ?? null;
      if (currentUpdatedAt !== expectedUpdatedAt) {
        throw new Error('CONCURRENCY_CONFLICT');
      }
    }

    const oldState = current
      ? getPaymentAuditState(current)
      : null;

    const upserted = await tx
      .insert(monthlyPayments)
      .values({
        ...payment,
        updatedBy: adminId,
      })
      .onConflictDoUpdate({
        target: [monthlyPayments.associateId, monthlyPayments.year, monthlyPayments.month],
        set: {
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          paidAt: payment.paidAt,
          cancelledAt: null,
          cancellationReason: null,
          cancelledBy: null,
          updatedBy: adminId,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    const updatedPayment = upserted[0];

    if (!updatedPayment) {
      throw new Error('Falha ao atualizar pagamento mensal.');
    }

    await logAuditAction({
      adminId,
      action: 'update',
      entityType: 'monthly_payment',
      entityId: updatedPayment.id,
      changes: {
        old: oldState ?? {},
        new: {
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          paidAt: payment.paidAt,
          cancelledAt: null,
          cancellationReason: null,
          cancelledBy: null,
        },
      },
      metadata: {
        associateId: payment.associateId,
        year: payment.year,
        month: payment.month,
      },
    });

    if (oldState && oldState.status !== payment.status) {
      await emitDomainEvent(
        {
          type: 'monthly_payment.updated',
          entityType: 'monthly_payment',
          entityId: updatedPayment.id,
          actorAdminId: adminId,
          payload: {
            associateId: payment.associateId,
            year: payment.year,
            month: payment.month,
            previousStatus: oldState.status,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
            links: {
              app: `/app/financeiro/mensalidades?year=${payment.year}&month=${payment.month}`,
            },
          },
        },
        tx,
      );
    }

    return updatedPayment;
  });

  return result;
}

export async function cancelMonthlyPayment(adminId: number, paymentId: number, reason: string) {
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    throw new Error('Mensalidade inválida.');
  }

  const cancellationReason = validateCancellationReason(reason);

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(monthlyPayments)
      .where(eq(monthlyPayments.id, paymentId))
      .limit(1);

    const current = rows[0] ?? null;
    if (!current) {
      throw new Error('PAYMENT_NOT_FOUND');
    }
    if (current.status === 'cancelado') {
      throw new Error('PAYMENT_ALREADY_CANCELLED');
    }

    const cancelledAt = new Date();
    const oldState = getPaymentAuditState(current);
    const [updatedPayment] = await tx
      .update(monthlyPayments)
      .set({
        status: 'cancelado',
        paidAt: null,
        cancelledAt,
        cancellationReason,
        cancelledBy: adminId,
        updatedBy: adminId,
        updatedAt: sql`now()`,
      })
      .where(eq(monthlyPayments.id, paymentId))
      .returning();

    if (!updatedPayment) {
      throw new Error('Falha ao cancelar mensalidade.');
    }

    const newState = getPaymentAuditState(updatedPayment);
    await tx.insert(auditLogs).values({
      performedBy: adminId,
      action: 'cancel',
      entityType: 'monthly_payment',
      entityId: updatedPayment.id,
      changes: sanitizePiiValue({
        old: oldState,
        new: newState,
      }) as NewAuditLog['changes'],
      metadata: sanitizePiiValue({
        associateId: updatedPayment.associateId,
        year: updatedPayment.year,
        month: updatedPayment.month,
        cancellationReason,
      }) as NewAuditLog['metadata'],
    });

    await emitDomainEvent(
      {
        type: 'monthly_payment.updated',
        entityType: 'monthly_payment',
        entityId: updatedPayment.id,
        actorAdminId: adminId,
        payload: {
          associateId: updatedPayment.associateId,
          year: updatedPayment.year,
          month: updatedPayment.month,
          previousStatus: oldState.status,
          status: 'cancelado',
          paymentMethod: updatedPayment.paymentMethod,
          paidAt: null,
          cancelledAt: cancelledAt.toISOString(),
          cancellationReason,
          links: {
            app: `/app/financeiro/mensalidades?year=${updatedPayment.year}&month=${updatedPayment.month}`,
          },
        },
      },
      tx,
    );

    return updatedPayment;
  });
}

export async function initializeMonth(adminId: number, year: number, month: number) {
  validateYearMonth(year, month);

  const count = await db.transaction(async (tx) => {
    // Read and write in the same transaction to prevent TOCTOU races
    const rows = await tx
      .select({
        associateId: associates.id,
        defaultPaymentMethod: associates.paymentMethod,
        paymentId: monthlyPayments.id,
      })
      .from(associates)
      .leftJoin(
        monthlyPayments,
        and(
          eq(associates.id, monthlyPayments.associateId),
          eq(monthlyPayments.year, year),
          eq(monthlyPayments.month, month),
        ),
      )
      .where(eq(associates.associationStatus, 'ativo'));

    const updates: NewMonthlyPayment[] = rows
      .filter(r => !r.paymentId)
      .map(r => ({
        associateId: r.associateId,
        year,
        month,
        status: r.defaultPaymentMethod === 'folha' ? 'pago' : 'pendente',
        paymentMethod: r.defaultPaymentMethod,
        updatedBy: adminId,
      }));

    if (updates.length > 0) {
      await Promise.all(updates.map((update) => repository.upsertMonthlyPayment(update, tx)));
    }

    await logAuditAction({
      adminId,
      action: 'initialize_month',
      entityType: 'finance',
      entityId: null,
      metadata: { year, month, count: updates.length },
    });

    return updates.length;
  });

  return count;
}
