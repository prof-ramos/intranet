import { requireRole } from '@/lib/auth/authorization';
import { getRoleLabel } from '@/lib/ui/role-labels';
import { RelatorioForm } from './RelatorioForm';

export default async function RelatorioPage() {
  const user = await requireRole(['admin', 'diretoria']);

  return (
    <div>
      {/* Header */}
      <div
        className="sticky top-0 z-20 border-b px-5 py-3 sm:px-8 lg:px-10"
        style={{ background: '#ffffff', borderColor: '#c9d2df' }}
      >
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between">
          <span className="text-base font-semibold" style={{ color: '#0d1f3c' }}>
            Gerar Relatório
          </span>
          <div className="hidden items-center gap-3 sm:flex">
            <div
              aria-label={`Avatar de ${user.name}`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{
                background: '#040920',
                boxShadow: '0 0 0 2px rgba(118,174,234,0.15)',
              }}
            >
              {user.name
                .split(' ')
                .slice(0, 2)
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold" style={{ color: '#0d1f3c' }}>
                {user.name}
              </p>
              <p className="text-xs" style={{ color: '#59677a' }}>
                {getRoleLabel(user.role)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
        <section className="mb-7">
          <p className="m-0 text-[11px] tracking-[0.18em] uppercase" style={{ color: '#59677a' }}>
            Associados · Exportação
          </p>
          <h1
            className="mt-2 font-serif text-4xl leading-none font-bold md:text-5xl"
            style={{ color: '#040920' }}
          >
            Relatórios
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: '#59677a' }}>
            Selecione os campos e filtros para exportar os dados dos associados em CSV.
          </p>
        </section>

        <RelatorioForm />
      </main>
    </div>
  );
}
