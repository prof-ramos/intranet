import type { ButtonHTMLAttributes, ReactNode } from 'react';
import {
  buttonPrimaryBg,
  buttonPrimaryHover,
  desktopDenseControlClass,
  focusRingClass,
  mobileTouchTargetClass,
} from '@/lib/ui/tokens';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  pending?: boolean;
  pendingLabel?: string;
}

export function PrimaryButton({
  children,
  pending = false,
  pendingLabel,
  className = '',
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${mobileTouchTargetClass} ${desktopDenseControlClass} inline-flex items-center justify-center rounded-[8px] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] disabled:cursor-wait disabled:opacity-80 ${focusRingClass} ${className}`}
      style={{ backgroundColor: pending ? buttonPrimaryHover : buttonPrimaryBg }}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
