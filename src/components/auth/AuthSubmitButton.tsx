'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import {
  buttonPrimaryBg,
  buttonPrimaryHover,
  desktopDenseControlClass,
  focusRingClass,
  mobileTouchTargetClass,
} from '@/lib/ui/tokens';

interface AuthSubmitButtonProps {
  label: string;
  pendingLabel: string;
}

export function AuthSubmitButton({ label, pendingLabel }: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${mobileTouchTargetClass} ${desktopDenseControlClass} flex w-full items-center justify-center gap-2 rounded-[8px] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] disabled:cursor-wait disabled:opacity-80 ${focusRingClass}`}
      style={{ backgroundColor: pending ? buttonPrimaryHover : buttonPrimaryBg }}
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
