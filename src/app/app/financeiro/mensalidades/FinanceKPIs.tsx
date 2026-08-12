'use client';

import type { MonthlyPaymentsAggregates } from '@/lib/finance/repository';
import {
  alertDangerBg,
  alertDangerText,
  canvas,
  hairline,
  navy,
  successBg,
  successText,
  textMuted,
  textPrimary,
  textSecondary,
  warningBg,
  warningText,
} from '@/lib/ui/tokens';
import { AlertCircle, Ban, CheckCircle2, Clock3, MapPin, Radio, XCircle } from 'lucide-react';

interface FinanceKPIsProps {
  aggregates: MonthlyPaymentsAggregates;
}

const percentOf = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const statusItems = [
  {
    key: 'pagos',
    label: 'Pagos',
    color: successText,
    bg: successBg,
    dot: '#16a34a',
    icon: CheckCircle2,
  },
  {
    key: 'pendentes',
    label: 'Pendentes',
    color: warningText,
    bg: warningBg,
    dot: '#d97706',
    icon: Clock3,
  },
  {
    key: 'atrasados',
    label: 'Atrasados',
    color: alertDangerText,
    bg: alertDangerBg,
    dot: '#dc2626',
    icon: AlertCircle,
  },
  { key: 'isentos', label: 'Isentos', color: '#475569', bg: '#f1f5f9', dot: '#64748b', icon: Ban },
  {
    key: 'cancelados',
    label: 'Cancelados',
    color: '#7f1d1d',
    bg: '#fef2f2',
    dot: '#991b1b',
    icon: XCircle,
  },
] as const;

export function FinanceKPIs({ aggregates }: FinanceKPIsProps) {
  const { total, pagos, pendentes, atrasados } = aggregates;
  const paidPercent = percentOf(pagos, total);
  const actionCount = pendentes + atrasados;
  const progressMax = Math.max(total, 1);

  return (
    <section
      className="mb-5 overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(4,9,32,0.04)]"
      style={{ border: `1px solid ${hairline}` }}
      aria-label="Fechamento mensal"
    >
      <div className="bg-[#040920] px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-[#9fc8f3] uppercase">
              Fechamento do mês
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-[-0.05em]">{total}</span>
              <span className="text-sm text-white/70">Total Associados</span>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-bold tracking-[0.12em] text-white/60 uppercase">
              Taxa de pagamento
            </p>
            <p className="mt-1 text-2xl font-bold text-[#b9e8ca]">{paidPercent}%</p>
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
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#9fe0b5] transition-[width]"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between gap-4 text-[11px] font-medium text-white/65">
            <span>{pagos} pagos</span>
            <span>{actionCount} aguardando ação</span>
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-2 divide-x divide-y sm:grid-cols-3 xl:grid-cols-5"
        style={{ borderColor: hairline }}
      >
        {statusItems.map((item) => {
          const value = aggregates[item.key];
          return (
            <div
              key={item.key}
              className="min-w-0 px-4 py-3.5"
              style={{ backgroundColor: item.bg }}
            >
              <div className="flex items-center gap-1.5" style={{ color: item.color }}>
                <item.icon size={14} aria-hidden="true" />
                <span className="text-[11px] font-bold">{item.label}</span>
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
  const { total, exterior, folha, boletoPix } = aggregates;
  const channels = [
    { label: 'Folha', value: folha, color: '#2d75b6', icon: CheckCircle2 },
    { label: 'Boleto / PIX', value: boletoPix, color: '#6d4bb8', icon: Radio },
    { label: 'Exterior', value: exterior, color: '#53657b', icon: MapPin },
  ];

  return (
    <section
      className="mt-6 rounded-[12px] bg-white px-5 py-5"
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

      <div className="mt-5 grid gap-4 md:grid-cols-3">
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
    </section>
  );
}
