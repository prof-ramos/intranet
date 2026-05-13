import { unstable_cache } from 'next/cache';
import { getAssociatesWithPayments, type MonthlyPaymentsFilters } from './repository';

type PaymentsData = Awaited<ReturnType<typeof getAssociatesWithPayments>>;

export const getMonthlyPaymentsData = (
  year: number,
  month: number,
  filters?: MonthlyPaymentsFilters,
): Promise<PaymentsData> => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error('Ano inválido.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mês inválido.');
  }

  const cacheKey = [
    'finance-monthly',
    String(year),
    String(month),
    filters?.q ?? '',
    filters?.status ?? '',
    filters?.method ?? '',
    filters?.location ?? '',
  ];

  return unstable_cache(
    async () => getAssociatesWithPayments(year, month, filters),
    cacheKey,
    { tags: [`finance-monthly-${year}-${month}`], revalidate: 3600 },
  )();
};
