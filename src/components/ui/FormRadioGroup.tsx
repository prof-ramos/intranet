import type { ReactNode } from 'react';
import { focusRingClass, hairline, textMuted } from '@/lib/ui/tokens';

interface FormRadioGroupOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface FormRadioGroupProps<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: FormRadioGroupOption<T>[];
  onChange: (value: T) => void;
}

export function FormRadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: FormRadioGroupProps<T>) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold" style={{ color: textMuted }}>
        {legend}
      </legend>
      <div className="mt-2 grid gap-2">
        {options.map((option) => {
          const inputId = `${name}-${option.value}`;
          const checked = value === option.value;

          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-[8px] border px-3 text-sm transition-colors hover:bg-[rgba(4,9,32,0.02)] ${focusRingClass}`}
              style={{ borderColor: hairline }}
            >
              <input
                id={inputId}
                type="radio"
                name={name}
                className="h-4 w-4"
                style={{ accentColor: '#040920' }}
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
