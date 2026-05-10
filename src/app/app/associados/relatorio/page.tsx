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
              style={{ background: '#040920', boxShadow: '0 0 0 2px rgba(118,174,234,0.15)' }}
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
          <p
            className="m-0 text-[11px] tracking-[0.18em] uppercase"
            style={{ color: '#59677a' }}
          >
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

        <form method="GET" action="/app/associados/relatorio/download">
          {/* Field groups */}
          <div className="grid gap-6 lg:grid-cols-3">
            {FIELD_GROUPS.map((group) => (
              <section
                key={group.title}
                className="flex flex-col gap-4 rounded-[16px] border bg-white p-5 sm:p-6"
                style={{ borderColor: '#c9d2df' }}
              >
                <h2
                  className="font-serif text-lg font-bold"
                  style={{ color: '#040920' }}
                >
                  {group.title}
                </h2>
                <div className="flex flex-col gap-2.5">
                  {group.fields.map((field) => (
                    <label
                      key={field.key}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        name="fields"
                        value={field.key}
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                      <span className="text-sm" style={{ color: '#0d1f3c' }}>
                        {field.label}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Filters */}
          <section
            className="mt-6 flex flex-col gap-4 rounded-[16px] border bg-white p-5 sm:p-6"
            style={{ borderColor: '#c9d2df' }}
          >
            <h2 className="font-serif text-lg font-bold" style={{ color: '#040920' }}>
              Filtros
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="filter-functional"
                  className="text-[11px] font-bold tracking-[0.10em] uppercase"
                  style={{ color: '#59677a' }}
                >
                  Situação Funcional
                </label>
                <select
                  id="filter-functional"
                  name="functionalStatus"
                  className="h-12 w-full rounded-[8px] border bg-white px-3 text-sm"
                  style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="aposentado">Aposentado</option>
                  <option value="cedido">Cedido</option>
                  <option value="em_licenca">Em Licença</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="filter-association"
                  className="text-[11px] font-bold tracking-[0.10em] uppercase"
                  style={{ color: '#59677a' }}
                >
                  Situação Associativa
                </label>
                <select
                  id="filter-association"
                  name="associationStatus"
                  className="h-12 w-full rounded-[8px] border bg-white px-3 text-sm"
                  style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Associado Ativo</option>
                  <option value="inativo">Associado Inativo</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="filter-contribution"
                  className="text-[11px] font-bold tracking-[0.10em] uppercase"
                  style={{ color: '#59677a' }}
                >
                  Contribuição
                </label>
                <select
                  id="filter-contribution"
                  name="contributionStatus"
                  className="h-12 w-full rounded-[8px] border bg-white px-3 text-sm"
                  style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
                >
                  <option value="todos">Todos</option>
                  <option value="em_dia">Em Dia</option>
                  <option value="inadimplente">Inadimplente</option>
                  <option value="pendente_migracao">Pendente de Migração</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="filter-birth-month"
                  className="text-[11px] font-bold tracking-[0.10em] uppercase"
                  style={{ color: '#59677a' }}
                >
                  Aniversariantes do Mês
                </label>
                <select
                  id="filter-birth-month"
                  name="birthMonth"
                  className="h-12 w-full rounded-[8px] border bg-white px-3 text-sm"
                  style={{ borderColor: '#c9d2df', color: '#0d1f3c' }}
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
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] px-5 text-[13px] font-semibold text-white"
              style={{ background: '#040920' }}
            >
              <FileSpreadsheet size={18} aria-hidden="true" />
              Gerar Relatório
            </button>
            <button
              type="reset"
              className="inline-flex h-10 items-center rounded-[8px] border px-4 text-[13px] font-semibold"
              style={{ color: '#0d1f3c', borderColor: '#c9d2df', background: '#fff' }}
            >
              Limpar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
