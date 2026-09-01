import type { InputHTMLAttributes, ReactNode } from 'react';
import { focusRingClass, hairline, mobileTouchTargetClass, textMuted } from '@/lib/ui/tokens';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  labelAction?: ReactNode;
}

export function AuthField({
  label,
  labelAction,
  className = '',
  id,
  ...inputProps
}: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[11px] font-semibold tracking-[0.06em] uppercase"
          style={{ color: textMuted }}
        >
          {label}
        </label>
        {labelAction}
      </div>
      <input
        id={id}
        className={`${mobileTouchTargetClass} w-full rounded-[8px] border px-3 text-sm ${focusRingClass} ${className}`}
        style={{ borderColor: hairline }}
        {...inputProps}
      />
    </div>
  );
}
