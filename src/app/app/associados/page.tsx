import { requireAuth } from '@/lib/auth/require-auth';
import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';
import { eq, and, count, asc, sql } from 'drizzle-orm';
import { getRoleLabel } from '@/lib/auth/roles';
import {
  buildAssociateNameSearchPattern,
  parseAssociatesSearchParams,
} from '@/lib/associates/search-params';
import { Bell, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 20;

export default async function AssociadosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireAuth();
  const { q, page } = parseAssociatesSearchParams(await searchParams);

  const baseWhere = and(
    eq(associates.associationStatus, 'ativo'),
    q
      ? sql`${associates.fullName} like ${buildAssociateNameSearchPattern(q)} escape '\\'`
      : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: associates.id,
        fullName: associates.fullName,
        assignment: associates.assignment,
        classPattern: associates.classPattern,
        primaryEmail: associates.primaryEmail,
        functionalStatus: associates.functionalStatus,
      })
      .from(associates)
      .where(baseWhere)
      .orderBy(asc(associates.fullName), asc(associates.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(associates).where(baseWhere),
  ]);

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

  return (
    <div>
      {/* Header */}
      <div className="navbar border-base-300 bg-base-100 sticky top-0 z-20 flex-col items-stretch gap-3 border-b px-5 py-3 sm:flex-row sm:items-center lg:px-10">
        <div className="flex-1">
          <form method="GET" action="/app/associados">
            <label className="input flex h-12 max-w-2xl items-center gap-3 rounded-md">
              <span className="sr-only">Buscar associado por nome</span>
              <Search size={20} className="text-base-content/50" aria-hidden="true" />
              <input
                name="q"
                type="search"
                defaultValue={q}
                className="grow"
                placeholder="Buscar por nome..."
              />
            </label>
          </form>
        </div>

        <div className="flex flex-none items-center gap-5 self-end sm:self-auto">
          <div className="relative mr-1">
            <span className="badge badge-error badge-sm absolute -top-1 -right-1 z-10">3</span>
            <button
              type="button"
              className="btn btn-ghost btn-circle min-h-11 min-w-11"
              aria-label="Notificações — 3 não lidas"
            >
              <Bell size={22} aria-hidden="true" />
            </button>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div
              aria-label={`Avatar de ${user.name}`}
              className="bg-primary text-primary-content ring-primary/15 grid h-10 w-10 place-items-center rounded-full text-sm font-bold ring-2"
            >
              {user.name
                .split(' ')
                .slice(0, 2)
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()}
            </div>
            <div className="leading-tight">
              <p className="font-semibold">{user.name}</p>
              <p className="text-base-content/60 text-sm">{getRoleLabel(user.role)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <main className="flex-1 px-5 py-8 sm:px-8 lg:px-10">
        <section className="mb-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="font-serif text-5xl leading-none font-bold md:text-6xl">Associados</h1>
            <p className="text-base-content/70 mt-4 text-xl">{todayLabel}</p>
          </div>
        </section>

        {/* Tabela */}
        <section className="rounded-box bg-base-100 p-6 shadow-md">
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-base-content/60">
              {total === 0 ? 'Nenhum resultado' : `${from}–${to} de ${total}`}
            </p>
            <div className="flex items-center gap-4">
              <Link href="/app/associados?page=1" className="text-sm font-semibold">
                Ver todos ({total})
              </Link>
              <button
                type="button"
                aria-label="Exportar associados"
                className="btn btn-square btn-outline min-h-11 min-w-11 lg:btn-sm"
              >
                <Download size={18} aria-hidden="true" />
              </button>
              <div className="join">
                {page > 1 ? (
                  <Link
                    href={`/app/associados?q=${encodeURIComponent(q)}&page=${page - 1}`}
                    className="join-item btn btn-square min-h-11 min-w-11 lg:btn-sm"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="join-item btn btn-square min-h-11 min-w-11 lg:btn-sm"
                    aria-label="Página anterior"
                    disabled
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                )}
                {page < totalPages ? (
                  <Link
                    href={`/app/associados?q=${encodeURIComponent(q)}&page=${page + 1}`}
                    className="join-item btn btn-square min-h-11 min-w-11 lg:btn-sm"
                    aria-label="Próxima página"
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="join-item btn btn-square min-h-11 min-w-11 lg:btn-sm"
                    aria-label="Próxima página"
                    disabled
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-box border-base-300 overflow-x-auto border">
            <table className="table w-full" aria-label="Lista de associados">
              <thead className="bg-primary text-primary-content">
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Lotação</th>
                  <th scope="col">Posto</th>
                  <th scope="col">Email</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-base-content/50 py-16 text-center">
                      Nenhum associado encontrado.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-base-300 hover:bg-base-200 border-b">
                      <td className="font-medium">
                        <Link href={`/app/associados/${row.id}`} className="hover:underline">
                          {row.fullName}
                        </Link>
                      </td>
                      <td>{row.assignment ?? '—'}</td>
                      <td>{row.classPattern ?? '—'}</td>
                      <td>{row.primaryEmail ?? '—'}</td>
                      <td>
                        <span
                          className={`badge badge-sm ${
                            row.functionalStatus === 'ativo' ? 'badge-success' : 'badge-ghost'
                          }`}
                        >
                          {row.functionalStatus ?? '—'}
                        </span>
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
