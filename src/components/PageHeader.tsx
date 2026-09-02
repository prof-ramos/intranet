import Link from 'next/link';
import type { ReactNode } from 'react';
import { focusRingClass, textMuted } from '@/lib/ui/tokens';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel = 'Voltar',
}: PageHeaderProps) {
  return (
    <div className="mb-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className={`mb-3 inline-flex text-sm font-semibold hover:underline ${focusRingClass}`}
            style={{ color: textMuted }}
          >
            ← {backLabel}
          </Link>
        ) : null}
        {eyebrow ? (
          <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textMuted }}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 font-serif text-4xl leading-none font-bold text-[#040920] md:text-[3rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm" style={{ color: textMuted }}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
