import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { getConsultationsPaginated } from '@/lib/juridico/queries';
import { parseJuridicoConsultationsSearchParams } from '@/lib/juridico/search-params';
import { formatDate, daysSince } from '@/lib/utils/date';
import {
  getLegalConsultationStatusBadgeClass,
  getLegalConsultationStatusLabel,
  LEGAL_CONSULTATION_STATUS_FILTER_OPTIONS,
} from '@/lib/juridico/status';
import { AlertTriangle, ArrowLeft, Clock, FileQuestion, Plus, Search } from 'lucide-react';
import { hairline, focusRingClass } from '@/lib/ui/tokens';
import { calculatePaginationBounds } from '@/lib/pagination';
import { StatusFilter } from './StatusFilter';

const PAGE_SIZE = 20;

export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const [_, rawSearchParams] = await Promise.all([requireAuth(), searchParams]);
  const currentFilters = parseJuridicoConsultationsSearchParams(rawSearchParams);
  const { q, status, page } = currentFilters;

  const { rows, total } = await getConsultationsPaginated(page, PAGE_SIZE, {
    status: status || undefined,
    search: q || undefined,
  });

  const { totalPages } = calculatePaginationBounds(page, PAGE_SIZE, total);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/juridico"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[11px] tracking-[0.18em] text-[rgba(13,31,60,0.55)] uppercase">
              Jurídico
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold">Consultas</h1>
          </div>
        </div>
        <Link
          href="/app/juridico/consultas/nova"
          className={`inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white hover:bg-[#0d3260] ${focusRingClass}`}
        >
          <Plus size={16} aria-hidden="true" /> Nova consulta
        </Link>
      </div>

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
            defaultValue={q ?? ''}
            placeholder="Buscar por título ou número..."
            className={`h-10 w-full max-w-md rounded-[8px] border border-[#e2e8f0] bg-white pr-3 pl-9 text-sm text-[#0d1f3c] placeholder:text-[rgba(13,31,60,0.40)] ${focusRingClass}`}
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>

        <form className="flex gap-2" method="get">
          {q && <input type="hidden" name="q" value={q} />}
          <StatusFilter defaultValue={status ?? ''}>
            {LEGAL_CONSULTATION_STATUS_FILTER_OPTIONS.map((o) => (
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
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Associado</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3">Atualização</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14">
                    <div className="mx-auto flex max-w-xs flex-col items-center text-center">
                      <FileQuestion
                        size={28}
                        className="mb-3 text-[rgba(13,31,60,0.30)]"
                        aria-hidden="true"
                      />
                      {q || status ? (
                        <>
                          <p className="text-sm font-semibold text-[#0d1f3c]">
                            Nenhuma consulta encontrada
                          </p>
                          <p className="mt-1 text-sm text-[rgba(13,31,60,0.60)]">
                            Ajuste a busca ou o filtro de status e tente novamente.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-[#0d1f3c]">
                            Nenhuma consulta cadastrada
                          </p>
                          <p className="mt-1 mb-4 text-sm text-[rgba(13,31,60,0.60)]">
                            Registre a primeira consulta jurídica para começar.
                          </p>
                          <Link
                            href="/app/juridico/consultas/nova"
                            className={`inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#040920] px-4 text-sm font-semibold text-white hover:bg-[#0d3260] ${focusRingClass}`}
                          >
                            <Plus size={14} aria-hidden="true" /> Nova consulta
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const stale = daysSince(row.lastInteractionAt);
                  const slaOverdue = row.slaDueDate && new Date(row.slaDueDate) < new Date();
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[rgba(4,9,32,0.05)] transition-colors hover:bg-[rgba(4,9,32,0.02)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/juridico/consultas/${row.id}`}
                          className={`text-sm font-semibold text-[#040920] hover:underline ${focusRingClass}`}
                        >
                          {row.internalNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-xs truncate text-sm font-medium">{row.title}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">{row.associateName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex max-w-[10rem] items-center rounded-[4px] px-2.5 py-1 text-xs leading-tight font-semibold tracking-[-0.01em] ${getLegalConsultationStatusBadgeClass(row.status)}`}
                        >
                          {getLegalConsultationStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {slaOverdue ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#b91c1c]">
                            <AlertTriangle size={13} aria-hidden="true" />
                            <span className="sr-only">SLA atrasado: </span>
                            {formatDate(row.slaDueDate)}
                          </span>
                        ) : (
                          formatDate(row.slaDueDate)
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {stale !== null && stale > 7 ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#a16207]">
                            <Clock size={13} aria-hidden="true" />
                            {stale} dias
                          </span>
                        ) : (
                          <span className="text-[rgba(13,31,60,0.60)]">
                            {stale !== null ? `${stale} dias` : '—'}
                          </span>
                        )}
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
              Página {page} de {totalPages} · {total} resultados
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/app/juridico/consultas?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${status}` : ''}`}
                  className={`inline-flex h-10 items-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 text-sm font-semibold text-[#040920] hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/app/juridico/consultas?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${status}` : ''}`}
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
