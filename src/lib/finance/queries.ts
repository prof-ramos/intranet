import { unstable_cache } from 'next/cache';
import * as repository from './repository';

export const getMonthlyPaymentsData = (year: number, month: number) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error('Ano inválido.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mês inválido.');
  }

  return unstable_cache(
    async () => {
      return repository.getAssociatesWithPayments(year, month);
    },
    [`monthly-payments-${year}-${month}`],
    {
      tags: [`finance-monthly-${year}-${month}`],
      revalidate: 3600,
    },
  )();
};
