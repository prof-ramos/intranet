import { requireAuth } from '@/lib/auth/require-auth';
import { getAssociatesListPage } from '@/lib/associates/service';
import {
  parseAssociatesSearchParams,
  buildAssociatesSearchParams,
} from '@/lib/associates/search-params';
import { calculatePaginationBounds } from '@/lib/pagination';
import { AssociatesHeader } from './components/AssociatesHeader';
import { AssociatesTable } from './components/AssociatesTable';
import { AssociatesPagination } from './components/AssociatesPagination';
import { Download } from 'lucide-react';
import Link from 'next/link';
import { focusRingClass, textMuted } from '@/lib/ui/tokens';

const PAGE_SIZE = 20;

export default async function AssociadosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    searchBy?: string;
    contributionStatus?: string;
    functionalStatus?: string;
    associationStatus?: string;
  }>;
}) {
  const user = await requireAuth();
  const parsedSearchParams = parseAssociatesSearchParams(await searchParams);
  const { q, page, searchBy, contributionStatus, functionalStatus, associationStatus } = parsedSearchParams;

  const { rows, total } = await getAssociatesListPage(
    page,
    PAGE_SIZE,
    q,
    { contributionStatus, functionalStatus, associationStatus },
    searchBy,
  );

  const { totalPages, from, to } = calculatePaginationBounds(page, PAGE_SIZE, total);

  const currentListUrl = `/app/associados?${new URLSearchParams(
    buildAssociatesSearchParams(parsedSearchParams, {}),
  ).toString()}`;

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div>
      <AssociatesHeader user={{ name: user.name, role: user.role }} searchParams={parsedSearchParams} />

      {/* Conteúdo */}
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-7 sm:px-8 lg:px-10">
        <section className="mb-7 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textMuted }}>
              Quadro associativo · {todayLabel}
            </p>
            <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
              Associados
            </h1>
          </div>
        </section>

        {/* Tabela / Cards */}
        <section>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p style={{ color: textMuted }}>
              {total === 0 ? 'Nenhum resultado' : `${from}–${to} de ${total}`}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link
                href={currentListUrl}
                className={`text-sm font-semibold hover:underline ${focusRingClass}`}
              >
                Ver todos ({total})
              </Link>
              <Link
                href="/app/associados/relatorio"
                aria-label="Exportar associados para CSV"
                className={`inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
              >
                <Download size={18} aria-hidden="true" />
              </Link>
              <AssociatesPagination
                page={page}
                totalPages={totalPages}
                searchParams={parsedSearchParams}
              />
            </div>
          </div>

          <AssociatesTable rows={rows} currentListUrl={currentListUrl} />
        </section>
      </main>
    </div>
  );
}
