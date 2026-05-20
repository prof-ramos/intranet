import { getMonthlyPaymentsData } from '@/lib/finance/queries';
import { autoMarkOverduePaymentsService } from '@/lib/finance/service';
import MonthlyPaymentsTable from './MonthlyPaymentsTable';
import { FinanceKPIs } from './FinanceKPIs';
import { initializeMonthAction } from './actions';
import { Calendar, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import Link from 'next/link';
import { textMuted, navy, hairline, focusRingClass, skyBlue, infoBg, info } from '@/lib/ui/tokens';
import { requireRole } from '@/lib/auth/authorization';
import {
  parseMonthlyPaymentsPageSearchParams,
  buildMonthlyPaymentsSearchParams,
} from '@/lib/finance/search-params';

interface PageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    q?: string;
    status?: string;
    method?: string;
    location?: string;
    page?: string;
  }>;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default async function MensalidadesPage({ searchParams }: PageProps) {
  await requireRole(['admin', 'diretoria']);

  const { year: currentYear, month: currentMonth, filters: currentFilters } =
    parseMonthlyPaymentsPageSearchParams(await searchParams);
  const initializeCurrentMonthAction = initializeMonthAction.bind(null, currentYear, currentMonth);

  await autoMarkOverduePaymentsService();

  const data = await getMonthlyPaymentsData(currentYear, currentMonth, {
    q: currentFilters.q,
    status: currentFilters.status,
    method: currentFilters.method,
    location: currentFilters.location,
  });

  // Helper for prev/next month
  const getPrevMonth = () => {
    let m = currentMonth - 1;
    let y = currentYear;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    const params = new URLSearchParams(buildMonthlyPaymentsSearchParams(currentFilters, {}));
    params.set('year', y.toString());
    params.set('month', m.toString());
    return `/app/financeiro/mensalidades?${params.toString()}`;
  };

  const getNextMonth = () => {
    let m = currentMonth + 1;
    let y = currentYear;
    if (m === 13) {
      m = 1;
      y += 1;
    }
    const params = new URLSearchParams(buildMonthlyPaymentsSearchParams(currentFilters, {}));
    params.set('year', y.toString());
    params.set('month', m.toString());
    return `/app/financeiro/mensalidades?${params.toString()}`;
  };

  const hasActiveFilters = !!(currentFilters.q || currentFilters.status || currentFilters.method || currentFilters.location);
  const hasNoData = !hasActiveFilters && data.every(p => !p.paymentId);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 py-7 sm:px-8 lg:px-10">
      {/* Header */}
      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textMuted }}>
            Financeiro · {monthNames[currentMonth - 1]} de {currentYear}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]" style={{ color: navy }}>
            Controle de Mensalidades
          </h1>
        </div>

        <div
          className="inline-flex items-center gap-1 rounded-[10px] bg-white p-1.5"
          style={{ border: `1px solid ${hairline}` }}
        >
          <Link
            href={getPrevMonth()}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
            style={{ color: textMuted }}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </Link>

          <div className="flex items-center gap-2 px-4 text-sm font-semibold" style={{ color: textMuted, minWidth: 180, justifyContent: 'center' }}>
            <Calendar size={16} style={{ color: skyBlue }} aria-hidden="true" />
            <span>{monthNames[currentMonth - 1]} de {currentYear}</span>
          </div>

          <Link
            href={getNextMonth()}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
            style={{ color: textMuted }}
            aria-label="Próximo mês"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {hasNoData && (
        <div
          className="mb-6 flex items-center justify-between rounded-[10px] p-5"
          style={{ backgroundColor: infoBg, border: '1px solid #bfdbfe' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: '#dbeafe', color: info }}
            >
              <Play size={20} aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: '#1e3a8a' }}>
                Mês não inicializado
              </h3>
              <p className="text-xs mt-0.5" style={{ color: '#1d4ed8' }}>
                Este mês ainda não possui registros de pagamento. Inicialize para gerar os registros automáticos.
              </p>
            </div>
          </div>
          <form action={initializeCurrentMonthAction}>
            <button
              type="submit"
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-[8px] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
              style={{ backgroundColor: navy }}
            >
              Inicializar Mês
            </button>
          </form>
        </div>
      )}

      {/* KPIs */}
      <FinanceKPIs payments={data} />

      {/* Table */}
      <MonthlyPaymentsTable
        payments={data}
        year={currentYear}
        month={currentMonth}
        currentFilters={currentFilters}
      />
    </main>
  );
}
