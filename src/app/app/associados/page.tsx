import { requireAuth } from '@/lib/auth/require-auth';
import { getAssociatesListPage } from '@/lib/associates/service';
import { parseAssociatesSearchParams, MIN_SEARCH_CHARS } from '@/lib/associates/search-params';
import { AssociatesTable } from './components/AssociatesTable';
import { OfficialsSearchBox } from './components/OfficialsSearchBox';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { focusRingClass, textMuted } from '@/lib/ui/tokens';

const PAGE_SIZE = 20;
const MAX_SHOW_ALL = 200;

export default async function AssociadosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    show?: string;
  }>;
}) {
  const [user, rawSearchParams] = await Promise.all([requireAuth(), searchParams]);
  const { q } = parseAssociatesSearchParams(rawSearchParams);
  const canCreateOfficial = user.role === 'admin' || user.role === 'secretaria';
  const hasSearch = q.length >= MIN_SEARCH_CHARS;
  const showAll = rawSearchParams.show === 'all';

  const { rows, total } = hasSearch
    ? await getAssociatesListPage(1, showAll ? MAX_SHOW_ALL : PAGE_SIZE, q, undefined, 'name')
    : { rows: [], total: 0 };
  const currentListUrl = q
    ? `/app/associados?${new URLSearchParams({ q }).toString()}`
    : '/app/associados';
  const showAllHref = `/app/associados?${new URLSearchParams({ q, show: 'all' }).toString()}`;

  return (
    <div>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8 lg:px-10">
        <section className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-4xl leading-none font-bold md:text-5xl">Oficiais</h1>
            <p className="mt-3 text-base" style={{ color: textMuted }}>
              Localize um Oficial de Chancelaria pelo nome.
            </p>
          </div>

          {canCreateOfficial && (
            <Link
              href="/app/associados/novo"
              className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
            >
              <Plus size={16} aria-hidden="true" />
              Novo oficial
            </Link>
          )}
        </section>

        <section className="mb-6">
          <OfficialsSearchBox key={q} initialQuery={q} />
        </section>

        <section aria-live="polite">
          {!q ? (
            <div className="rounded-[8px] border border-[rgba(4,9,32,0.08)] bg-white p-8 text-center">
              <p className="text-sm" style={{ color: textMuted }}>
                Busque pelo nome ou parte do nome de um oficial.
              </p>
            </div>
          ) : !hasSearch ? (
            <div className="rounded-[8px] border border-[rgba(4,9,32,0.08)] bg-white p-8 text-center">
              <p className="text-sm" style={{ color: textMuted }}>
                Digite pelo menos {MIN_SEARCH_CHARS} caracteres para buscar.
              </p>
            </div>
          ) : total === 0 ? (
            <div className="rounded-[8px] border border-[rgba(4,9,32,0.08)] bg-white p-8 text-center">
              <h2 className="text-lg font-semibold">
                Nenhum oficial encontrado para{' '}
                <span className="break-words">&#8220;{q}&#8221;</span>
              </h2>
              <p className="mt-2 text-sm" style={{ color: textMuted }}>
                Tente termos diferentes ou verifique a ortografia.
              </p>
              {canCreateOfficial && (
                <Link
                  href="/app/associados/novo"
                  className={`mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
                >
                  <Plus size={16} aria-hidden="true" />
                  Novo oficial
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm" style={{ color: textMuted }}>
                  {rows.length >= total
                    ? `${total} resultado${total === 1 ? '' : 's'}`
                    : `${rows.length} de ${total} resultado${total === 1 ? '' : 's'}`}
                </p>
                {!showAll && total > PAGE_SIZE && (
                  <Link
                    href={showAllHref}
                    className={`inline-flex items-center py-1 text-sm font-semibold text-[#0d3260] hover:underline ${focusRingClass}`}
                  >
                    Ver todos os {total} resultados
                  </Link>
                )}
              </div>

              <AssociatesTable rows={rows} currentListUrl={currentListUrl} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
