import { unstable_cache } from 'next/cache';
import { getAssociatesWithPayments } from './repository';

const fetchMonthlyPayments = unstable_cache(
  async (year: number, month: number) => getAssociatesWithPayments(year, month),
  ['finance-monthly'],
  { tags: ['finance-monthly'], revalidate: 3600 },
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
