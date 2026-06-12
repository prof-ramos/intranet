'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { defineServerAction } from '@/lib/server-actions/define-form-action';
import {
  cancelMonthlyPayment,
  updateMonthlyPayment,
  initializeMonth,
  validateYearMonth,
} from '@/lib/finance/service';
import { z } from 'zod';

const validPaymentStatuses = ['pago', 'pendente', 'atrasado', 'isento'] as const;
const validPaymentMethods = ['folha', 'boleto', 'pix', 'transferencia', 'outros'] as const;

const yearMonthSchema = {
  year: z
    .number({ message: 'Ano inválido.' })
    .int('Ano inválido.')
    .min(2000, 'Ano inválido.')
    .max(2100, 'Ano inválido.'),
  month: z
    .number({ message: 'Mês inválido.' })
    .int('Mês inválido.')
    .min(1, 'Mês inválido.')
    .max(12, 'Mês inválido.'),
};

const updatePaymentSchema = z.object({
  associateId: z.number().int().positive('Associado inválido.'),
  ...yearMonthSchema,
  status: z.enum(validPaymentStatuses, { message: 'Status de pagamento inválido.' }),
  paymentMethod: z.enum(validPaymentMethods, { message: 'Método de pagamento inválido.' }),
  paidAt: z.date().nullable().default(null),
  expectedUpdatedAt: z.string().datetime().nullable().optional(),
});

const initializeMonthSchema = z.object(yearMonthSchema);

const cancelPaymentSchema = z.object({
  paymentId: z.number().int().positive('Mensalidade inválida.'),
  ...yearMonthSchema,
  reason: z.string().trim().min(3, 'Informe um motivo com ao menos 3 caracteres.'),
});

export const updatePaymentAction = defineServerAction({
  auth: ['admin', 'diretoria'],
  schema: updatePaymentSchema,
  service: async (payment, user) => {
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
  schema: initializeMonthSchema,
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
  schema: cancelPaymentSchema,
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
