'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { defineServerAction } from '@/lib/server-actions/define-form-action';
import {
  cancelMonthlyPayment,
  updateMonthlyPayment,
  initializeMonth,
  validateYearMonth,
} from '@/lib/finance/service';
import { type NewMonthlyPayment } from '@/lib/db/schema/finance';

const validPaymentStatuses = ['pago', 'pendente', 'atrasado', 'isento'] as const;
const validPaymentMethods = ['folha', 'boleto', 'pix', 'transferencia', 'outros'] as const;

function validatePaymentInput(payment: Omit<NewMonthlyPayment, 'updatedBy' | 'updatedAt'>): void {
  validateYearMonth(payment.year, payment.month);
  if (!Number.isInteger(payment.associateId) || payment.associateId <= 0) {
    throw new Error('Associado inválido.');
  }
  if (
    !payment.status ||
    !validPaymentStatuses.includes(payment.status as (typeof validPaymentStatuses)[number])
  ) {
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

export const updatePaymentAction = defineServerAction({
  auth: ['admin', 'diretoria'],
  service: async (
    payment: Omit<NewMonthlyPayment, 'updatedBy' | 'updatedAt'> & {
      expectedUpdatedAt?: string | null;
    },
    user,
  ) => {
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
  },
});

const _initializeMonthAction = defineServerAction({
  auth: ['admin', 'diretoria'],
  service: async (input: { year: number; month: number }, user) => {
    await initializeMonth(user.userId, input.year, input.month);
    revalidateTag(`finance-monthly-${input.year}-${input.month}`, 'max');
    revalidatePath('/app/financeiro/mensalidades');
  },
});

export async function initializeMonthAction(year: number, month: number) {
  return _initializeMonthAction({ year, month });
}

export const cancelPaymentAction = defineServerAction({
  auth: ['admin', 'diretoria'],
  service: async (
    input: { paymentId: number; year: number; month: number; reason: string },
    user,
  ) => {
    validateYearMonth(input.year, input.month);

    try {
      await cancelMonthlyPayment(user.userId, input.paymentId, input.reason);
    } catch (error) {
      if (error instanceof Error && error.message === 'PAYMENT_NOT_FOUND') {
        return { success: false, error: 'PAYMENT_NOT_FOUND' } as const;
      }
      if (error instanceof Error && error.message === 'PAYMENT_ALREADY_CANCELLED') {
        return { success: false, error: 'PAYMENT_ALREADY_CANCELLED' } as const;
      }
      throw error;
    }

    revalidateTag(`finance-monthly-${input.year}-${input.month}`, 'max');
    revalidatePath('/app/financeiro/mensalidades');

    return { success: true } as const;
  },
});
