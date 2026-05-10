'use client';

import { useEffect } from 'react';
import { FilePlus, RotateCcw } from 'lucide-react';

export default function NovaConsultaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Nova consulta error boundary caught:', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[1180px] flex-col items-center justify-center px-5 py-7">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <FilePlus className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#040920]">Erro ao abrir formulário</h1>
        <p className="max-w-md text-[rgba(13,31,60,0.60)]">
          Não foi possível carregar o formulário de nova consulta. Verifique sua conexão e tente novamente.
        </p>
        {error.digest && (
          <p className="text-sm text-[rgba(13,31,60,0.40)]">Código: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-[#040920] px-4 py-2 text-white transition hover:bg-[#0d3260]"
        >
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
