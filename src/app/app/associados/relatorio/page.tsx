import { requireRole } from '@/lib/auth/authorization';
import { PageHeader } from '@/components/PageHeader';
import { RelatorioForm } from './RelatorioForm';

export default async function RelatorioPage() {
  await requireRole(['admin', 'diretoria']);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Cadastro de oficiais · Exportação"
        title="Exportar cadastro"
        description="Recorte quem entra no arquivo e quais colunas saem. Dados pessoais só vão no CSV se você os selecionar."
        backHref="/app/associados"
        backLabel="Voltar para cadastro"
      />

      <RelatorioForm />
    </div>
  );
}
