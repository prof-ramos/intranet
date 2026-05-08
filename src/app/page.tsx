import {
  Bell,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileBadge2,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';

const associates = [
  {
    name: 'Cel. Gustavo Henrique Mendes',
    role: 'Chefe de Seção Consular',
    post: 'Cônsul-Geral',
    email: 'gustavo.mendes@asof.gov.br',
    status: 'Ativo',
  },
  {
    name: 'Maj. Laura Beatriz Fonseca',
    role: 'Assessora Diplomática',
    post: 'Primeira Secretária',
    email: 'laura.fonseca@asof.gov.br',
    status: 'Ativo',
  },
  {
    name: 'Ten. Cel. Ricardo Almeida Prado',
    role: 'Coordenador de Protocolo',
    post: 'Conselheiro',
    email: 'ricardo.prado@asof.gov.br',
    status: 'Em análise',
  },
  {
    name: 'Sra. Camila Torres Lima',
    role: 'Oficial de Chancelaria',
    post: 'Secretária',
    email: 'camila.lima@asof.gov.br',
    status: 'Ativo',
  },
  {
    name: 'Cel. Fernando Rocha e Silva',
    role: 'Diretor de Administração',
    post: 'Ministro de Segunda Classe',
    email: 'fernando.silva@asof.gov.br',
    status: 'Ativo',
  },
];

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Associados', icon: Users },
  { label: 'Comunicação', icon: Share2 },
  { label: 'Documentos', icon: FileText },
  { label: 'Configurações', icon: Settings },
];

