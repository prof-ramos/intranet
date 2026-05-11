import { requireRole } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { UserActionsPanel } from './UserActionsPanel';

export default async function UsuariosPage() {
  const currentUser = await requireRole(['admin']);

  const users = await db
    .select({
      id: admins.id,
      name: admins.name,
      email: admins.email,
      role: admins.role,
      isActive: admins.isActive,
      mustChangePassword: admins.mustChangePassword,
      createdAt: admins.createdAt,
    })
    .from(admins)
    .orderBy(asc(admins.name));

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    diretoria: 'Diretoria',
    secretaria: 'Secretaria',
  };

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <p className="text-[rgba(13,31,60,0.55)] text-[11px] tracking-[0.18em] uppercase">
        Administração · Controle de acesso
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
        Usuários
      </h1>

      <div className="mt-8 overflow-hidden rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(4,9,32,0.06)] bg-[rgba(13,31,60,0.02)]">
              <th className="px-6 py-3 text-left font-semibold text-[#040920]">Nome</th>
              <th className="px-6 py-3 text-left font-semibold text-[#040920]">E-mail</th>
              <th className="px-6 py-3 text-left font-semibold text-[#040920]">Perfil</th>
              <th className="px-6 py-3 text-left font-semibold text-[#040920]">Status</th>
              <th className="px-6 py-3 text-right font-semibold text-[#040920]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-[rgba(4,9,32,0.05)] last:border-0 hover:bg-[rgba(13,31,60,0.015)] transition-colors"
              >
                <td className="px-6 py-4 font-medium text-[#040920]">
                  {user.name}
                  {user.mustChangePassword && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      Troca obrigatória
                    </span>
                  )}
                  {user.id === currentUser.userId && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      Você
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-[rgba(13,31,60,0.65)]">{user.email}</td>
                <td className="px-6 py-4 text-[rgba(13,31,60,0.65)]">
                  {roleLabel[user.role] ?? user.role}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      user.isActive
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {user.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {user.id !== currentUser.userId && (
                    <UserActionsPanel
                      userId={user.id}
                      userName={user.name}
                      isActive={user.isActive}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
