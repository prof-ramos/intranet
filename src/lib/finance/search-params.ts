import { monthlyPaymentsSearchParamsSchema } from '@/lib/validation/schemas';
import { paymentStatus } from '@/lib/db/schema/finance';
import { escapeLikePattern } from '@/lib/db/like-pattern';

export interface MonthlyPaymentsSearchParams {
  q: string;
  status?: (typeof paymentStatus.enumValues)[number];
  method?: 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros';
  location?: 'brasil' | 'exterior';
  page: number;
}

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
  location?: string;
  page?: string;
}): MonthlyPaymentsSearchParams {
  const parsed = monthlyPaymentsSearchParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { q: '', page: 1 };
  }
  return {
    q: (parsed.data.q ?? '').trim().slice(0, 80),
    status: parsed.data.status,
    method: parsed.data.method,
    location: parsed.data.location,
    page: parsed.data.page,
  };
}

export function parseMonthlyPaymentsPageSearchParams(
  params: {
    year?: string;
    month?: string;
    q?: string;
    status?: string;
    method?: string;
    location?: string;
    page?: string;
  },
  now = new Date(),
): MonthlyPaymentsPageSearchParams {
  return {
    year: parseBoundedInteger(params.year, now.getFullYear(), 1900, 2100),
    month: parseBoundedInteger(params.month, now.getMonth() + 1, 1, 12),
    filters: parseMonthlyPaymentsSearchParams(params),
  };
}

export function buildMonthlyPaymentsSearchParams(
  current: MonthlyPaymentsSearchParams,
  updates: Partial<MonthlyPaymentsSearchParams>,
): Record<string, string> {
  const next = { ...current, ...updates };
  const params: Record<string, string> = {};

  if (next.q) params.q = next.q;
  if (next.status) params.status = next.status;
  if (next.method) params.method = next.method;
  if (next.location) params.location = next.location;
  if (next.page && next.page !== 1) params.page = String(next.page);

  return params;
}

export function buildAssociateNameSearchPattern(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}
