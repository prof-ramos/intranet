import type { MonthlyPaymentsAggregates } from '@/lib/finance/repository';
import {
  canvas,
  hairline,
  navy,
  surfaceMuted,
  successText,
  textMuted,
  textPrimary,
  textSecondary,
} from '@/lib/ui/tokens';
import { Banknote, CheckCircle2, CreditCard, MapPin, Radio } from 'lucide-react';
import { paymentStatusOrder, paymentStatusUi } from './payment-status-ui';

interface FinanceKPIsProps {
  aggregates: MonthlyPaymentsAggregates;
}

const percentOf = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const statusItems = paymentStatusOrder.map((status) => paymentStatusUi[status]);

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function FinanceKPIs({ aggregates }: FinanceKPIsProps) {
  const { total, pagos, pendentes, atrasados } = aggregates;
  const receivedAmount = Number(aggregates.valorRecebido);
  const paymentRecords = aggregates.paymentRecords;
  const paidPercent = percentOf(pagos, total);
  const actionCount = pendentes + atrasados;
  const progressMax = Math.max(total, 1);

  return (
    <section
      className="mb-5 overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(4,9,32,0.04)]"
      style={{ border: `1px solid ${hairline}` }}
      aria-label="Fechamento mensal"
    >
      <div
        className="px-5 py-5 sm:px-6"
        style={{ backgroundColor: canvas, borderBottom: `1px solid ${hairline}` }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="text-[11px] font-bold tracking-[0.16em] uppercase"
              style={{ color: textMuted }}
            >
              Fechamento do mês
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="text-4xl font-bold tracking-[-0.05em]"
                style={{ color: textPrimary }}
              >
                {total}
              </span>
              <span className="text-sm" style={{ color: textSecondary }}>
                Total Associados
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:text-right">
            <div>
              <p
                className="text-[11px] font-bold tracking-[0.12em] uppercase"
                style={{ color: textMuted }}
              >
                Valor recebido
              </p>
              <p className="mt-1 text-2xl font-bold" style={{ color: textPrimary }}>
                {formatBrl(receivedAmount)}
              </p>
            </div>
            <div>
              <p
                className="text-[11px] font-bold tracking-[0.12em] uppercase"
                style={{ color: textMuted }}
              >
                Taxa de pagamento
              </p>
              <p className="mt-1 text-2xl font-bold" style={{ color: successText }}>
                {paidPercent}%
              </p>
            </div>
          </div>
        </div>

        <div
          className="mt-5"
          role="progressbar"
          aria-label="Taxa de pagamento"
          aria-valuemin={0}
          aria-valuemax={progressMax}
          aria-valuenow={Math.min(pagos, total)}
          aria-valuetext={`${paidPercent}% pagos`}
        >
          <div
            className="h-2 overflow-hidden rounded-full"
            style={{ backgroundColor: surfaceMuted }}
          >
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${paidPercent}%`, backgroundColor: successText }}
            />
          </div>
          <div
            className="mt-2 flex justify-between gap-4 text-[11px] font-medium"
            style={{ color: textMuted }}
          >
            <span>{paymentRecords || pagos} pagamentos registrados</span>
            <span>{actionCount} aguardando ação</span>
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-2 divide-x divide-y sm:grid-cols-3 xl:grid-cols-5"
        style={{ borderColor: hairline }}
      >
        {statusItems.map((item) => {
          const value = aggregates[item.aggregateKey];
          return (
            <div
              key={item.aggregateKey}
              className="min-w-0 px-4 py-3.5"
              style={{ backgroundColor: item.bg }}
            >
              <div className="flex items-center gap-1.5" style={{ color: item.color }}>
                <item.icon size={14} aria-hidden="true" />
                <span className="text-[11px] font-bold">{item.aggregateLabel}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold" style={{ color: textPrimary }}>
                  {value}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: item.color }}>
                  {percentOf(value, total)}%
                </span>
              </div>
              <span
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium"
                style={{ color: textMuted }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: item.dot }}
                  aria-hidden="true"
                />
                do total
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FinancePaymentProfile({ aggregates }: FinanceKPIsProps) {
  const { total, exterior, folha, boleto, pix, transferencia, outros } = aggregates;
  const channels = [
    { label: 'Folha', value: folha, color: '#2d75b6', icon: CheckCircle2 },
    { label: 'Boleto', value: boleto, color: '#6d4bb8', icon: CreditCard },
    { label: 'PIX', value: pix, color: '#7c4d9e', icon: Radio },
    { label: 'Transferência', value: transferencia, color: '#39756f', icon: CreditCard },
    { label: 'Outros', value: outros, color: '#53657b', icon: CreditCard },
  ];
  const origins = [
    { label: 'SIGEPE', value: aggregates.sigepe, color: '#2d75b6' },
    { label: 'Itamaraty', value: aggregates.itamaraty, color: '#39756f' },
    { label: 'Comprovante', value: aggregates.comprovante, color: '#6d4bb8' },
    { label: 'Outros', value: aggregates.originOutros, color: '#53657b' },
  ];

  return (
    <section
      className="mt-6 rounded-[16px] bg-white px-5 py-5"
      style={{ border: `1px solid ${hairline}` }}
      aria-label="Perfil da cobrança"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[11px] font-bold tracking-[0.14em] uppercase"
            style={{ color: textMuted }}
          >
            Perfil da cobrança
          </p>
          <p className="mt-1 text-sm" style={{ color: textSecondary }}>
            Distribuição para orientar a conferência deste período.
          </p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[8px]"
          style={{ backgroundColor: canvas, color: navy }}
        >
          <Radio size={17} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {channels.map((channel) => (
          <div key={channel.label} className="border-t pt-3" style={{ borderColor: hairline }}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span
                className="flex items-center gap-1.5 font-semibold"
                style={{ color: textSecondary }}
              >
                <channel.icon size={13} style={{ color: channel.color }} aria-hidden="true" />
                {channel.label}
              </span>
              <span className="font-bold" style={{ color: textPrimary }}>
                {channel.value}{' '}
                <span className="font-medium" style={{ color: textMuted }}>
                  ({percentOf(channel.value, total)}%)
                </span>
              </span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef1f6]"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${percentOf(channel.value, total)}%`,
                  backgroundColor: channel.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t pt-5" style={{ borderColor: hairline }}>
        <div className="flex items-center gap-2">
          <Banknote size={14} style={{ color: navy }} aria-hidden="true" />
          <p
            className="text-[11px] font-bold tracking-[0.14em] uppercase"
            style={{ color: textMuted }}
          >
            Origem do pagamento
          </p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {origins.map((origin) => (
            <div key={origin.label} className="border-t pt-3" style={{ borderColor: hairline }}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold" style={{ color: textSecondary }}>
                  {origin.label}
                </span>
                <span className="font-bold" style={{ color: textPrimary }}>
                  {origin.value}{' '}
                  <span className="font-medium" style={{ color: textMuted }}>
                    ({percentOf(origin.value, total)}%)
                  </span>
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef1f6]"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percentOf(origin.value, total)}%`,
                    backgroundColor: origin.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-5 flex items-center gap-2 border-t pt-4 text-xs"
        style={{ borderColor: hairline }}
      >
        <MapPin size={13} style={{ color: textMuted }} aria-hidden="true" />
        <span style={{ color: textSecondary }}>Associados no exterior</span>
        <strong style={{ color: textPrimary }}>{exterior}</strong>
        <span style={{ color: textMuted }}>({percentOf(exterior, total)}%)</span>
      </div>
    </section>
  );
}
