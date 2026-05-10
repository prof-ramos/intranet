import Image from 'next/image';
import Link from 'next/link';
import {
  Kanban,
  LayoutDashboard,
  Scale,
  Settings,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { LogoutButton } from '@/components/LogoutButton';
import { type AuthRole } from '@/lib/auth/config';

interface SidebarProps {
  user: {
    name: string;
    role: AuthRole;
  };
}

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="w-72 min-h-full flex flex-col shrink-0" style={{ backgroundColor: '#06284f' }}>
      {/* Logo — fundo branco para preservar as cores originais da marca */}
      <div className="bg-white px-6 py-6 flex flex-col items-center">
        <Link
          href="/app"
          aria-label="Ir para a página inicial"
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2"
        >
          <Image
            src="/images/logo-asof.svg"
            alt="ASOF — Associação de Oficiais de Chancelaria"
            width={200}
            height={60}
            priority
          />
        </Link>
        <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-[#06284f]/40 font-sans">
          Intranet
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col pt-2">
        <NavLink href="/app" icon={<LayoutDashboard size={20} />}>
          Dashboard
        </NavLink>
        <NavLink href="/app/associados" icon={<Users size={20} />}>
          Associados
        </NavLink>
        <NavLink href="/app/atividades" icon={<Kanban size={20} />}>
          Atividades
        </NavLink>
        <NavLink href="/app/juridico" icon={<Scale size={20} />}>
          Jurídico
        </NavLink>
        {user.role !== 'secretaria' && (
          <NavLink href="/app/usuarios" icon={<Shield size={20} />}>
            Usuários
          </NavLink>
        )}
        {user.role !== 'secretaria' && (
          <NavLink href="/app/auditoria" icon={<ShieldCheck size={20} />}>
            Auditoria
          </NavLink>
        )}
        <NavLink href="/app/config" icon={<Settings size={20} />}>
          Configurações
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="px-9 py-6" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="mb-3">
          <p className="text-sm font-semibold text-white leading-tight">{user.name}</p>
          <p className="text-xs text-white/50 mt-0.5 capitalize">{user.role}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
