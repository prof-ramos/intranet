import { monthlyPaymentsSearchParamsSchema } from '@/lib/validation/schemas';
import { paymentStatus } from '@/lib/db/schema/finance';
import { escapeLikePattern } from '@/lib/db/like-pattern';

export interface MonthlyPaymentsSearchParams {
  q: string;
  status?: typeof paymentStatus.enumValues[number];
  method?: 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros';
  location?: 'brasil' | 'exterior';
  page: number;
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