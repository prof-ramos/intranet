import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { getConsultationsPaginated } from '@/lib/juridico/queries';
import { formatDate, daysSince } from '@/lib/utils/date';
import {
  getLegalConsultationStatusBadgeClass,
  getLegalConsultationStatusLabel,
  LEGAL_CONSULTATION_STATUS_FILTER_OPTIONS,
} from '@/lib/juridico/status';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { hairline } from '@/lib/ui/tokens';
import { StatusFilter } from './StatusFilter';

const PAGE_SIZE = 20;

export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAuth();
  const { q, status, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const { rows, total } = await getConsultationsPaginated(page, PAGE_SIZE, {
    status: status || undefined,
    search: q || undefined,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/juridico"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[rgba(4,9,32,0.04)]"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(13,31,60,0.55)]">
              Jurídico
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold">Consultas</h1>
          </div>
        </div>
        <Link
          href="/app/juridico/consultas/nova"
          className="inline-flex items-center gap-2 bg-[#040920] text-white rounded-[8px] h-10 px-5 text-sm font-semibold hover:bg-[#0d3260]"
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
            className="h-10 w-full max-w-md rounded-[8px] border border-[#e2e8f0] bg-white pl-9 pr-3 text-sm text-[#0d1f3c] placeholder:text-[rgba(13,31,60,0.40)] focus:border-[#76aeea] focus:outline-none"
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

      <div className="overflow-hidden rounded-[16px] bg-white" style={{ border: `1px solid ${hairline}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(4,9,32,0.05)] text-[11px] font-bold uppercase tracking-[0.08em] text-[rgba(13,31,60,0.55)]">
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
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[rgba(13,31,60,0.60)]">
                    Nenhuma consulta encontrada.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const stale = daysSince(row.lastInteractionAt);
                  const slaOverdue =
                    row.slaDueDate && new Date(row.slaDueDate) < new Date();
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[rgba(4,9,32,0.05)] transition-colors hover:bg-[rgba(4,9,32,0.02)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/juridico/consultas/${row.id}`}
                          className="text-sm font-semibold text-[#040920] hover:underline"
                        >
                          {row.internalNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-xs truncate text-sm font-medium">{row.title}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.associateName ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getLegalConsultationStatusBadgeClass(row.status)}`}
                        >
                          {getLegalConsultationStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={slaOverdue ? 'font-semibold text-[#b91c1c]' : ''}>
                          {formatDate(row.slaDueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {stale !== null && stale > 7 ? (
                          <span className="font-semibold text-[#a16207]">{stale} dias</span>
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
                  className="inline-flex items-center gap-2 bg-white text-[#040920] rounded-[8px] h-10 px-4 text-sm font-semibold border border-[rgba(4,9,32,0.15)] hover:bg-[rgba(4,9,32,0.04)]"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/app/juridico/consultas?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${status}` : ''}`}
                  className="inline-flex items-center gap-2 bg-white text-[#040920] rounded-[8px] h-10 px-4 text-sm font-semibold border border-[rgba(4,9,32,0.15)] hover:bg-[rgba(4,9,32,0.04)]"
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
