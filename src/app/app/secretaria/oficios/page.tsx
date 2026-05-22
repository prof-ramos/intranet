import Link from 'next/link';
import { getOfficialLettersAction } from './actions';
import { FilePlus } from 'lucide-react';
import { OficiosSearchableList } from './_components/OficiosSearchableList';
import { navy, textMuted, primaryContainerHover, focusRingClass } from '@/lib/ui/tokens';
import { CSSProperties } from 'react';

export default async function OficiosPage() {
  const oficios = await getOfficialLettersAction();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textMuted }}>
            Secretaria
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold md:text-[3rem]">Ofícios</h1>
        </div>
        <Link
          href="/app/secretaria/oficios/novo"
          className={`inline-flex h-10 items-center gap-2 rounded-[8px] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] ${focusRingClass}`}
          style={
            { backgroundColor: navy, '--primary-hover': primaryContainerHover } as CSSProperties
          }
        >
          <FilePlus size={18} aria-hidden="true" /> Novo Ofício
        </Link>
      </div>

      <OficiosSearchableList oficios={oficios} />
    </main>
  );
}
