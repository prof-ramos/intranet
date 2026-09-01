import type { ReactNode } from 'react';
import {
  dangerBorder,
  dangerText,
  errorBg,
  successBg,
  successText,
  textMuted,
  warningBg,
  warningBorder,
  warningText,
} from '@/lib/ui/tokens';

type AuthAlertVariant = 'error' | 'success' | 'warning';

const variantStyles: Record<
  AuthAlertVariant,
  { border: string; background: string; color: string }
> = {
  error: { border: dangerBorder, background: errorBg, color: dangerText },
  success: { border: successText, background: successBg, color: successText },
  warning: { border: warningBorder, background: warningBg, color: warningText },
};

interface AuthAlertProps {
  variant: AuthAlertVariant;
  children: ReactNode;
}

export function AuthAlert({ variant, children }: AuthAlertProps) {
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

export function AuthHint({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm" style={{ color: textMuted }}>
      {children}
    </p>
  );
}
