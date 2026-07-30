import Link from 'next/link';
import { dangerText, hairline, skyBlue, textMuted, textPrimary } from '@/lib/ui/tokens';
import type { DashboardStripeItem } from '@/lib/dashboard/view-model';

interface DashboardIndicatorsProps {
  stripe: DashboardStripeItem[];
  inadimplentesCount: number;
}

function StripeCard({ item }: { item: DashboardStripeItem }) {
  return (
    <Link
      href={item.href}
      className="block min-h-[104px] rounded-[16px] bg-white p-5 shadow-none transition-colors hover:bg-[rgba(4,9,32,0.02)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2"
      style={{ border: `1px solid ${hairline}`, borderTop: `3px solid ${skyBlue}` }}
    >
      {item.segments ? (
        <div className="grid h-full grid-cols-2 divide-x" style={{ borderColor: hairline }}>
          {item.segments.map((segment) => (
            <div
              key={segment.id}
              className="flex min-w-0 flex-col justify-between pr-4 pl-4 first:pl-0 last:pr-0"
            >
              <div
                className="text-[10px] leading-tight font-bold tracking-[0.1em] uppercase"
                style={{ color: textMuted }}
              >
                {segment.label}
              </div>
              <div
                className="mt-3 font-sans text-[30px] leading-none font-bold tabular-nums"
                style={{ color: textPrimary }}
              >
                {segment.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div
            className="text-[11px] leading-tight font-bold tracking-[0.1em] uppercase"
            style={{ color: textMuted }}
          >
            {item.label}
          </div>
          <div
            className="mt-3 font-sans text-[30px] leading-none font-bold tabular-nums"
            style={{ color: item.tone === 'neg' ? dangerText : textPrimary }}
          >
            {item.value}
          </div>
        </>
      )}
    </Link>
  );
}

export function DashboardIndicators({ stripe, inadimplentesCount }: DashboardIndicatorsProps) {
  const inadimplentesItem: DashboardStripeItem = {
    id: 'inadimplentes',
    value: String(inadimplentesCount),
    label: 'Inadimplentes',
    href: '/app/associados?contributionStatus=inadimplente',
    tone: inadimplentesCount > 0 ? 'neg' : undefined,
  };

  return (
    <section
      className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
      aria-label="Indicadores"
    >
      {stripe.map((item) => (
        <StripeCard key={item.id} item={item} />
      ))}
      <StripeCard item={inadimplentesItem} />
    </section>
  );
}
