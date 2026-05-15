import { hairline, textMuted, textPrimary } from '@/lib/ui/tokens';
import type { DashboardStripeItem } from '@/lib/dashboard/view-model';

interface DashboardIndicatorsProps {
  stripe: DashboardStripeItem[];
}

export function DashboardIndicators({ stripe }: DashboardIndicatorsProps) {
  return (
    <section
      className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
      aria-label="Indicadores"
    >
      {stripe.map((item) => (
        <div
          key={item.id}
          className="min-h-[104px] rounded-[16px] bg-white p-5 shadow-none"
          style={{ border: `1px solid ${hairline}` }}
        >
          <div
            className="text-[11px] leading-tight font-bold tracking-[0.1em] uppercase"
            style={{ color: textMuted }}
          >
            {item.label}
          </div>
          <div
            className="mt-3 font-serif text-[30px] leading-none font-bold"
            style={{ color: textPrimary }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </section>
  );
}
