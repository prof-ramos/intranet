'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { defineServerAction } from '@/lib/server-actions/define-form-action';
import { cancelMonthlyPayment, updateMonthlyPayment, initializeMonth } from '@/lib/finance/service';
import { z } from 'zod';
import { yearSchema, monthSchema, yearMonthObjectSchema } from '@/lib/validation/schemas';

const validPaymentStatuses = ['pago', 'pendente', 'atrasado', 'isento'] as const;
const validPaymentMethods = ['folha', 'boleto', 'pix', 'transferencia', 'outros'] as const;
const validPaymentOrigins = ['sigepe', 'itamaraty', 'comprovante', 'outros'] as const;

const optionalAmountSchema = z.union([z.string(), z.number().finite()]).nullable().optional();
const optionalPaidAtSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de pagamento inválida.')
  .nullable()
  .optional();

const updatePaymentSchema = z.object({
  associateId: z.number().int().positive('Associado inválido.'),
  year: yearSchema,
  month: monthSchema,
  status: z.enum(validPaymentStatuses, { message: 'Status de pagamento inválido.' }),
  paymentMethod: z.enum(validPaymentMethods, { message: 'Método de pagamento inválido.' }),
  amount: optionalAmountSchema,
  origin: z.enum(validPaymentOrigins, { message: 'Origem do pagamento inválida.' }).optional(),
  // `paymentOrigin` is accepted as a compatibility alias used by the current
  // editor component; `origin` is the canonical domain field.
  paymentOrigin: z
    .enum(validPaymentOrigins, { message: 'Origem do pagamento inválida.' })
    .optional(),
  notes: z
    .string()
    .max(2000, 'Observações devem ter no máximo 2.000 caracteres.')
    .nullable()
    .optional(),
  paidAt: optionalPaidAtSchema,
  expectedUpdatedAt: z.string().datetime().nullable().optional(),
});

const initializeMonthSchema = yearMonthObjectSchema;

const cancelPaymentSchema = z.object({
  paymentId: z.number().int().positive('Mensalidade inválida.'),
  year: yearSchema,
  month: monthSchema,
  reason: z.string().trim().min(3, 'Informe um motivo com ao menos 3 caracteres.'),
  expectedUpdatedAt: z.string().datetime().nullable().optional(),
});

export const updatePaymentAction = defineServerAction({
  auth: ['admin', 'diretoria'],
  schema: updatePaymentSchema,
  service: async (payment, user) => {
    const { expectedUpdatedAt, paymentOrigin, ...paymentWithoutVersion } = payment;
    const paymentData = {
      ...paymentWithoutVersion,
      ...(paymentWithoutVersion.origin === undefined && paymentOrigin !== undefined
        ? { origin: paymentOrigin }
        : {}),
    };

    try {
      await updateMonthlyPayment(user.userId, paymentData, expectedUpdatedAt);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'CONCURRENCY_CONFLICT' ||
          (error as Error & { code?: string }).code === 'CONCURRENCY_CONFLICT')
      ) {
        return { success: false, error: 'CONCURRENCY_CONFLICT' } as const;
      }
      throw error;
    }

    revalidateTag(`finance:${payment.year}:${payment.month}`, 'max');
    revalidatePath('/app/financeiro/mensalidades');

    return { success: true } as const;
  },
});

const _initializeMonthAction = defineServerAction({
  auth: ['admin', 'diretoria'],
  schema: initializeMonthSchema,
  service: async (input: { year: number; month: number }, user) => {
    const counts = await initializeMonth(user.userId, input.year, input.month);
    revalidateTag(`finance:${input.year}:${input.month}`, 'max');
    revalidatePath('/app/financeiro/mensalidades');
    return { success: true as const, ...counts };
  },
});

export async function initializeMonthAction(year: number, month: number) {
  return _initializeMonthAction({ year, month });
}

export const cancelPaymentAction = defineServerAction({
  auth: ['admin', 'diretoria'],
  schema: cancelPaymentSchema,
  service: async (
    input: {
      paymentId: number;
      year: number;
      month: number;
      reason: string;
      expectedUpdatedAt?: string | null;
    },
    user,
  ) => {
    try {
      if (input.expectedUpdatedAt === undefined) {
        await cancelMonthlyPayment(user.userId, input.paymentId, input.reason);
      } else {
        await cancelMonthlyPayment(
          user.userId,
          input.paymentId,
          input.reason,
          input.expectedUpdatedAt,
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'PAYMENT_NOT_FOUND' ||
          (error as Error & { code?: string }).code === 'NOT_FOUND')
      ) {
        return { success: false, error: 'PAYMENT_NOT_FOUND' } as const;
      }
      if (error instanceof Error && error.message === 'PAYMENT_ALREADY_CANCELLED') {
        return { success: false, error: 'PAYMENT_ALREADY_CANCELLED' } as const;
      }
      if (
        error instanceof Error &&
        (error as Error & { code?: string }).code === 'CONCURRENCY_CONFLICT'
      ) {
        return { success: false, error: 'CONCURRENCY_CONFLICT' } as const;
      }
      throw error;
    }

    revalidateTag(`finance:${input.year}:${input.month}`, 'max');
    revalidatePath('/app/financeiro/mensalidades');

    return { success: true } as const;
  },
});
