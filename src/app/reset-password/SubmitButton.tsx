'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { focusRingClass } from '@/lib/ui/tokens';

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] disabled:cursor-wait disabled:opacity-80 ${focusRingClass}`}
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Redefinindo...
        </>
      ) : (
        'Redefinir senha'
      )}
    </button>
  );
}