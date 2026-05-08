import { LayoutDashboard, Users, Kanban, Shield, Settings } from 'lucide-react';
import { NavLink } from './NavLink';
import { LogoutButton } from './LogoutButton';

interface SidebarProps {
  user: {
    name: string;
    role: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="w-64 bg-base-200 border-r border-base-300 flex flex-col shrink-0">
      <div className="p-4">
        <h1 className="font-serif text-xl font-bold text-primary-content">
          ASOF Intranet
        </h1>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        <NavLink href="/app" icon={<LayoutDashboard size={20} />}>
          Dashboard
        </NavLink>
        <NavLink href="/app/associados" icon={<Users size={20} />}>
          Associados
        </NavLink>
        <NavLink href="/app/atividades" icon={<Kanban size={20} />}>
          Atividades
        </NavLink>
        {user.role !== 'secretaria' && (
          <NavLink href="/app/usuarios" icon={<Shield size={20} />}>
            Usuários
          </NavLink>
        )}
        {user.role !== 'secretaria' && (
          <NavLink href="/app/auditoria" icon={<Shield size={20} />}>
            Auditoria
          </NavLink>
        )}
        <NavLink href="/app/config" icon={<Settings size={20} />}>
          Configurações
        </NavLink>
      </nav>
      <div className="p-4 border-t border-base-300 space-y-3">
        <div>
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs opacity-60 capitalize">{user.role}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
