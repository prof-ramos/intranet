import { requireRole } from '@/lib/auth/authorization';
import { DEFAULT_FIELDS_BY_MODE, ETIQUETA_FIELD_KEYS, PIMACO_TEMPLATES } from '@/lib/etiquetas';
import { fetchAssociatesForEtiquetas } from './actions';
import { EtiquetasForm } from './_components/EtiquetasForm';
import { hairline, textMuted } from '@/lib/ui/tokens';

export default async function EtiquetasPage() {
  await requireRole(['admin', 'diretoria', 'secretaria']);
  const initialAssociates = await fetchAssociatesForEtiquetas();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <section className="mb-7">
        <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textMuted }}>
          Secretaria · Impressão A4
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
          Etiquetas Pimaco
        </h1>
        <p className="mt-3 max-w-3xl text-sm" style={{ color: textMuted }}>
          Gere etiquetas de associados para envio postal ou mala diplomática. Imprima em escala 100%, sem ajuste automático à página.
        </p>
      </section>

      <section className="rounded-[10px] border bg-white shadow-sm" style={{ borderColor: hairline }}>
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
