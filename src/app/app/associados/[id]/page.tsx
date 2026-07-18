import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAssociateProfile } from '@/lib/associates/service';
import { requireAuth } from '@/lib/auth/require-auth';
import { parsePositiveIntParam } from '@/lib/routing/params';
import { requireEntityById } from '@/lib/routing/require-entity';
import { focusRingClass } from '@/lib/ui/tokens';
import { AssociateProfileDetails } from './AssociateProfileDetails';
import { AssociateProfileOverview } from './AssociateProfileOverview';
import { AssociateProfileRelated } from './AssociateProfileRelated';

const tocItems = [
  ['visao-geral', 'Visão geral'],
  ['identificacao', 'Identificação'],
  ['endereco', 'Endereço'],
  ['dados-profissionais', 'Dados Profissionais'],
  ['administrativo', 'Administrativo'],
  ['associacao', 'Associação'],
  ['dependentes', 'Dependentes'],
  ['convenios', 'Convênios'],
  ['observacoes', 'Observações'],
  ['atividades', 'Atividades'],
] as const;

function safeAssociatesReturnPath(returnTo?: string) {
  if (!returnTo || returnTo.startsWith('//')) {
    return '/app/associados';
  }

  try {
    const parsed = new URL(returnTo, 'http://asof.local');
    return parsed.origin === 'http://asof.local' && parsed.pathname.startsWith('/app/')
      ? `${parsed.pathname}${parsed.search}`
      : '/app/associados';
  } catch {
    return '/app/associados';
  }
}

export default async function AssociadoPerfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const { returnTo } = await searchParams;
  const associateId = parsePositiveIntParam(id);
  const profile = await requireEntityById(associateId, (id) => getAssociateProfile(id, user.role));

  return (
    <main className="mx-auto w-full max-w-[1180px] min-w-0 px-5 py-7 sm:px-8 lg:px-10">
      <Link
        href={safeAssociatesReturnPath(returnTo)}
        className={`text-base-content/60 mb-4 inline-flex items-center gap-1.5 text-xs font-medium hover:underline ${focusRingClass}`}
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Voltar para Cadastro de Oficiais
      </Link>

      <div className="grid items-start gap-7 xl:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <nav className="sticky top-6 flex flex-col gap-1">
            <p className="text-base-content/50 mb-2 text-[11px] font-bold tracking-[0.12em] uppercase">
              Navegar
            </p>
            {tocItems.map(([anchor, label]) => (
              <a
                key={anchor}
                href={`#${anchor}`}
                className={`rounded-md px-2.5 py-1.5 text-[13px] font-medium text-[rgba(13,31,60,0.65)] transition-colors hover:bg-[rgba(4,9,32,0.05)] hover:text-[#040920] ${focusRingClass}`}
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-7">
          <AssociateProfileOverview profile={profile} id={id} />
          <AssociateProfileDetails profile={profile} id={id} />
          <AssociateProfileRelated profile={profile} id={id} associateId={associateId!} />
        </div>
      </div>
    </main>
  );
}
