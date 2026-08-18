import { getMonthlyPaymentsData } from '@/lib/finance/queries';
import MonthlyPaymentsTable from './MonthlyPaymentsTable';
import { FinanceKPIs, FinancePaymentProfile } from './FinanceKPIs';
import { initializeMonthAction } from './actions';
import MonthNavigator from './MonthNavigator';
import { CirclePlay, FileCheck2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { textMuted, navy, focusRingClass, infoBg, info } from '@/lib/ui/tokens';
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

export default async function MensalidadesPage({ searchParams }: PageProps) {
  await requireRole(['admin', 'diretoria']);

  const {
    year: currentYear,
    month: currentMonth,
    filters: currentFilters,
  } = parseMonthlyPaymentsPageSearchParams(await searchParams);
  const initializeCurrentMonthAction = initializeMonthAction.bind(null, currentYear, currentMonth);
  const currentPeriodLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(currentYear, currentMonth - 1, 1));

  const data = await getMonthlyPaymentsData(currentYear, currentMonth, {
    q: currentFilters.q,
    status: currentFilters.status,
    method: currentFilters.method,
    location: currentFilters.location,
    page: currentFilters.page,
    pageSize: 20,
  });
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  if (currentFilters.page > totalPages) {
    const params = new URLSearchParams(
      buildMonthlyPaymentsSearchParams(currentFilters, { page: totalPages }),
    );
    params.set('year', String(currentYear));
    params.set('month', String(currentMonth));
    redirect(`/app/financeiro/mensalidades?${params.toString()}`);
  }

  const hasActiveFilters = !!(
    currentFilters.q ||
    currentFilters.status ||
    currentFilters.method ||
    currentFilters.location
  );
  const getPageHref = (page: number) => {
    const params = new URLSearchParams(buildMonthlyPaymentsSearchParams(currentFilters, { page }));
    params.set('year', String(currentYear));
    params.set('month', String(currentMonth));
    return `/app/financeiro/mensalidades?${params.toString()}`;
  };
  const hasNoData = !hasActiveFilters && data.aggregates.paymentRecords === 0;

  return (
    <main className="mx-auto w-full max-w-[1400px] min-w-0 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p
            className="text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{ color: textMuted }}
          >
            Financeiro · fechamento mensal
          </p>
          <h1
            className="mt-2 font-serif text-[2.45rem] leading-[0.98] font-bold tracking-[-0.03em] md:text-[3.2rem]"
            style={{ color: navy }}
          >
            Controle de Mensalidades
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6" style={{ color: textMuted }}>
            Confira a situação dos associados e mantenha os registros do mês em dia.
          </p>
        </div>

        <MonthNavigator year={currentYear} month={currentMonth} currentFilters={currentFilters} />
      </div>

      {hasNoData && (
        <div
          className="mb-6 flex flex-col gap-4 rounded-[16px] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          style={{ backgroundColor: infoBg, border: '1px solid #bfdbfe' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: '#dbeafe', color: info }}
            >
              <CirclePlay size={20} aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#1e3a8a' }}>
                Prepare o mês antes de lançar pagamentos
              </h3>
              <p className="mt-1 max-w-2xl text-xs leading-5" style={{ color: '#1d4ed8' }}>
                Mês não inicializado. Gere os registros automáticos para os associados ativos e
                comece o acompanhamento.
              </p>
            </div>
          </div>
          <form action={initializeCurrentMonthAction}>
            <button
              type="submit"
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-[9px] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
              style={{ backgroundColor: navy }}
            >
              <FileCheck2 size={16} aria-hidden="true" />
              Inicializar Mês ({currentPeriodLabel})
            </button>
          </form>
        </div>
      )}

      {/* KPIs */}
      <FinanceKPIs aggregates={data.aggregates} />

      {/* Table */}
      <MonthlyPaymentsTable
        payments={data.rows}
        year={currentYear}
        month={currentMonth}
        currentFilters={currentFilters}
      />

      <nav className="mt-5 flex items-center justify-between" aria-label="Paginação">
        <Link
          aria-disabled={currentFilters.page <= 1}
          className={currentFilters.page <= 1 ? 'pointer-events-none opacity-50' : ''}
          href={getPageHref(Math.max(1, currentFilters.page - 1))}
        >
          Anterior
        </Link>
        <span>
          Página {currentFilters.page} de {totalPages}
        </span>
        <Link
          aria-disabled={currentFilters.page >= totalPages}
          className={currentFilters.page >= totalPages ? 'pointer-events-none opacity-50' : ''}
          href={getPageHref(Math.min(totalPages, currentFilters.page + 1))}
        >
          Próxima
        </Link>
      </nav>

      <FinancePaymentProfile aggregates={data.aggregates} />
    </main>
  );
}
