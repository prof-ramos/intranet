'use client';

import { useEffect } from 'react';
import { Users, RotateCcw } from 'lucide-react';
import { focusRingClass } from '@/lib/ui/tokens';

export default function AssociadosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Associados error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Users className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-[#040920]">Erro ao carregar associados</h1>
        <p className="max-w-md text-[rgba(13,31,60,0.60)]">
          Não foi possível carregar a lista de associados. Verifique sua conexão e tente novamente.
        </p>
        {error.digest && (
          <p className="text-sm text-[rgba(13,31,60,0.40)]">Código: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className={`inline-flex items-center gap-2 rounded-lg bg-[#040920] px-4 py-2 text-white transition hover:bg-[#0d3260] ${focusRingClass}`}
        >
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
