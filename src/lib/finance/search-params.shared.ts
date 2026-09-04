/**
 * Client-safe finance search helpers — no Zod / Drizzle imports.
 * Server-only parsing lives in `./search-params`.
 */

export type PaymentStatusFilter = 'pago' | 'pendente' | 'atrasado' | 'isento' | 'cancelado';
export type PaymentMethodFilter = 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros';
export type PaymentLocationFilter = 'brasil' | 'exterior';

export const paymentOrigins = ['sigepe', 'itamaraty', 'comprovante', 'outros'] as const;
export type PaymentOrigin = (typeof paymentOrigins)[number];

export function isPaymentOrigin(value: string | undefined): value is PaymentOrigin {
  return value != null && (paymentOrigins as readonly string[]).includes(value);
}

export interface MonthlyPaymentsSearchParams {
  q: string;
  status?: PaymentStatusFilter;
  method?: PaymentMethodFilter;
  origin?: PaymentOrigin;
  location?: PaymentLocationFilter;
  page: number;
}

export function buildMonthlyPaymentsSearchParams(
  current: MonthlyPaymentsSearchParams,
  updates: Partial<MonthlyPaymentsSearchParams>,
): Record<string, string> {
  const next = { ...current, ...updates };
  if (['q', 'status', 'method', 'origin', 'location'].some((key) => Object.hasOwn(updates, key))) {
    next.page = 1;
  }
  const params: Record<string, string> = {};

  if (next.q) params.q = next.q;
  if (next.status) params.status = next.status;
  if (next.method) params.method = next.method;
  if (next.origin) params.origin = next.origin;
  if (next.location) params.location = next.location;
  if (next.page && next.page !== 1) params.page = String(next.page);

  return params;
}
