import { isDomesticCountry } from '@/lib/associates/location-country';
import { paymentStatusUi, type PaymentStatus } from './payment-status-ui';

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
