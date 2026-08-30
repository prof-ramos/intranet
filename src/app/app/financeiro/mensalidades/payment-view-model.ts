import { isDomesticCountry } from '@/lib/associates/location-country';
import { paymentStatusUi, type PaymentStatus } from './payment-status-ui';
import type { PaymentOrigin } from '@/lib/finance/search-params';
import type { EditablePaymentStatus, PaymentEditorInitialValues } from './PaymentEditorDialog';

export interface Payment {
  associateId: number;
  fullName: string;
  defaultPaymentMethod: 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros';
  paymentId: number | null;
  paymentStatus: 'pago' | 'pendente' | 'atrasado' | 'isento' | 'cancelado' | null;
  monthPaymentMethod: 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros' | null;
  locationCountry: string | null;
  locationCity: string | null;
  functionalStatus: 'ativo' | 'aposentado' | 'cedido' | 'em_licenca' | null;
  updatedAt: Date | null;
  /** Structured payment fields are optional while old rows/contracts are being migrated. */
  amount?: number | string | null;
  paymentAmount?: number | string | null;
  paidAt?: Date | string | null;
  paymentOrigin?: PaymentOrigin | null;
  origin?: PaymentOrigin | null;
  notes?: string | null;
}

export const methodConfig: Record<string, { label: string; short: string; group: string }> = {
  folha: { label: 'Desconto em Folha', short: 'Folha', group: 'SIGEPE' },
  boleto: { label: 'Boleto', short: 'Boleto', group: 'Direto' },
  pix: { label: 'PIX', short: 'PIX', group: 'Direto' },
  transferencia: { label: 'Transferência', short: 'Transf.', group: 'Direto' },
  outros: { label: 'Outros', short: 'Outros', group: 'Direto' },
};

export const locationGroup = (country: string | null): 'brasil' | 'exterior' => {
  return isDomesticCountry(country) ? 'brasil' : 'exterior';
};

export type PaymentMethod = Payment['defaultPaymentMethod'];

export interface PaymentViewModel extends Payment {
  currentStatus: PaymentStatus;
  currentMethod: PaymentMethod;
  statusCfg: (typeof paymentStatusUi)[PaymentStatus];
  methodCfg: (typeof methodConfig)[string];
  locGroup: 'brasil' | 'exterior';
}

export function getEffectivePaymentMethod(
  monthPaymentMethod: Payment['monthPaymentMethod'],
  defaultPaymentMethod: Payment['defaultPaymentMethod'],
): PaymentMethod {
  return monthPaymentMethod ?? defaultPaymentMethod;
}

export function getEffectivePaymentStatus(paymentStatus: Payment['paymentStatus']): PaymentStatus {
  return paymentStatus ?? 'pendente';
}

export function getPaymentViewModel(payment: Payment): PaymentViewModel {
  const currentStatus = getEffectivePaymentStatus(payment.paymentStatus);
  const currentMethod = getEffectivePaymentMethod(
    payment.monthPaymentMethod,
    payment.defaultPaymentMethod,
  );
  return {
    ...payment,
    currentStatus,
    currentMethod,
    statusCfg: paymentStatusUi[currentStatus],
    methodCfg: methodConfig[currentMethod] ?? methodConfig.outros,
    locGroup: locationGroup(payment.locationCountry),
  };
}

export const originConfig: Record<PaymentOrigin, { label: string; short: string }> = {
  sigepe: { label: 'SIGEPE', short: 'SIGEPE' },
  itamaraty: { label: 'Itamaraty', short: 'Itamaraty' },
  comprovante: { label: 'Comprovante', short: 'Comprov.' },
  outros: { label: 'Outros', short: 'Outros' },
};

export function getStructuredAmount(payment: Payment): number | null {
  const value = payment.amount ?? payment.paymentAmount;
  if (value == null || value === '') return null;
  const normalized =
    typeof value === 'number'
      ? String(value)
      : value.includes(',')
        ? value.replace(/\./g, '').replace(',', '.')
        : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getCivilPaidAt(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year && values.month && values.day
    ? `${values.year}-${values.month}-${values.day}`
    : null;
}

export function formatCurrency(value: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatCivilDate(value: Date | string | null | undefined): string {
  const civil = getCivilPaidAt(value);
  if (!civil) return '—';
  const [year, month, day] = civil.split('-');
  return `${day}/${month}/${year}`;
}

export function getPaymentOrigin(payment: Payment): PaymentOrigin {
  if (payment.paymentOrigin && payment.paymentOrigin in originConfig) return payment.paymentOrigin;
  if (payment.origin && payment.origin in originConfig) return payment.origin;
  if (
    getEffectivePaymentMethod(payment.monthPaymentMethod, payment.defaultPaymentMethod) === 'folha'
  ) {
    return locationGroup(payment.locationCountry) === 'brasil' ? 'sigepe' : 'itamaraty';
  }
  return 'comprovante';
}

export function getEditorInitialValues(payment: Payment): PaymentEditorInitialValues {
  return {
    status: getEffectivePaymentStatus(payment.paymentStatus) as EditablePaymentStatus,
    paymentMethod: getEffectivePaymentMethod(
      payment.monthPaymentMethod,
      payment.defaultPaymentMethod,
    ),
    amount: getStructuredAmount(payment),
    paidAt: getCivilPaidAt(payment.paidAt),
    paymentOrigin: getPaymentOrigin(payment),
    notes: payment.notes ?? null,
    expectedUpdatedAt: payment.updatedAt?.toISOString() ?? null,
  };
}
