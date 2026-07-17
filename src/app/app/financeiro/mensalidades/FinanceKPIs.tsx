'use client';

import type { MonthlyPaymentsAggregates } from '@/lib/finance/repository';
import {
  textMuted,
  textPrimary,
  navy,
  success,
  warning,
  error,
  hairline,
  canvas,
} from '@/lib/ui/tokens';
import { DollarSign, CheckCircle, Clock, AlertCircle, Ban, XCircle } from 'lucide-react';

interface FinanceKPIsProps {
  aggregates: MonthlyPaymentsAggregates;
}

export function FinanceKPIs({ aggregates }: FinanceKPIsProps) {
  const { total, pagos, pendentes, atrasados, isentos, cancelados, exterior, folha, boletoPix } =
    aggregates;

  const kpiItems = [
    {
      label: 'Total Associados',
      value: total,
      icon: DollarSign,
      color: navy,
      bg: canvas,
    },
    {
      label: 'Pagos',
      value: pagos,
      icon: CheckCircle,
      color: success,
      bg: '#dcfce7',
    },
    {
      label: 'Pendentes',
      value: pendentes,
      icon: Clock,
      color: warning,
      bg: '#f4ddb1',
    },
    {
      label: 'Atrasados',
      value: atrasados,
      icon: AlertCircle,
      color: error,
      bg: '#fee2e2',
    },
    {
      label: 'Isentos',
      value: isentos,
      icon: Ban,
      color: '#59677a',
      bg: '#f8fafc',
    },
    {
      label: 'Cancelados',
      value: cancelados,
      icon: XCircle,
      color: '#7f1d1d',
      bg: '#fef2f2',
    },
  ];

  return (
    <section
      className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6"
      aria-label="Indicadores financeiros"
    >
      {kpiItems.map((item) => (
        <div
          key={item.label}
          className="min-h-[104px] rounded-[10px] bg-white px-4 py-3"
          style={{ border: `1px solid ${hairline}` }}
        >
          <div className="flex items-center justify-between">
            <div
              className="text-[10px] font-bold tracking-[0.08em] uppercase"
              style={{ color: textMuted }}
            >
              {item.label}
            </div>
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: item.bg }}
            >
              <item.icon size={14} style={{ color: item.color }} aria-hidden="true" />
            </div>
          </div>
          <div
            className="mt-2 font-sans text-2xl leading-none font-bold"
            style={{ color: textPrimary }}
          >
            {item.value}
          </div>
          {item.label === 'Pagos' && total > 0 && (
            <div className="mt-1.5 text-[11px] font-medium" style={{ color: textMuted }}>
              {Math.round((pagos / total) * 100)}% do total
            </div>
          )}
          {item.label === 'Pendentes' && total > 0 && (
            <div className="mt-1.5 text-[11px] font-medium" style={{ color: textMuted }}>
              {Math.round((pendentes / total) * 100)}% do total
            </div>
          )}
          {item.label === 'Total Associados' && (
            <div className="mt-1.5 text-[11px] font-medium" style={{ color: textMuted }}>
              {folha} folha · {boletoPix} boleto/pix · {exterior} exterior
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
