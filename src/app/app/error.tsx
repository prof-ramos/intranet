'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';

const logger = createLogger('app:error');

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('App error boundary caught', { error: toSafeErrorLog(error) }, error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-[#040920]">Algo deu errado</h1>
        <p className="max-w-md text-[#59677a]">
          Ocorreu um erro inesperado ao carregar esta página. Tente novamente ou entre em contato
          com o suporte se o problema persistir.
        </p>
        {error.digest && <p className="text-sm text-[#59677a]/60">Código: {error.digest}</p>}
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
