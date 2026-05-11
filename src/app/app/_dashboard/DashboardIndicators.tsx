import { hairline, textMuted, textPrimary } from '@/lib/ui/tokens';
import type { DashboardStripeItem } from '@/lib/dashboard/view-model';

interface DashboardIndicatorsProps {
  stripe: DashboardStripeItem[];
}

export function DashboardIndicators({ stripe }: DashboardIndicatorsProps) {
  return (
    <section
      className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
      aria-label="Indicadores"
    >
      {stripe.map((item) => (
        <div
          key={item.id}
          className="min-h-[104px] rounded-[10px] bg-white px-4 py-3 shadow-none"
          style={{ border: `1px solid ${hairline}` }}
        >
          <div
            className="text-[10px] font-bold tracking-[0.08em] uppercase"
            style={{ color: textMuted }}
          >
            {item.label}
          </div>
          <div
            className="mt-2 font-serif text-2xl leading-none font-bold"
            style={{ color: textPrimary }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </section>
  );
}