export default function AdminPage() {
  return (
    <div className="drawer lg:drawer-open min-h-screen bg-[#f8fafc] text-[#040920]">
      <input id="admin-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-[#040920]/10 bg-white">
          <div className="flex h-20 items-center gap-5 px-5 lg:px-10">
            <label
              htmlFor="admin-drawer"
              aria-label="Abrir navegação"
              className="btn btn-square btn-ghost lg:hidden"
            >
              <Menu size={26} />
            </label>

            <button className="hidden rounded-sm p-2 text-[#040920] transition hover:bg-[#e7edf4] lg:inline-flex">
              <Menu size={28} />
            </button>

            <label className="input input-bordered flex h-12 max-w-2xl flex-1 items-center gap-3 rounded-md border-[#040920]/15 bg-[#f8fafc] text-base shadow-sm">
              <Search size={24} className="text-[#040920]/55" />
              <input
                type="search"
                className="grow"
                placeholder="Buscar associados, documentos ou comunicações..."
              />
              <span className="hidden h-8 border-l border-[#040920]/15 sm:block" />
              <span className="hidden rounded-[3px] bg-[#16a34a] px-2 py-1 text-sm sm:block">
                🇧🇷
              </span>
            </label>

            <button className="btn btn-ghost btn-circle relative">
              <Bell size={24} />
              <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-xs font-bold text-white">
                3
              </span>
            </button>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="avatar">
                <div
                  aria-label="Avatar da presidente Renata Vieira"
                  className="grid w-12 place-items-center rounded-full bg-[#040920] text-sm font-bold text-white ring-2 ring-[#040920]/15"
                >
                  RV
                </div>
              </div>
              <div className="leading-tight">
                <p className="font-semibold">Olá, Cel. Renata Vieira</p>
                <p className="text-sm text-[#040920]/65">Inter medium</p>
              </div>
              <ChevronDown size={20} />
            </div>
          </div>
          <div className="h-10 bg-[#040920] px-10 text-sm text-white/80">
            <span className="leading-10">#f8fafc</span>
          </div>
        </header>

        <main className="flex-1 px-5 py-8 sm:px-8 lg:px-10">
          <section className="mb-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="font-serif text-5xl font-bold leading-none tracking-normal text-black md:text-6xl">
                Bem-vindo de volta, Presidente
              </h1>
              <p className="mt-4 text-xl text-black">
                Quinta-feira, 7 de maio de 2026 • Brasília, DF
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <button className="btn h-12 rounded-md border-[#040920]/15 bg-white px-5 text-base font-normal text-black shadow-sm">
                Todos os postos
                <ChevronDown size={20} />
              </button>
              <label className="input input-bordered flex h-12 min-w-64 items-center gap-3 rounded-md border-[#040920]/15 bg-white text-base shadow-sm">
                <Search size={22} className="text-[#040920]/55" />
                <input type="search" className="grow" placeholder="Search" />
              </label>
            </div>
          </section>

          <div className="mb-6 flex justify-end">
            <div className="flex items-center gap-3 text-lg text-black">
              <span>1-5 de 347</span>
              <button className="btn btn-square h-11 min-h-0 w-11 rounded-md border-[#040920]/15 bg-white">
                <ChevronLeft size={22} />
              </button>
              <button className="btn btn-square h-11 min-h-0 w-11 rounded-md border-[#040920]/15 bg-white">
                <ChevronRight size={22} />
              </button>
            </div>
          </div>

          <section className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total de Associados"
              value="347"
              helper="+12 mês"
              helperClass="text-emerald-700"
              icon={<Users size={64} strokeWidth={2.5} />}
            />
            <StatCard
              title="Membros Ativos"
              value="289"
              helper="83%"
              helperClass="rounded-full border-[10px] border-[#76AEEA] px-4 py-5 text-black"
              icon={<ShieldCheck size={58} strokeWidth={2.5} />}
            />
            <StatCard
              title="Empossados 2024"
              value="41"
              helper="+ mês"
              helperClass="text-[#a08324]"
              icon={<FileBadge2 size={58} strokeWidth={2.3} />}
            />
            <StatCard
              title="Pendentes"
              value="8"
              valueClass="text-[#a08324]"
              icon={<CalendarClock size={64} strokeWidth={2.3} />}
            />
          </section>

          <section className="rounded-md bg-white p-6 shadow-[0_12px_30px_rgba(4,9,32,0.08)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-4xl font-bold leading-tight text-black">
                  Associados
                </h2>
                <p className="text-lg text-black">Playfair Display</p>
              </div>
              <div className="flex items-center gap-6">
                <button className="text-lg font-semibold text-black">Ver todos (347)</button>
                <button
                  aria-label="Exportar associados"
                  className="btn btn-square h-14 min-h-0 w-14 rounded-md border-[#040920]/25 bg-white text-black"
                >
                  <Upload size={28} />
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-[#040920]/10">
              <div className="overflow-x-auto">
                <table className="table w-full text-lg text-black">
                  <thead className="bg-[#040920] text-lg text-white">
                    <tr>
                      <th className="py-5">Nome</th>
                      <th>Cargo</th>
                      <th>Posto</th>
                      <th>Email</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {associates.map((associate) => (
                      <tr key={associate.email} className="border-b border-[#040920]/10">
                        <td className="py-5">{associate.name}</td>
                        <td>{associate.role}</td>
                        <td>{associate.post}</td>
                        <td>{associate.email}</td>
                        <td>
                          <span
                            className={
                              associate.status === 'Ativo'
                                ? 'badge rounded-full border-0 bg-[#bfe6bd] px-4 py-4 text-base font-normal text-black'
                                : 'badge rounded-full border-0 bg-[#e7c16b] px-4 py-4 text-base font-normal text-black'
                            }
                          >
                            {associate.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>

      <aside className="drawer-side z-30">
        <label htmlFor="admin-drawer" aria-label="Fechar navegação" className="drawer-overlay" />
        <nav className="flex min-h-full w-80 flex-col bg-[#06284f] text-white">
          <div className="px-9 pb-12 pt-10">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="font-serif text-6xl font-bold leading-none tracking-normal">ASOF</h2>
                <p className="mt-1 text-[11px] uppercase tracking-[0.08em]">
                  Associação de Oficiais de Chancelaria
                </p>
              </div>
              <Building2 size={40} className="text-[#BAD7F7]" />
            </div>
          </div>

          <div className="px-9 pb-5 text-xl">Inter</div>

          <ul className="menu w-full p-0 text-[22px]">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.label}>
                  <a
                    className={`h-[58px] rounded-none px-9 ${
                      item.active
                        ? 'border-l-[6px] border-[#76AEEA] bg-[#123d73] text-white'
                        : 'hover:bg-[#123d73]'
                    }`}
                  >
                    <Icon size={28} />
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto px-9 pb-10 text-center text-sm text-white/85">
            <p>Versão 2.4.1 •</p>
            <p>Ministério das Relações Exteriores</p>
          </div>
        </nav>
      </aside>
    </div>
  );
}

function StatCard({
  title,
  value,
  helper,
  icon,
  valueClass = 'text-[#040920]',
  helperClass = '',
}: {
  title: string;
  value: string;
  helper?: string;
  icon: React.ReactNode;
  valueClass?: string;
  helperClass?: string;
}) {
  return (
    <article className="rounded-md border-[3px] border-[#06284f] bg-white p-7 text-[#040920] shadow-[0_4px_0_rgba(4,9,32,0.12)]">
      <div className="mb-5 text-xl text-black">{title}</div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-end gap-5">
          <span className={`text-6xl font-bold leading-none ${valueClass}`}>{value}</span>
          {helper ? <span className={`text-2xl font-bold ${helperClass}`}>{helper}</span> : null}
        </div>
        <div className="text-[#06284f]">{icon}</div>
      </div>
    </article>
  );
}
