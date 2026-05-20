import * as repository from './repository';
import { markOverduePayments } from './repository';
import { logAuditAction } from '@/lib/audit/service';
import { db } from '@/lib/db';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { monthlyPayments, type NewMonthlyPayment } from '@/lib/db/schema/finance';
import { associates } from '@/lib/db/schema/associates';
import { and, eq, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('finance:service');

export async function autoMarkOverduePaymentsService(): Promise<number> {
  const count = await markOverduePayments();

  if (count > 0) {
    logger.info('[autoMarkOverdue] Transitioned payments pendente → atrasado', { count });
  }

  return count;
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
      ? {
          status: current.status,
          paymentMethod: current.paymentMethod,
          paidAt: current.paidAt,
        }
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
