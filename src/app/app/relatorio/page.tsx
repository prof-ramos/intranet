import { requireRole } from '@/lib/auth/authorization';
import { getRoleLabel } from '@/lib/auth/roles';
import { FileSpreadsheet } from 'lucide-react';

const FIELD_GROUPS = [
  {
    title: 'Dados Pessoais',
    fields: [
      { key: 'fullName', label: 'Nome' },
      { key: 'primaryEmail', label: 'E-mail' },
      { key: 'secondaryEmail', label: 'E-mail Secundário' },
      { key: 'birthDate', label: 'Data de Nascimento' },
      { key: 'cpf', label: 'CPF' },
    ],
  },
  {
    title: 'Endereço',
    fields: [
      { key: 'address', label: 'Endereço' },
      { key: 'locationCity', label: 'Cidade' },
      { key: 'locationCountry', label: 'País' },
      { key: 'phone', label: 'Telefone' },
      { key: 'whatsapp', label: 'Celular/WhatsApp' },
    ],
  },
  {
    title: 'Administrativo',
    fields: [
      { key: 'siape', label: 'Matrícula SIAPE' },
      { key: 'assignment', label: 'Lotação' },
      { key: 'assignmentStartDate', label: 'Data da Lotação' },
      { key: 'classPattern', label: 'Classe e Padrão' },
      { key: 'functionalStatus', label: 'Situação Funcional' },
      { key: 'associationStatus', label: 'Situação Associativa' },
      { key: 'contributionStatus', label: 'Contribuição' },
      { key: 'joinedAt', label: 'Data de Adesão' },
      { key: 'associationCategory', label: 'Categoria' },
    ],
  },
];

export default async function RelatorioPage() {
  const user = await requireRole(['admin', 'diretoria']);

  return (
    <div>
      {/* Header */}
      <div className="navbar border-base-300 bg-base-100 sticky top-0 z-20 border-b px-5 py-3 lg:px-10">
        <div className="flex-1">
          <span className="text-base font-semibold">Gerar Relatório</span>
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

      {/* Main */}
      <main className="px-5 py-8 sm:px-8 lg:px-10">
        <section className="mb-10">
          <h1 className="font-serif text-5xl leading-none font-bold md:text-6xl">Relatórios</h1>
          <p className="text-base-content/70 mt-4 text-xl">
            Selecione os campos e filtros para exportar os dados dos associados em CSV.
          </p>
        </section>

        <form method="GET" action="/app/relatorio/download">
          {/* Field groups */}
          <div className="grid gap-6 lg:grid-cols-3">
            {FIELD_GROUPS.map((group) => (
              <section key={group.title} className="rounded-box bg-base-100 p-6 shadow-md">
                <h2 className="font-serif text-lg font-bold mb-4">{group.title}</h2>
                <div className="flex flex-col gap-2.5">
                  {group.fields.map((field) => (
                    <label key={field.key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="fields"
                        value={field.key}
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                      <span className="text-sm">{field.label}</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Filters */}
          <section className="rounded-box bg-base-100 p-6 shadow-md mt-6">
            <h2 className="font-serif text-lg font-bold mb-4">Filtros</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="filter-functional" className="text-sm font-medium">
                  Situação Funcional
                </label>
                <select
                  id="filter-functional"
                  name="functionalStatus"
                  className="select select-bordered"
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="aposentado">Aposentado</option>
                  <option value="cedido">Cedido</option>
                  <option value="em_licenca">Em Licença</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="filter-association" className="text-sm font-medium">
                  Situação Associativa
                </label>
                <select
                  id="filter-association"
                  name="associationStatus"
                  className="select select-bordered"
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Associado Ativo</option>
                  <option value="inativo">Associado Inativo</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="filter-contribution" className="text-sm font-medium">
                  Contribuição
                </label>
                <select
                  id="filter-contribution"
                  name="contributionStatus"
                  className="select select-bordered"
                >
                  <option value="todos">Todos</option>
                  <option value="em_dia">Em Dia</option>
                  <option value="inadimplente">Inadimplente</option>
                  <option value="pendente_migracao">Pendente de Migração</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="filter-birth-month" className="text-sm font-medium">
                  Aniversariantes do Mês
                </label>
                <select
                  id="filter-birth-month"
                  name="birthMonth"
                  className="select select-bordered"
                >
                  <option value="todos">Todos os meses</option>
                  <option value="1">Janeiro</option>
                  <option value="2">Fevereiro</option>
                  <option value="3">Março</option>
                  <option value="4">Abril</option>
                  <option value="5">Maio</option>
                  <option value="6">Junho</option>
                  <option value="7">Julho</option>
                  <option value="8">Agosto</option>
                  <option value="9">Setembro</option>
                  <option value="10">Outubro</option>
                  <option value="11">Novembro</option>
                  <option value="12">Dezembro</option>
                </select>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="mt-6 flex items-center gap-4">
            <button type="submit" className="btn btn-primary min-h-11">
              <FileSpreadsheet size={18} aria-hidden="true" />
              Gerar Relatório
            </button>
            <button type="reset" className="btn btn-outline min-h-11">
              Limpar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
