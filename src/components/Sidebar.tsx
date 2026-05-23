import Image from 'next/image';
import Link from 'next/link';
import {
  DollarSign,
  FileSpreadsheet,
  FileText,
  Kanban,
  LayoutDashboard,
  Mail,
  MapPin,
  Receipt,
  Scale,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Webhook,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { NavGroup } from '@/components/NavGroup';
import { LogoutButton } from '@/components/LogoutButton';
import { type AuthRole } from '@/lib/auth/config';
import { focusRingClass } from '@/lib/ui/tokens';

interface SidebarProps {
  user: {
    name: string;
    role: AuthRole;
  };
}

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside
      className="flex min-h-full w-72 shrink-0 flex-col"
      style={{ backgroundColor: '#06284f' }}
    >
      {/* Logo */}
      <div
        className="flex min-h-[124px] flex-col items-center justify-center px-6 py-6"
        style={{
          background: 'linear-gradient(180deg, #031a35 0%, #06284f 100%)',
          borderBottom: '1px solid rgba(142, 193, 232, 0.22)',
        }}
      >
        <Link
          href="/app"
          aria-label="Ir para a página inicial"
          className={['rounded-[8px]', focusRingClass].join(' ')}
        >
          <Image
            src="https://asof.org.br/img/asof-dark.svg"
            alt="ASOF — Associação de Oficiais de Chancelaria"
            width={200}
            height={60}
            className="h-[60px] w-[200px]"
            loading="eager"
            fetchPriority="high"
            unoptimized
          />
        </Link>
        <p className="mt-2 font-sans text-[9px] tracking-[0.18em] text-[#b3d2ea] uppercase">
          Intranet
        </p>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col py-2" aria-label="Navegação principal">
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
        <NavGroup
          basePath="/app/secretaria"
          icon={<FileSpreadsheet size={20} />}
          label="Secretaria"
          items={[
            {
              href: '/app/secretaria/oficios',
              label: 'Ofícios',
              icon: <FileSpreadsheet size={18} />,
            },
            {
              href: '/app/secretaria/documentos',
              label: 'Documentos',
              icon: <FileText size={18} />,
            },
            ...(user.role !== 'diretoria'
              ? [
                  {
                    href: '/app/secretaria/emails/gerar',
                    label: 'E-mails com IA',
                    icon: <Mail size={18} />,
                  },
                ]
              : []),
          ]}
        />
        {user.role !== 'secretaria' && (
          <NavGroup
            basePath="/app/financeiro"
            icon={<DollarSign size={20} />}
            label="Financeiro"
            items={[
              {
                href: '/app/financeiro/mensalidades',
                label: 'Mensalidades',
                icon: <Receipt size={18} />,
              },
            ]}
          />
        )}
        {user.role !== 'secretaria' && (
          <NavLink href="/app/associados/relatorio" icon={<FileSpreadsheet size={20} />}>
            Relatórios
          </NavLink>
        )}
        {user.role !== 'secretaria' && (
          <NavGroup
            basePath="/app/config"
            icon={<Settings size={20} />}
            label="Configurações"
            items={[
              { href: '/app/config/usuarios', label: 'Usuários', icon: <Shield size={18} /> },
              { href: '/app/config/lotacoes', label: 'Lotações', icon: <MapPin size={18} /> },
              {
                href: '/app/config/auditoria',
                label: 'Auditoria',
                icon: <ShieldCheck size={18} />,
              },
              {
                href: '/app/config/integracoes/webhooks',
                label: 'Integrações',
                icon: <Webhook size={18} />,
              },
            ]}
          />
        )}
      </nav>

      {/* Footer */}
      <div className="px-9 py-6" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="mb-3">
          <p className="text-sm leading-tight font-semibold text-white">{user.name}</p>
          <p className="mt-0.5 text-xs text-white/50 capitalize">{user.role}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
