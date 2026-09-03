import { monthlyPaymentsSearchParamsSchema } from '@/lib/validation/schemas';
import { escapeLikePattern } from '@/lib/db/like-pattern';
import { getBusinessDateParts } from '@/lib/utils/date';

export {
  buildMonthlyPaymentsSearchParams,
  isPaymentOrigin,
  paymentOrigins,
  type MonthlyPaymentsSearchParams,
  type PaymentOrigin,
  type PaymentLocationFilter,
  type PaymentMethodFilter,
  type PaymentStatusFilter,
} from './search-params.shared';

import type { MonthlyPaymentsSearchParams } from './search-params.shared';

export interface MonthlyPaymentsPageSearchParams {
  year: number;
  month: number;
  filters: MonthlyPaymentsSearchParams;
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}

export function parseMonthlyPaymentsSearchParams(params: {
  q?: string;
  status?: string;
  method?: string;
  origin?: string;
  location?: string;
  page?: string;
}): MonthlyPaymentsSearchParams {
  const parsed = monthlyPaymentsSearchParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { q: '', page: 1 };
  }
  const result: MonthlyPaymentsSearchParams = {
    q: (parsed.data.q ?? '').trim().slice(0, 80),
    status: parsed.data.status,
    method: parsed.data.method,
    origin: parsed.data.origin,
    location: parsed.data.location,
    page: parsed.data.page,
  };
  return result;
}

export function parseMonthlyPaymentsPageSearchParams(
  params: {
    year?: string;
    month?: string;
    q?: string;
    status?: string;
    method?: string;
    origin?: string;
    location?: string;
    page?: string;
  },
  now = new Date(),
): MonthlyPaymentsPageSearchParams {
  const businessDate = getBusinessDateParts(now);
  return {
    year: parseBoundedInteger(params.year, businessDate.year, 1900, 2100),
    month: parseBoundedInteger(params.month, businessDate.month, 1, 12),
    filters: parseMonthlyPaymentsSearchParams(params),
  };
}

export function buildAssociateNameSearchPattern(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}
