'use client';

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  buildMonthlyPaymentsSearchParams,
  type MonthlyPaymentsSearchParams,
} from '@/lib/finance/search-params';
import {
  borderMuted,
  compactActionClass,
  focusWithinClass,
  focusRingClass,
  hairline,
  mobileTouchTargetClass,
  navy,
  skyBlue,
  textMuted,
} from '@/lib/ui/tokens';
import { cancelPendingMonthlyPaymentsSearch } from './navigation-coordinator';

interface MonthNavigatorProps {
  year: number;
  month: number;
  currentFilters: MonthlyPaymentsSearchParams;
}

const monthValue = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

const formatMonth = (year: number, month: number) => {
  const value = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return value.charAt(0).toUpperCase() + value.slice(1);
};

function monthHref(year: number, month: number, currentFilters: MonthlyPaymentsSearchParams) {
  const params = new URLSearchParams(buildMonthlyPaymentsSearchParams(currentFilters, {}));
  params.set('year', String(year));
  params.set('month', String(month));
  return `/app/financeiro/mensalidades?${params.toString()}`;
}

export default function MonthNavigator({ year, month, currentFilters }: MonthNavigatorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  const handleChange = (value: string) => {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    const [nextYear, nextMonth] = value.split('-').map(Number);
    if (nextYear < 1900 || nextYear > 2100 || nextMonth < 1 || nextMonth > 12) return;
    cancelPendingMonthlyPaymentsSearch();
    startTransition(() => router.push(monthHref(nextYear, nextMonth, currentFilters)));
  };

  return (
    <div className="flex flex-col gap-2 lg:items-end">
      <span
        className="text-[11px] font-bold tracking-[0.12em] uppercase"
        style={{ color: textMuted }}
      >
        Período de análise
      </span>
      <div
        className="inline-flex items-center gap-1 rounded-[10px] bg-white p-1 shadow-[0_1px_2px_rgba(4,9,32,0.04)]"
        style={{ border: `1px solid ${hairline}` }}
      >
        <Link
          href={monthHref(previous.year, previous.month, currentFilters)}
          onClick={cancelPendingMonthlyPaymentsSearch}
          className={`inline-flex items-center justify-center rounded-[8px] transition-colors hover:bg-[#f1f5f9] ${compactActionClass} ${focusRingClass}`}
          style={{ color: textMuted }}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Link>

        <label
          className={`relative inline-flex min-w-[178px] items-center justify-center gap-2 rounded-[8px] px-2 ${mobileTouchTargetClass} ${focusWithinClass}`}
        >
          <Calendar size={16} style={{ color: skyBlue }} aria-hidden="true" />
          <span className="pointer-events-none text-sm font-bold" style={{ color: navy }}>
            {formatMonth(year, month)}
          </span>
          <input
            type="month"
            value={monthValue(year, month)}
            onInput={(event) => handleChange(event.currentTarget.value)}
            aria-label="Selecionar mês"
            className="absolute inset-0 cursor-pointer opacity-0"
            style={{ color: navy, borderColor: borderMuted }}
          />
        </label>

        <Link
          href={monthHref(next.year, next.month, currentFilters)}
          onClick={cancelPendingMonthlyPaymentsSearch}
          className={`inline-flex items-center justify-center rounded-[8px] transition-colors hover:bg-[#f1f5f9] ${compactActionClass} ${focusRingClass}`}
          style={{ color: textMuted }}
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      </div>
      {isPending && (
        <span
          className="text-[11px] font-medium"
          role="status"
          aria-live="polite"
          style={{ color: textMuted }}
        >
          Atualizando período…
        </span>
      )}
    </div>
  );
}
