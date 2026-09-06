import Link from 'next/link';
import { requireRole } from '@/lib/auth/authorization';
import { PageHeader } from '@/components/PageHeader';
import { MalaDiretaForm } from './MalaDiretaForm';

export default async function MalaDiretaPage() {
  await requireRole(['admin', 'diretoria', 'secretaria']);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Secretaria · Mala direta"
          title="Contatos para Gmail"
          description="Gera um CSV no formato de importação do Google Contacts a partir do cadastro de oficiais. Não envia e-mail — só exporta a lista."
        />
        <Link
          href="/app/mala-direta"
          className="inline-flex min-h-11 items-center rounded-[8px] bg-[#040920] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d3260]"
        >
          Campanhas
        </Link>
      </div>

      <MalaDiretaForm />
    </div>
  );
}
