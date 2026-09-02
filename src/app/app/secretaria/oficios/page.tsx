import Link from 'next/link';
import { getOfficialLettersAction } from './actions';
import { FilePlus } from 'lucide-react';
import { OficiosSearchableList } from './_components/OficiosSearchableList';
import { PageHeader } from '@/components/PageHeader';
import { navy, primaryContainerHover, focusRingClass } from '@/lib/ui/tokens';
import { CSSProperties } from 'react';

export default async function OficiosPage() {
  const oficios = await getOfficialLettersAction();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Secretaria"
        title="Ofícios"
        actions={
          <Link
            href="/app/secretaria/oficios/novo"
            className={`inline-flex h-10 items-center gap-2 rounded-[8px] px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[var(--primary-hover)] ${focusRingClass}`}
            style={
              { backgroundColor: navy, '--primary-hover': primaryContainerHover } as CSSProperties
            }
          >
            <FilePlus size={18} aria-hidden="true" /> Novo Ofício
          </Link>
        }
      />

      <OficiosSearchableList oficios={oficios} />
    </main>
  );
}
