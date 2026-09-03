import { withCache } from '@/lib/cache/with-cache';
import { getAssociatesWithPayments, type MonthlyPaymentsFilters } from './repository';
import { yearMonthObjectSchema } from '@/lib/validation/schemas';
import { cache } from 'react';

type PaymentsData = Awaited<ReturnType<typeof getAssociatesWithPayments>>;

const TTL_MONTHLY = 30;

function financeCacheKey(year: number, month: number, filters?: MonthlyPaymentsFilters): string[] {
  return [
    'monthly-payments',
    String(year),
    String(month),
    JSON.stringify({
      q: filters?.q ?? '',
      status: filters?.status ?? '',
      method: filters?.method ?? '',
      origin: filters?.origin ?? '',
      location: filters?.location ?? '',
      page: filters?.page ?? '',
      pageSize: filters?.pageSize ?? '',
    }),
  ];
}

const getMonthlyPaymentsDataCached = withCache<
  [number, number, MonthlyPaymentsFilters | undefined],
  PaymentsData
>({
  fn: (year, month, filters) => getAssociatesWithPayments(year, month, filters),
  keyFn: financeCacheKey,
  ttl: TTL_MONTHLY,
  tags: (year, month) => [`finance:${year}:${month}`],
  maxEntries: 50,
});

/**
 * Request-scoped dedupe + persistent Data Cache keyed by year/month/filters.
 * Mutations invalidate `finance:${year}:${month}`.
 */
export const getMonthlyPaymentsData = cache(
  async (year: number, month: number, filters?: MonthlyPaymentsFilters): Promise<PaymentsData> => {
    const parsed = yearMonthObjectSchema.safeParse({ year, month });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0].message);
    }
    return getMonthlyPaymentsDataCached(year, month, filters);
  },
);
