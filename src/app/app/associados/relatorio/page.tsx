import { requireRole } from '@/lib/auth/authorization';
import { navy, slateText } from '@/lib/ui/tokens';
import { RelatorioForm } from './RelatorioForm';

export default async function RelatorioPage() {
  await requireRole(['admin', 'diretoria']);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <section className="mb-7">
        <p className="m-0 text-[11px] tracking-[0.18em] uppercase" style={{ color: slateText }}>
          Cadastro de oficiais · Exportação
        </p>
        <h1
          className="mt-2 font-serif text-4xl leading-none font-bold text-pretty md:text-5xl"
          style={{ color: navy }}
        >
          Exportar cadastro
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: slateText }}>
          Recorte quem entra no arquivo e quais colunas saem. Dados pessoais só vão no CSV se você
          os selecionar.
        </p>
      </section>

      <RelatorioForm />
    </div>
  );
}
