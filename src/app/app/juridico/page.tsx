import { requireAuth } from '@/lib/auth/require-auth';

export default async function JuridicoPage() {
  await requireAuth();

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <p className="text-[11px] uppercase tracking-[0.18em] text-base-content/55">
        Área institucional
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold leading-none md:text-5xl">
        Jurídico
      </h1>
      <p className="mt-4 max-w-2xl text-base-content/65">
        Nenhuma consulta jurídica em acompanhamento.
      </p>
    </main>
  );
}
