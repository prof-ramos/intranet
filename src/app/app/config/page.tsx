import { requireAuth } from '@/lib/auth/require-auth';

export default async function ConfigPage() {
  await requireAuth();

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <p className="text-base-content/55 text-[11px] tracking-[0.18em] uppercase">
        Sistema · Preferências operacionais
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold leading-none md:text-5xl">
        Configurações
      </h1>
      <p className="mt-4 max-w-2xl text-base-content/65">
        Preferências operacionais da intranet em preparação.
      </p>
    </main>
  );
}
