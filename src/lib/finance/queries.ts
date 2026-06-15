import { cache } from 'react';
import { getAssociatesWithPayments, type MonthlyPaymentsFilters } from './repository';
import { yearMonthObjectSchema } from '@/lib/validation/schemas';

type PaymentsData = Awaited<ReturnType<typeof getAssociatesWithPayments>>;

export const getMonthlyPaymentsData = cache(
  async (year: number, month: number, filters?: MonthlyPaymentsFilters): Promise<PaymentsData> => {
    const parsed = yearMonthObjectSchema.safeParse({ year, month });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0].message);
    }
    return getAssociatesWithPayments(year, month, filters);
  },
);
