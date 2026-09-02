import type { SelectHTMLAttributes } from 'react';
import { focusRingClass, hairline, textMuted } from '@/lib/ui/tokens';

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
}

export function FormSelect({
  label,
  hint,
  className = '',
  id,
  children,
  ...props
}: FormSelectProps) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-semibold" style={{ color: textMuted }}>
        {label}
      </span>
      <select
        id={id}
        className={`mt-2 h-10 w-full rounded-[8px] border bg-white px-3 text-sm ${focusRingClass} ${className}`}
        style={{ borderColor: hairline }}
        {...props}
      >
        {children}
      </select>
      {hint ? (
        <span className="mt-1 block text-xs" style={{ color: textMuted }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
