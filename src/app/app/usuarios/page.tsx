import { requireRole } from '@/lib/auth/authorization';

export default async function UsuariosPage() {
  await requireRole(['admin', 'diretoria']);

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <h1 className="font-serif text-4xl font-bold leading-none md:text-5xl">
        Usuários
      </h1>
      <p className="mt-4 max-w-2xl text-base-content/65">
        Gestão de usuários administrativos em preparação. O acesso já está restrito a
        coordenadores e diretoria.
      </p>
    </main>
  );
}
