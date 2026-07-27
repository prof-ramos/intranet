'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { focusRingClass } from '@/lib/ui/tokens';

export function PrintToolbar({ associateId }: { associateId: string }) {
  return (
    <div className="mx-auto flex max-w-[760px] items-center justify-between gap-3 p-4 print:hidden">
      <Link
        href={`/app/associados/${associateId}`}
        className={`inline-flex items-center gap-1.5 text-sm font-medium text-[#040920] hover:underline ${focusRingClass}`}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar ao perfil
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
      >
        <Printer size={16} aria-hidden="true" />
        Imprimir
      </button>
    </div>
  );
}
