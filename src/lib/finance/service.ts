import * as repository from './repository';
import { logAuditAction } from '@/lib/audit/service';
import { requireRole } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { type NewMonthlyPayment } from '@/lib/db/schema/finance';

export async function updateMonthlyPayment(
  adminId: number,
  payment: Omit<NewMonthlyPayment, 'updatedBy' | 'updatedAt'>,
) {
  await requireRole(['admin', 'diretoria']);

  const result = await db.transaction(async (tx) => {
    const upserted = await repository.upsertMonthlyPayment({
      ...payment,
      updatedBy: adminId,
    });
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
        old: {},
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
