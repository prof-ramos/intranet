import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { hairline } from '@/lib/ui/tokens';
import type { getAssociateProfile } from '@/lib/associates/service';

export type AssociateProfile = NonNullable<Awaited<ReturnType<typeof getAssociateProfile>>>;

export type ProfileSectionProps = {
  profile: AssociateProfile;
  id: string;
};

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const colors = {
    neutral: ['rgba(13,31,60,0.70)', '#f8fafc'],
    success: ['#15803d', '#dcfce7'],
    warning: ['#a16207', '#f4ddb1'],
    danger: ['#b91c1c', '#fee2e2'],
  } as const;
  const [color, background] = colors[tone];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] uppercase"
      style={{ color, background }}
    >
      {children}
    </span>
  );
}

export function ProfileRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      className="grid gap-2 border-b border-[rgba(4,9,32,0.05)] py-2.5 sm:grid-cols-[180px_1fr]"
      style={{ borderColor: hairline }}
    >
      <dt className="text-base-content/55 text-[12px] font-semibold tracking-[0.06em] uppercase">
        {label}
      </dt>
      <dd className={['text-base-content m-0 text-sm', mono ? 'font-mono' : ''].join(' ')}>
        {value || <span className="text-base-content/40">-</span>}
      </dd>
    </div>
  );
}

export function ProfileSectionCard({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-8 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-5 sm:p-7"
    >
      <header className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-serif text-[22px] leading-tight font-bold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function ProfileEditLink({
  href,
  children = 'Editar',
}: {
  href: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] focus-visible:ring-2 focus-visible:ring-[#76aeea] focus-visible:ring-offset-1 focus-visible:outline-none lg:h-8"
    >
      <Pencil size={13} aria-hidden="true" />
      {children}
    </Link>
  );
}

export function BooleanIcon({ value }: { value: boolean | null }) {
  if (value === null || value === undefined) {
    return <span className="text-base-content/40">-</span>;
  }

  return value ? (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dcfce7] text-[#15803d]">
      ✓
    </span>
  ) : (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#f1f5f9] text-[rgba(13,31,60,0.40)]">
      ✗
    </span>
  );
}
