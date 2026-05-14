'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireRole } from '@/lib/auth/authorization';
import { updateMonthlyPayment, initializeMonth, validateYearMonth } from '@/lib/finance/service';
import { type NewMonthlyPayment } from '@/lib/db/schema/finance';

const validPaymentStatuses = ['pago', 'pendente', 'atrasado', 'isento'] as const;
const validPaymentMethods = ['folha', 'boleto', 'pix', 'transferencia', 'outros'] as const;

export async function updatePaymentAction(
  payment: Omit<NewMonthlyPayment, 'updatedBy' | 'updatedAt'> & {
    expectedUpdatedAt?: string | null;
  },
) {
  const user = await requireRole(['admin', 'diretoria']);
  validatePaymentInput(payment);

  const { expectedUpdatedAt, ...paymentData } = payment;

  try {
    await updateMonthlyPayment(user.userId, paymentData, expectedUpdatedAt);
  } catch (error) {
    if (error instanceof Error && error.message === 'CONCURRENCY_CONFLICT') {
      return { success: false, error: 'CONCURRENCY_CONFLICT' } as const;
    }
    throw error;
  }

  revalidateTag(`finance-monthly-${payment.year}-${payment.month}`, 'max');
  revalidatePath('/app/financeiro/mensalidades');

  return { success: true } as const;
}

export async function initializeMonthAction(year: number, month: number) {
  const user = await requireRole(['admin', 'diretoria']);

  await initializeMonth(user.userId, year, month);

  revalidateTag(`finance-monthly-${year}-${month}`, 'max');
  revalidatePath('/app/financeiro/mensalidades');
}

function validatePaymentInput(payment: Omit<NewMonthlyPayment, 'updatedBy' | 'updatedAt'>): void {
  validateYearMonth(payment.year, payment.month);
  if (!Number.isInteger(payment.associateId) || payment.associateId <= 0) {
    throw new Error('Associado inválido.');
  }
  if (!payment.status || !validPaymentStatuses.includes(payment.status)) {
    throw new Error('Status de pagamento inválido.');
  }
  if (!payment.paymentMethod || !validPaymentMethods.includes(payment.paymentMethod)) {
    throw new Error('Método de pagamento inválido.');
  }
  if (
    payment.paidAt !== null &&
    payment.paidAt !== undefined &&
    (!(payment.paidAt instanceof Date) || Number.isNaN(payment.paidAt.getTime()))
  ) {
    throw new Error('Data de pagamento inválida.');
  }
}
