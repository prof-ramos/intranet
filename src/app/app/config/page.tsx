import { requireAuth } from '@/lib/auth/require-auth';
import { requireRole } from '@/lib/auth/authorization';

export default async function ConfigPage() {
  await requireAuth();
  await requireRole(['admin', 'diretoria']);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <p className="text-base-content/55 text-[11px] tracking-[0.18em] uppercase">
        Sistema · Preferências operacionais
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
        Configurações
      </h1>
      <p className="mt-4 max-w-2xl text-base-content/65">
        Preferências operacionais da intranet em preparação.
      </p>
    </main>
  );
}
