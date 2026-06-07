'use client';

import { useEffect } from 'react';
import { Kanban, RotateCcw } from 'lucide-react';
import { focusRingClass } from '@/lib/ui/tokens';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('error-boundary:atividades');

export default function AtividadesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Atividades error boundary caught', { error: toSafeErrorLog(error) }, error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Kanban className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-[#040920]">Erro ao carregar atividades</h1>
        <p className="max-w-md text-[#59677a]">
          Não foi possível carregar o quadro de atividades. Verifique sua conexão e tente novamente.
        </p>
        {error.digest && <p className="text-sm text-[#59677a]/60">Código: {error.digest}</p>}
        <button
          type="button"
          onClick={reset}
          className={`inline-flex items-center gap-2 rounded-lg bg-[#040920] px-4 py-2 text-white transition hover:bg-[#06284f] ${focusRingClass}`}
        >
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
