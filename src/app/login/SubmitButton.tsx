'use client';

import { useFormStatus } from 'react-dom';
import {
  buttonPrimaryBg,
  buttonPrimaryHover,
  mobileTouchTargetClass,
  desktopDenseControlClass,
} from '@/lib/ui/tokens';
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
      className={`${mobileTouchTargetClass} ${desktopDenseControlClass} w-full rounded-[8px] font-semibold text-sm text-white transition-colors disabled:cursor-wait disabled:opacity-80`}
      style={{ backgroundColor: isHovered || pending ? buttonPrimaryHover : buttonPrimaryBg }}
    >
      {pending ? 'Entrando...' : 'Entrar'}
    </button>
  );
}
