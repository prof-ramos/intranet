import { requireRole } from '@/lib/auth/authorization';
import { PageHeader } from '@/components/PageHeader';
import { MalaDiretaForm } from './MalaDiretaForm';

export default async function MalaDiretaPage() {
  await requireRole(['admin', 'diretoria', 'secretaria']);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Secretaria · Mala direta"
        title="Contatos para Gmail"
        description="Gera um CSV no formato de importação do Google Contacts a partir do cadastro de oficiais. Não envia e-mail — só exporta a lista."
      />

      <MalaDiretaForm />
    </div>
  );
}
