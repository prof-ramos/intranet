'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { toSafeErrorLog } from '@/lib/error-log';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary caught:', toSafeErrorLog(error));
  }, [error]);

  return (
    <html lang="pt-BR" data-theme="ASOF">
      <body className="min-h-screen flex flex-col items-center justify-center px-4 font-sans antialiased">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#040920]">Algo deu errado</h1>
          <p className="max-w-md text-[#59677a]">
            Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte se o problema persistir.
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
      </body>
    </html>
  );
}
