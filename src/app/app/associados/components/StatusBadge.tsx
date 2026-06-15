import { getAssociateStatusLabel } from '@/lib/associates/service';
import { canvas, success, successBg, warning, warningBg, error, errorBg, hairline, textMuted } from '@/lib/ui/tokens';

type StatusBadgeType = 'functional' | 'association' | 'contribution';

interface StatusBadgeProps {
  type: StatusBadgeType;
  value: string | null;
}

function resolveStyles(type: StatusBadgeType, value: string | null) {
  if (!value) {
    return { bg: canvas, color: textMuted, borderColor: hairline, border: true };
  }

  if (type === 'functional') {
    if (value === 'ativo') return { bg: successBg, color: success, border: false };
    if (value === 'aposentado') return { bg: warningBg, color: warning, border: false };
    return { bg: canvas, color: textMuted, borderColor: hairline, border: true };
  }

  if (type === 'association') {
    if (value === 'ativo') return { bg: successBg, color: success, border: false };
    return { bg: canvas, color: textMuted, borderColor: hairline, border: true };
  }

  // contribution
  if (value === 'em_dia') return { bg: successBg, color: success, border: false };
  if (value === 'inadimplente') return { bg: errorBg, color: error, border: false };
  return { bg: canvas, color: textMuted, borderColor: hairline, border: true };
}

export function StatusBadge({ type, value }: StatusBadgeProps) {
  const styles = resolveStyles(type, value);
  const label = getAssociateStatusLabel(value) ?? '—';

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.06em] uppercase ${styles.border ? 'border' : ''}`}
      style={{
        backgroundColor: styles.bg,
        color: styles.color,
        borderColor: 'borderColor' in styles ? styles.borderColor : undefined,
      }}
    >
      {label}
    </span>
  );
}
