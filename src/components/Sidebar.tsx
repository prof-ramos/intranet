import Image from 'next/image';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Kanban,
  LayoutDashboard,
  Mail,
  MapPin,
  Plus,
  Scale,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Webhook,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { NavGroup } from '@/components/NavGroup';
import { LogoutButton } from '@/components/LogoutButton';
import { PRIVILEGED_ROLES, type AuthRole } from '@/lib/auth/config';
import { focusRingClass } from '@/lib/ui/tokens';

interface SidebarProps {
  user: {
    name: string;
    role: AuthRole;
  };
}

const navSectionLabelClass =
  'px-9 pb-1 text-[10px] font-bold tracking-[0.12em] text-white/45 uppercase';

const quickActionClass = [
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80',
  'transition-colors hover:bg-white/10 hover:text-white',
  focusRingClass,
].join(' ');

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
            src="/logo.svg"
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

      {/* Quick Actions */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(142, 193, 232, 0.15)' }}>
        <p className={`${navSectionLabelClass} mb-2`}>Ações Rápidas</p>
        <div className="flex flex-col gap-1">
          <Link href="/app/atividades/nova" className={quickActionClass}>
            <Plus size={16} />
            Nova atividade
          </Link>
          <Link href="/app/secretaria/oficios/novo" className={quickActionClass}>
            <FileSpreadsheet size={16} />
            Novo ofício
          </Link>
          <Link href="/app/associados" className={quickActionClass}>
            <Search size={16} />
            Buscar associado
          </Link>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col py-2" aria-label="Navegação principal">
        <div role="group" aria-labelledby="nav-operacao">
          <p id="nav-operacao" className={`${navSectionLabelClass} pt-4`}>
            Operação
          </p>
          <NavLink href="/app" icon={<LayoutDashboard size={20} />}>
            Dashboard
          </NavLink>
          <NavLink href="/app/atividades" icon={<Kanban size={20} />}>
            Atividades
          </NavLink>
        </div>

        <div role="group" aria-labelledby="nav-cadastro">
          <p id="nav-cadastro" className={`${navSectionLabelClass} pt-5`}>
            Cadastro
          </p>
          <NavLink
            href="/app/associados"
            exclude={['/app/associados/relatorio']}
            icon={<Users size={20} />}
          >
            Oficiais
          </NavLink>
        </div>

        <div role="group" aria-labelledby="nav-gestao">
          <p id="nav-gestao" className={`${navSectionLabelClass} pt-5`}>
            Gestão
          </p>
          <NavGroup
            basePath="/app/secretaria"
            activePaths={['/app/associados']}
            icon={<FileSpreadsheet size={20} />}
            label="Secretaria"
            items={[
              {
                href: '/app/associados',
                label: 'Pesquisa de oficiais',
                icon: <Users size={18} />,
              },
              {
                href: '/app/secretaria/oficios',
                label: 'Ofícios',
                icon: <FileSpreadsheet size={18} />,
              },
              {
                href: '/app/secretaria/mala-direta',
                label: 'Mala direta',
                icon: <Mail size={18} />,
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
              ...(PRIVILEGED_ROLES.includes(user.role)
                ? [
                    {
                      href: '/app/associados/relatorio',
                      label: 'Relatórios',
                      icon: <FileSpreadsheet size={18} />,
                    },
                  ]
                : []),
            ]}
          />
          {PRIVILEGED_ROLES.includes(user.role) && (
            <NavLink href="/app/juridico" icon={<Scale size={20} />}>
              Jurídico
            </NavLink>
          )}
        </div>

        <div role="group" aria-labelledby="nav-administracao">
          <p id="nav-administracao" className={`${navSectionLabelClass} pt-5`}>
            Administração
          </p>
          <NavLink href="/app/privacidade" icon={<Shield size={20} />}>
            Privacidade
          </NavLink>
          {PRIVILEGED_ROLES.includes(user.role) && (
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
        </div>
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
