import { unstable_cache } from 'next/cache';
import { getAssociatesWithPayments } from './repository';

type PaymentsData = Awaited<ReturnType<typeof getAssociatesWithPayments>>;
type CachedPaymentsFn = () => Promise<PaymentsData>;

const monthlyPaymentsCache = new Map<string, CachedPaymentsFn>();

export const getMonthlyPaymentsData = (year: number, month: number): Promise<PaymentsData> => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error('Ano inválido.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mês inválido.');
  }

  const cacheKey = `${year}-${month}`;
  let cached = monthlyPaymentsCache.get(cacheKey);
  if (!cached) {
    cached = unstable_cache(
      async () => getAssociatesWithPayments(year, month),
      ['finance-monthly', String(year), String(month)],
      { tags: ['finance-monthly'], revalidate: 3600 },
    ) as CachedPaymentsFn;
    monthlyPaymentsCache.set(cacheKey, cached);
  }
  return cached();
};
