import type { InputHTMLAttributes, ReactNode } from 'react';
import { focusRingClass, hairline } from '@/lib/ui/tokens';

interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
}

export function FormCheckbox({ label, className = '', id, ...props }: FormCheckboxProps) {
  return (
    <label htmlFor={id} className={`flex items-center gap-2 text-sm ${className}`}>
      <input
        id={id}
        type="checkbox"
        className={`h-4 w-4 rounded-[4px] border ${focusRingClass}`}
        style={{ borderColor: hairline, accentColor: '#040920' }}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
