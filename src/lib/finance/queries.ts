import { unstable_cache } from 'next/cache';
import { getAssociatesWithPayments } from './repository';

// Cached wrapper at module scope to avoid creating a new cache on every call
const fetchMonthlyPayments = unstable_cache(
  async (year: number, month: number) => {
    return getAssociatesWithPayments(year, month);
  },
  [],
  {
    tags: ['finance-monthly'],
    revalidate: 3600,
  },
);

export const getMonthlyPaymentsData = (year: number, month: number) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error('Ano inválido.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mês inválido.');
  }

  return fetchMonthlyPayments(year, month);
};
