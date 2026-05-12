import { requireAuth } from '@/lib/auth/require-auth';
import { getAssociatesListPage } from '@/lib/associates/service';
import { getRoleLabel } from '@/lib/ui/role-labels';
import { parseAssociatesSearchParams } from '@/lib/associates/search-params';
import { Bell, ChevronLeft, ChevronRight, Download, Pencil, Search } from 'lucide-react';
import Link from 'next/link';
import { hairline, textMuted, navy, skyBlue, error, success, successBg, canvas } from '@/lib/ui/tokens';

const PAGE_SIZE = 20;

export default async function AssociadosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireAuth();
  const { q, page } = parseAssociatesSearchParams(await searchParams);

  const { rows, total } = await getAssociatesListPage(page, PAGE_SIZE, q);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, total);
  const to = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);
  const unreadNotifications: number | null = null;

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-20 border-b px-5 py-3 sm:px-8 lg:px-10 bg-white" style={{ borderColor: hairline }}>
        <div className="mx-auto grid w-full max-w-[1180px] gap-3 sm:grid-cols-[minmax(240px,420px)_auto] sm:items-center sm:justify-between">
          <div className="min-w-0">
            <form method="GET" action="/app/associados">
              <label className="flex h-11 min-h-11 w-full items-center gap-3 rounded-[8px] border bg-white px-3" style={{ borderColor: hairline }}>
                <span className="sr-only">Buscar associado por nome</span>
                <Search size={18} style={{ color: textMuted }} aria-hidden="true" />
                <input
                  name="q"
                  type="search"
                  defaultValue={q}
                  className="grow bg-transparent text-sm outline-none placeholder:text-[rgba(13,31,60,0.55)]"
                  placeholder="Buscar por nome..."
                />
              </label>
            </form>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-4 sm:justify-end">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
              {unreadNotifications !== null && unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 z-10 grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[10px] font-bold text-white" style={{ backgroundColor: error }}>
                  {unreadNotifications}
                </span>
              )}
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-[rgba(4,9,32,0.04)]"
                aria-label={
                  unreadNotifications !== null && unreadNotifications > 0
                    ? `Notificações — ${unreadNotifications} não lidas`
                    : 'Notificações'
                }
              >
                <Bell size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="hidden min-h-11 min-w-0 items-center gap-3 border-l pl-4 sm:flex" style={{ borderColor: hairline }}>
              <div
                aria-label={`Avatar de ${user.name}`}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: navy, boxShadow: `0 0 0 2px ${skyBlue}26` }}
              >
                {user.name
                  .split(' ')
                  .slice(0, 2)
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="max-w-[190px] truncate text-sm font-semibold">{user.name}</p>
                <p className="text-xs" style={{ color: textMuted }}>{getRoleLabel(user.role)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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

        {/* Tabela */}
        <section className="rounded-[10px] overflow-hidden border bg-white shadow-sm" style={{ borderColor: hairline }}>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p style={{ color: textMuted }}>
              {total === 0 ? 'Nenhum resultado' : `${from}–${to} de ${total}`}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link href="/app/associados?page=1" className="text-sm font-semibold">
                Ver todos ({total})
              </Link>
              <Link
                href="/app/associados/relatorio"
                aria-label="Exportar associados"
                className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white transition-colors hover:bg-[rgba(4,9,32,0.04)]"
              >
                <Download size={18} aria-hidden="true" />
              </Link>
              <div className="flex overflow-hidden rounded-[8px] border" style={{ borderColor: hairline }}>
                {page > 1 ? (
                  <Link
                    href={`/app/associados?q=${encodeURIComponent(q)}&page=${page - 1}`}
                    className="inline-flex h-11 w-11 items-center justify-center bg-white transition-colors hover:bg-[rgba(4,9,32,0.04)]"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 cursor-not-allowed items-center justify-center" style={{ backgroundColor: canvas, color: textMuted }}
                    aria-label="Página anterior"
                    disabled
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                )}
                {page < totalPages ? (
                  <Link
                    href={`/app/associados?q=${encodeURIComponent(q)}&page=${page + 1}`}
                    className="inline-flex h-11 w-11 items-center justify-center border-l bg-white transition-colors hover:bg-[rgba(4,9,32,0.04)]" style={{ borderColor: hairline }}
                    aria-label="Próxima página"
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 cursor-not-allowed items-center justify-center border-l" style={{ borderColor: hairline, backgroundColor: canvas, color: textMuted }}
                    aria-label="Próxima página"
                    disabled
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border-t" style={{ borderColor: hairline }}>
            <table className="w-full text-sm" aria-label="Lista de associados">
              <thead className="bg-[#040920] text-white">
                <tr className="text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-[11px] tracking-[0.06em] uppercase">Nome</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-[11px] tracking-[0.06em] uppercase">Lotação</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-[11px] tracking-[0.06em] uppercase">Posto</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-[11px] tracking-[0.06em] uppercase">Email</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-[11px] tracking-[0.06em] uppercase">Situação</th>
                  <th scope="col" className="w-10 px-4 py-3 text-center" aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center" style={{ color: textMuted }}>
                      Nenhum associado encontrado.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="group border-b transition-colors hover:bg-[#f8fafc]" style={{ borderColor: hairline }}>
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/app/associados/${row.id}`} className="hover:underline">
                          {row.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{row.assignment ?? '—'}</td>
                      <td className="px-4 py-3">{row.classPattern ?? '—'}</td>
                      <td className="px-4 py-3">{row.primaryEmail ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.06em] uppercase ${
                            row.functionalStatus === 'ativo' ? '' : 'border'
                          }`}
                          style={
                            row.functionalStatus === 'ativo'
                              ? { backgroundColor: successBg, color: success }
                              : { backgroundColor: canvas, color: textMuted, borderColor: hairline }
                          }
                        >
                          {row.functionalStatus ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/app/associados/${row.id}/editar`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[rgba(13,31,60,0.55)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-[#f8fafc] hover:text-[#76aeea]"
                          aria-label={`Editar ${row.fullName}`}
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
