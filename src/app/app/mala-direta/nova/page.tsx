import { requireRole } from '@/lib/auth/authorization';
import { PageHeader } from '@/components/PageHeader';
import { NovaCampanhaForm } from './_components/NovaCampanhaForm';
import { hairline } from '@/lib/ui/tokens';

export const dynamic = 'force-dynamic';

export default async function NovaCampanhaPage() {
  await requireRole(['admin', 'diretoria', 'secretaria']);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Mala direta"
        title="Nova campanha"
        description="Selecione o público, monte o template e crie a campanha. O envio em lote é processado pela fila após a confirmação."
      />

      <section
        className="rounded-[16px] border bg-white p-5 sm:p-8"
        style={{ borderColor: hairline }}
      >
        <NovaCampanhaForm />
      </section>
    </main>
  );
}
