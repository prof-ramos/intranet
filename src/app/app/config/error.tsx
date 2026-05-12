'use client';

import { useEffect } from 'react';
import { Settings, RotateCcw } from 'lucide-react';

export default function ConfigError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Config error boundary caught:', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[1180px] flex-col items-center justify-center px-5 py-7">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Settings className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#040920]">Erro nas configurações</h1>
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