import { requireRole } from '@/lib/auth/authorization';
import { DEFAULT_FIELDS_BY_MODE, ETIQUETA_FIELD_KEYS, PIMACO_TEMPLATES } from '@/lib/etiquetas';
import { PageHeader } from '@/components/PageHeader';
import { fetchAssociatesForEtiquetas } from './actions';
import { EtiquetasForm } from './_components/EtiquetasForm';
import { hairline } from '@/lib/ui/tokens';

export default async function EtiquetasPage() {
  await requireRole(['admin', 'diretoria', 'secretaria']);
  const initialAssociates = await fetchAssociatesForEtiquetas();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Secretaria · Impressão A4"
        title="Etiquetas Pimaco"
        description="Gere etiquetas de associados para envio postal ou mala diplomática. Imprima em escala 100%, sem ajuste automático à página."
      />

      <section className="rounded-[16px] border bg-white" style={{ borderColor: hairline }}>
        <EtiquetasForm
          initialAssociates={initialAssociates}
          templates={Object.values(PIMACO_TEMPLATES)}
          fieldKeys={[...ETIQUETA_FIELD_KEYS]}
          defaultsByMode={DEFAULT_FIELDS_BY_MODE}
        />
      </section>
    </main>
  );
}
