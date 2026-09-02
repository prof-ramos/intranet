import type { InputHTMLAttributes } from 'react';
import { focusRingClass, hairline, textMuted } from '@/lib/ui/tokens';

interface FormNumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormNumberInput({ label, className = '', id, ...props }: FormNumberInputProps) {
  return (
    <label className="block" htmlFor={id}>
      <span
        className="text-[10px] font-bold tracking-[0.1em] uppercase"
        style={{ color: textMuted }}
      >
        {label}
      </span>
      <input
        id={id}
        type="number"
        className={`mt-1 h-10 w-full rounded-[8px] border bg-white px-3 text-sm ${focusRingClass} ${className}`}
        style={{ borderColor: hairline }}
        {...props}
      />
    </label>
  );
}
