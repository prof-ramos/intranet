import { requireRole } from '@/lib/auth/authorization';

export default async function AuditoriaPage() {
  await requireRole(['admin', 'diretoria']);

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <p className="text-base-content/55 text-[11px] tracking-[0.18em] uppercase">
        Administração · Registro de eventos
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold leading-none md:text-5xl">
        Auditoria
      </h1>
      <p className="mt-4 max-w-2xl text-base-content/65">
        Consulta de eventos de auditoria em preparação. O acesso já está restrito a
        coordenadores e diretoria.
      </p>
    </main>
  );
}
