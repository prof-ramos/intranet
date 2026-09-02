import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  buttonOutlineBorder,
  focusRingClass,
  mobileTouchTargetClass,
  textPrimary,
} from '@/lib/ui/tokens';

interface AuthOutlineButtonProps {
  href: string;
  children: ReactNode;
}

export function AuthOutlineButton({ href, children }: AuthOutlineButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex ${mobileTouchTargetClass} w-full items-center justify-center rounded-[8px] border bg-white px-5 text-sm font-semibold transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
      style={{ borderColor: buttonOutlineBorder, color: textPrimary }}
    >
      {children}
    </Link>
  );
}
