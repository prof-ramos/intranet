import { cache } from 'react';
import { getAssociatesWithPayments, type MonthlyPaymentsFilters } from './repository';

type PaymentsData = Awaited<ReturnType<typeof getAssociatesWithPayments>>;

export const getMonthlyPaymentsData = cache(
  async (year: number, month: number, filters?: MonthlyPaymentsFilters): Promise<PaymentsData> => {
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new Error('Ano inválido.');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Mês inválido.');
    }
    return getAssociatesWithPayments(year, month, filters);
  },
);
