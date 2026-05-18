'use client';

import { useEffect } from 'react';
import { Scale, RotateCcw } from 'lucide-react';
import { createLogger } from '@/lib/logger';

const logger = createLogger('juridico:error');

export default function JuridicoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Jurídico error boundary caught', {}, error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[1180px] flex-col items-center justify-center px-5 py-7">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Scale className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#040920]">Erro no módulo jurídico</h1>
        <p className="max-w-md text-[#59677a]">
          Não foi possível carregar esta seção. Verifique sua conexão e tente novamente.
        </p>
        {error.digest && (
          <p className="text-sm text-[#59677a]/60">Código: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-[#040920] px-4 py-2 text-white transition hover:bg-[#06284f]"
        >
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
