import { requireRole } from '@/lib/auth/authorization';
import { Users } from 'lucide-react';

export default async function UsuariosPage() {
  await requireRole(['admin', 'diretoria']);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <p className="text-[rgba(13,31,60,0.55)] text-[11px] tracking-[0.18em] uppercase">
        Administração · Controle de acesso
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
        Usuários
      </h1>

      <div className="mt-8 rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white p-8 text-center">
        <Users size={40} className="mx-auto mb-4 text-[rgba(13,31,60,0.25)]" aria-hidden="true" />
        <h2 className="font-serif text-xl font-bold text-[#040920]">Módulo em preparação</h2>
        <p className="mt-2 text-sm text-[rgba(13,31,60,0.55)]">
          Gestão de usuários administrativos será implementada aqui em breve.
          O acesso já está restrito a coordenadores e diretoria.
        </p>
      </div>
    </main>
  );
}
