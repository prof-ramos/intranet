import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import {
  getTriagesPaginated,
  countTriagesAguardandoValidacao,
  countTriagesVencidas,
  countTriagesAltoRisco,
} from '@/lib/email-triage/repository';
import { parseEmailTriageSearchParams } from '@/lib/email-triage/search-params';
import { formatDate, daysSince } from '@/lib/utils/date';
import {
  getStatusLabel,
  getStatusBadgeClass,
  getCategoriaLabel,
  getCategoriaBadgeClass,
  getRiscoLabel,
  getRiscoBadgeClass,
  EMAIL_TRIAGE_STATUS_FILTER_OPTIONS,
  EMAIL_TRIAGE_CATEGORIA_FILTER_OPTIONS,
  EMAIL_TRIAGE_RISCO_FILTER_OPTIONS,
} from '@/lib/email-triage/status';
import type {
  EmailTriageStatus,
  EmailTriageCategoria,
  EmailTriageRisco,
} from '@/lib/email-triage/status';
import { ArrowLeft, Search } from 'lucide-react';
import { KpiCard, KpiCardGrid } from '@/components/ui/KpiCard';
import { hairline, focusRingClass } from '@/lib/ui/tokens';
import { calculatePaginationBounds } from '@/lib/pagination';
import { StatusFilter } from '@/app/app/juridico/consultas/StatusFilter';

const PAGE_SIZE = 20;

export default async function EmailTriagePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    categoria?: string;
    nivelRisco?: string;
    page?: string;
  }>;
}) {
  await requireAuth();
  const filters = parseEmailTriageSearchParams(await searchParams);

  const [{ rows, total }, aguardando, vencidas, altoRisco] = await Promise.all([
    getTriagesPaginated(filters.page, PAGE_SIZE, {
      status: (filters.status || undefined) as EmailTriageStatus | undefined,
      categoria: (filters.categoria || undefined) as EmailTriageCategoria | undefined,
      nivelRisco: (filters.nivelRisco || undefined) as EmailTriageRisco | undefined,
      search: filters.q || undefined,
    }),
    countTriagesAguardandoValidacao(),
    countTriagesVencidas(),
    countTriagesAltoRisco(),
  ]);

  const { totalPages } = calculatePaginationBounds(filters.page, PAGE_SIZE, total);
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);

  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.status) params.set('status', filters.status);
    if (filters.categoria) params.set('categoria', filters.categoria);
    if (filters.nivelRisco) params.set('nivelRisco', filters.nivelRisco);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return `/app/email-triage?${params.toString()}`;
  };

  return (
    <main className="mx-auto w-full max-w-[1380px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[11px] tracking-[0.18em] text-[rgba(13,31,60,0.55)] uppercase">
              Triagem
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold">E-mails Triados</h1>
          </div>
        </div>
      </div>

      <KpiCardGrid label="Indicadores de triagem">
        <KpiCard label="Total" value={total} tone="neutral" />
        <KpiCard label="Aguardando revisão" value={aguardando} tone="warn" />
        <KpiCard label="Vencidos" value={vencidas} tone="neg" />
        <KpiCard label="Alto/Crítico risco" value={altoRisco} tone="neg" />
      </KpiCardGrid>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form className="relative flex-1" method="get">
          <Search
            size={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-[rgba(13,31,60,0.40)]"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ''}
            placeholder="Buscar por assunto ou remetente..."
            className={`h-10 w-full max-w-md rounded-[8px] border border-[#e2e8f0] bg-white pr-3 pl-9 text-sm text-[#0d1f3c] placeholder:text-[rgba(13,31,60,0.40)] ${focusRingClass}`}
          />
          {filters.status && <input type="hidden" name="status" value={filters.status} />}
          {filters.categoria && <input type="hidden" name="categoria" value={filters.categoria} />}
          {filters.nivelRisco && (
            <input type="hidden" name="nivelRisco" value={filters.nivelRisco} />
          )}
        </form>

        <form className="flex gap-2" method="get">
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          {filters.categoria && <input type="hidden" name="categoria" value={filters.categoria} />}
          {filters.nivelRisco && (
            <input type="hidden" name="nivelRisco" value={filters.nivelRisco} />
          )}
          <StatusFilter defaultValue={filters.status ?? ''}>
            {EMAIL_TRIAGE_STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </StatusFilter>
        </form>

        <form className="flex gap-2" method="get">
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          {filters.status && <input type="hidden" name="status" value={filters.status} />}
          {filters.nivelRisco && (
            <input type="hidden" name="nivelRisco" value={filters.nivelRisco} />
          )}
          <StatusFilter defaultValue={filters.categoria ?? ''} name="categoria">
            {EMAIL_TRIAGE_CATEGORIA_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </StatusFilter>
        </form>

        <form className="flex gap-2" method="get">
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          {filters.status && <input type="hidden" name="status" value={filters.status} />}
          {filters.categoria && <input type="hidden" name="categoria" value={filters.categoria} />}
          <StatusFilter defaultValue={filters.nivelRisco ?? ''} name="nivelRisco">
            {EMAIL_TRIAGE_RISCO_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </StatusFilter>
        </form>
      </div>

      <div
        className="overflow-hidden rounded-[16px] bg-white"
        style={{ border: `1px solid ${hairline}` }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(4,9,32,0.05)] text-[11px] font-bold tracking-[0.08em] text-[rgba(13,31,60,0.55)] uppercase">
                <th className="px-4 py-3">Assunto</th>
                <th className="px-4 py-3">Remetente</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Risco</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Atraso</th>
                <th className="px-4 py-3">Recebido</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-[rgba(13,31,60,0.60)]"
                  >
                    Nenhum e-mail triado encontrado.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const overdueDays =
                    row.status === 'vencido' && row.prazoData ? daysSince(row.prazoData) : null;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[rgba(4,9,32,0.05)] transition-colors hover:bg-[rgba(4,9,32,0.02)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/email-triage/${row.id}`}
                          className={`max-w-xs truncate text-sm font-semibold text-[#040920] hover:underline ${focusRingClass}`}
                        >
                          {row.subject}
                        </Link>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-sm">{row.sender}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoriaBadgeClass(row.categoria)}`}
                        >
                          {getCategoriaLabel(row.categoria)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRiscoBadgeClass(row.nivelRisco)}`}
                        >
                          {getRiscoLabel(row.nivelRisco)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(row.status)}`}
                        >
                          {getStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.prazoData ? formatDate(row.prazoData) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {overdueDays !== null && overdueDays > 0 ? (
                          <span className="font-semibold text-[#b91c1c]">
                            {overdueDays} dia{overdueDays > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[rgba(13,31,60,0.40)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[rgba(13,31,60,0.60)]">
                        {formatDate(row.receivedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[rgba(4,9,32,0.05)] px-4 py-3">
            <p className="text-sm text-[rgba(13,31,60,0.60)]">
              Página {currentPage} de {totalPages} · {total} resultados
            </p>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={buildHref({ page: String(currentPage - 1) })}
                  className={`inline-flex h-10 items-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 text-sm font-semibold text-[#040920] hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
                >
                  Anterior
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={buildHref({ page: String(currentPage + 1) })}
                  className={`inline-flex h-10 items-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 text-sm font-semibold text-[#040920] hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
                >
                  Próxima
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
