import type { ReactNode } from 'react';
import {
  dangerBorder,
  dangerText,
  errorBg,
  successBg,
  successText,
  warningBg,
  warningBorder,
  warningText,
} from '@/lib/ui/tokens';

type InlineAlertVariant = 'error' | 'success' | 'warning';

const variantStyles: Record<
  InlineAlertVariant,
  { border: string; background: string; color: string }
> = {
  error: { border: dangerBorder, background: errorBg, color: dangerText },
  success: { border: successText, background: successBg, color: successText },
  warning: { border: warningBorder, background: warningBg, color: warningText },
};

interface InlineAlertProps {
  variant: InlineAlertVariant;
  children: ReactNode;
}

export function InlineAlert({ variant, children }: InlineAlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      role="alert"
      className="rounded-[8px] border px-4 py-3 text-sm"
      style={{
        borderColor: styles.border,
        backgroundColor: styles.background,
        color: styles.color,
      }}
    >
      {children}
    </div>
  );
}
