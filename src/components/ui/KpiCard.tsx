import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  dangerText,
  focusRingClass,
  hairline,
  skyBlue,
  success,
  textMuted,
  textPrimary,
  warning,
} from '@/lib/ui/tokens';

type KpiTone = 'neutral' | 'warn' | 'neg' | 'pos';

const toneAccent: Record<KpiTone, string> = {
  neutral: skyBlue,
  warn: warning,
  neg: dangerText,
  pos: success,
};

const toneValueColor: Record<KpiTone, string> = {
  neutral: textPrimary,
  warn: warning,
  neg: dangerText,
  pos: success,
};

interface KpiCardProps {
  label: string;
  value: string | number;
  tone?: KpiTone;
  href?: string;
}

export function KpiCard({ label, value, tone = 'neutral', href }: KpiCardProps) {
  const content = (
    <>
      <div
        className="text-[10px] leading-tight font-bold tracking-[0.1em] uppercase"
        style={{ color: textMuted }}
      >
        {label}
      </div>
      <div
        className="mt-3 font-sans text-[30px] leading-none font-bold tabular-nums"
        style={{ color: toneValueColor[tone] }}
      >
        {value}
      </div>
    </>
  );

  const className = `block min-h-[104px] rounded-[16px] bg-white p-5 shadow-none transition-colors hover:bg-[rgba(4,9,32,0.02)] ${focusRingClass}`;
  const style = { border: `1px solid ${hairline}`, borderTop: `3px solid ${toneAccent[tone]}` };

  if (href) {
    return (
      <Link href={href} className={className} style={style} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <div
      className={className.replace('hover:bg-[rgba(4,9,32,0.02)]', '')}
      style={style}
      aria-label={label}
    >
      {content}
    </div>
  );
}

export function KpiCardGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section
      className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
      aria-label={label}
    >
      {children}
    </section>
  );
}
