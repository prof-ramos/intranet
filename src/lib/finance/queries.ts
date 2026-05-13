import { unstable_cache } from 'next/cache';
import { getAssociatesWithPayments } from './repository';

const MAX_CACHE_ENTRIES = 12;

function setWithLimit<K, V>(map: Map<K, V>, key: K, value: V) {
  if (map.size >= MAX_CACHE_ENTRIES && !map.has(key)) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) {
      map.delete(firstKey);
    }
  }
  map.set(key, value);
}

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
  const existing = monthlyPaymentsCache.get(cacheKey);
  if (existing) return existing();

  const created = unstable_cache(
    async () => getAssociatesWithPayments(year, month),
    ['finance-monthly', String(year), String(month)],
    { tags: ['finance-monthly'], revalidate: 3600 },
  ) as CachedPaymentsFn;

  setWithLimit(monthlyPaymentsCache, cacheKey, created);
  return created();
};
