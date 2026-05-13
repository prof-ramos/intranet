import * as repository from './repository';
import { logAuditAction } from '@/lib/audit/service';
import { requireRole } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { monthlyPayments, type NewMonthlyPayment } from '@/lib/db/schema/finance';
import { and, eq, sql } from 'drizzle-orm';

export async function updateMonthlyPayment(
  adminId: number,
  payment: Omit<NewMonthlyPayment, 'updatedBy' | 'updatedAt'>,
  expectedUpdatedAt?: string | null,
) {
  await requireRole(['admin', 'diretoria']);

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

    return updatedPayment;
  });

  return result;
}

export async function initializeMonth(adminId: number, year: number, month: number) {
  const associates = await repository.getAssociatesWithPayments(year, month);

  const updates: NewMonthlyPayment[] = associates
    .filter(a => !a.paymentId)
    .map(a => ({
      associateId: a.associateId,
      year,
      month,
      status: a.defaultPaymentMethod === 'folha' ? 'pago' : 'pendente',
      paymentMethod: a.defaultPaymentMethod,
      updatedBy: adminId,
    }));

  if (updates.length > 0) {
    await Promise.all(updates.map((update) => repository.upsertMonthlyPayment(update)));
  }

  await logAuditAction({
    adminId,
    action: 'initialize_month',
    entityType: 'finance',
    entityId: null,
    metadata: {
      year,
      month,
      count: updates.length,
    },
  });

  return updates.length;
}
