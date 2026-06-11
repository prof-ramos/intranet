'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { buttonPrimaryBg, buttonPrimaryHover, mobileTouchTargetClass } from '@/lib/ui/tokens';
import { useState } from 'react';

export function SubmitButton() {
  const { pending } = useFormStatus();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`inline-flex ${mobileTouchTargetClass} w-full items-center justify-center gap-2 rounded-[8px] px-5 text-sm font-semibold text-white transition-colors disabled:cursor-wait disabled:opacity-80`}
      style={{ backgroundColor: isHovered || pending ? buttonPrimaryHover : buttonPrimaryBg }}
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Enviando...
        </>
      ) : (
        'Enviar link de redefinição'
      )}
    </button>
  );
}
