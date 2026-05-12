import * as repository from './repository';
import { logAuditAction } from '@/lib/audit/service';
import { type NewMonthlyPayment } from '@/lib/db/schema/finance';

export async function updateMonthlyPayment(
  adminId: number,
  payment: Omit<NewMonthlyPayment, 'updatedBy' | 'updatedAt'>,
) {
  const result = await repository.upsertMonthlyPayment({
    ...payment,
    updatedBy: adminId,
  });
  const updatedPayment = result[0];

  if (!updatedPayment) {
    throw new Error('Falha ao atualizar pagamento mensal.');
  }

  await logAuditAction({
    adminId,
    action: 'update',
    entityType: 'monthly_payment',
    entityId: updatedPayment.id,
    changes: {
      old: {}, // For simplicity, we could fetch old state but keeping it simple for now
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
}

export async function initializeMonth(adminId: number, year: number, month: number) {
  const associates = await repository.getAssociatesWithPayments(year, month);
  
  const updates: NewMonthlyPayment[] = associates
    .filter(a => !a.paymentId) // Only for those without a payment record yet
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
