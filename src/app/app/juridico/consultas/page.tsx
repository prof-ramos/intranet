import Link from 'next/link';
import { requireAuth } from '@/lib/auth/require-auth';
import { getConsultationsPaginated } from '@/lib/juridico/queries';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { hairline } from '@/lib/ui/tokens';

const PAGE_SIZE = 20;

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'aberta', label: 'Aberta' },
  { value: 'aguardando_escritorio', label: 'Aguardando escritório' },
  { value: 'respondida', label: 'Respondida' },
  { value: 'arquivada', label: 'Arquivada' },
];

function formatDate(value: string | Date | null) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString('pt-BR');
}

function daysSince(value: string | Date | null) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

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
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-base-content/55">
              Jurídico
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold">Consultas</h1>
          </div>
        </div>
        <Link
          href="/app/juridico/consultas/nova"
          className="btn btn-primary min-h-11 px-4 lg:btn-sm lg:h-10 lg:min-h-10"
        >
          <Plus size={16} aria-hidden="true" /> Nova consulta
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form className="relative flex-1" method="get">
          <Search
            size={16}
            className="text-base-content/40 absolute top-1/2 left-3 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar por título ou número..."
            className="input input-bordered w-full max-w-md pl-9"
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>

        <form className="flex gap-2" method="get">
          {q && <input type="hidden" name="q" value={q} />}
          <select
            name="status"
            defaultValue={status ?? ''}
            className="select select-bordered"
            onChange={(e) => e.currentTarget.form?.submit()}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </form>
      </div>

      <div className="rounded-box bg-base-100 overflow-hidden" style={{ border: `1px solid ${hairline}` }}>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="border-b border-base-200 text-[11px] font-bold uppercase tracking-[0.08em] text-base-content/55">
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
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-base-content/60">
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
                      className="border-b border-base-200 hover:bg-base-200/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/juridico/consultas/${row.id}`}
                          className="text-primary text-sm font-semibold hover:underline"
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
                          className={`badge badge-sm ${
                            row.status === 'aberta'
                              ? 'badge-ghost'
                              : row.status === 'aguardando_escritorio'
                                ? 'badge-warning'
                                : row.status === 'respondida'
                                  ? 'badge-success'
                                  : 'badge-neutral'
                          }`}
                        >
                          {statusOptions.find((s) => s.value === row.status)?.label ?? row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={slaOverdue ? 'text-error font-semibold' : ''}>
                          {formatDate(row.slaDueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {stale !== null && stale > 7 ? (
                          <span className="text-warning font-semibold">{stale} dias</span>
                        ) : (
                          <span className="text-base-content/60">
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
          <div className="flex items-center justify-between border-t border-base-200 px-4 py-3">
            <p className="text-sm text-base-content/60">
              Página {page} de {totalPages} · {total} resultados
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/app/juridico/consultas?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${status}` : ''}`}
                  className="btn btn-outline btn-sm"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/app/juridico/consultas?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${status}` : ''}`}
                  className="btn btn-outline btn-sm"
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
