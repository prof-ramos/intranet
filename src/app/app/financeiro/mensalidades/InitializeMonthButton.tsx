'use client';

import { FileCheck2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { initializeMonthAction } from './actions';
import { focusRingClass, navy } from '@/lib/ui/tokens';

interface InitializeMonthButtonProps {
  year: number;
  month: number;
  periodLabel: string;
}

export function InitializeMonthButton({
  year,
  month,
  periodLabel,
}: InitializeMonthButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleInitialize() {
    setFeedback(null);
    startTransition(() => {
      void initializeMonthAction(year, month)
        .then((result) => {
          setFeedback(
            `Criados: ${result.created} · Mantidos: ${result.maintained} · Rejeitados: ${result.rejected}`,
          );
          router.refresh();
        })
        .catch(() => {
          setFeedback('Não foi possível inicializar o mês. Tente novamente.');
        });
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleInitialize}
        disabled={isPending}
        className={`inline-flex h-10 items-center justify-center gap-2 rounded-[9px] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0d3260] disabled:cursor-not-allowed disabled:opacity-60 ${focusRingClass}`}
        style={{ backgroundColor: navy }}
      >
        <FileCheck2 size={16} aria-hidden="true" />
        {isPending ? 'Inicializando…' : `Inicializar Mês (${periodLabel})`}
      </button>
      {feedback && (
        <p className="m-0 text-xs" role="status" aria-live="polite">
          {feedback}
        </p>
      )}
    </div>
  );
}
