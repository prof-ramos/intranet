import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  alertDangerBg,
  alertDangerNoteBg,
  alertDangerNoteText,
  alertDangerText,
  canvas,
  dangerText,
  fileIconArchive,
  fileIconDefault,
  fileIconSpreadsheet,
  slateText,
  successBg,
  successText,
  warningBg,
  warningText,
} from '@/lib/ui/tokens';

export type PaymentStatus = 'pago' | 'pendente' | 'atrasado' | 'isento' | 'cancelado';
export type PaymentAggregateKey =
  | 'pagos'
  | 'pendentes'
  | 'atrasados'
  | 'isentos'
  | 'cancelados';

interface PaymentStatusUiMetadata {
  label: string;
  aggregateLabel: string;
  aggregateKey: PaymentAggregateKey;
  icon: LucideIcon;
  color: string;
  bg: string;
  dot: string;
}

export const paymentStatusOrder = [
  'pago',
  'pendente',
  'atrasado',
  'isento',
  'cancelado',
] as const satisfies readonly PaymentStatus[];

export const paymentStatusUi = {
  pago: {
    label: 'Pago',
    aggregateLabel: 'Pagos',
    aggregateKey: 'pagos',
    icon: CheckCircle2,
    color: successText,
    bg: successBg,
    dot: fileIconSpreadsheet,
  },
  pendente: {
    label: 'Pendente',
    aggregateLabel: 'Pendentes',
    aggregateKey: 'pendentes',
    icon: Clock,
    color: warningText,
    bg: warningBg,
    dot: fileIconArchive,
  },
  atrasado: {
    label: 'Atrasado',
    aggregateLabel: 'Atrasados',
    aggregateKey: 'atrasados',
    icon: AlertCircle,
    color: alertDangerText,
    bg: alertDangerBg,
    dot: dangerText,
  },
  isento: {
    label: 'Isento',
    aggregateLabel: 'Isentos',
    aggregateKey: 'isentos',
    icon: Ban,
    color: slateText,
    bg: canvas,
    dot: fileIconDefault,
  },
  cancelado: {
    label: 'Cancelado',
    aggregateLabel: 'Cancelados',
    aggregateKey: 'cancelados',
    icon: XCircle,
    color: alertDangerNoteText,
    bg: alertDangerNoteBg,
    dot: alertDangerNoteText,
  },
} as const satisfies Record<PaymentStatus, PaymentStatusUiMetadata>;

export const editablePaymentStatuses = paymentStatusOrder.filter(
  (status): status is Exclude<PaymentStatus, 'cancelado'> => status !== 'cancelado',
);
