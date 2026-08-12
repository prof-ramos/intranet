import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import {
  dangerText,
  desktopDenseControlClass,
  focusRingClass,
  hairline,
  linkText,
  priorityStyles,
  surfaceMuted,
  textMuted,
  textSubtle,
} from '@/lib/ui/tokens';
import { formatDashboardDueDate, type DashboardUrgentActivity } from '@/lib/dashboard/view-model';

interface DashboardDispatchStripProps {
  urgentActivities: DashboardUrgentActivity[];
}

export function DashboardDispatchStrip({ urgentActivities }: DashboardDispatchStripProps) {
  return (
    <section
      className="mb-7 rounded-[16px] bg-white p-5 sm:p-6"
      style={{ border: `1px solid ${hairline}`, borderTop: `3px solid ${dangerText}` }}
      aria-labelledby="dispatch-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} style={{ color: dangerText }} aria-hidden="true" />
          <div>
            <p
              className="text-[11px] font-bold tracking-[0.1em] uppercase"
              style={{ color: dangerText }}
            >
              Despacho do dia
            </p>
            <h2 id="dispatch-heading" className="mt-1 font-serif text-xl leading-tight font-bold">
              Pendências vencidas
            </h2>
          </div>
        </div>
        <Link
          href="/app/atividades?dueLate=1"
          className={`inline-flex items-center gap-1.5 rounded-[8px] px-2 text-sm font-semibold hover:underline ${desktopDenseControlClass} ${focusRingClass}`}
          style={{ color: linkText }}
        >
          Ver atrasadas <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {urgentActivities.length === 0 ? (
        <p className="mt-5 text-sm" style={{ color: textSubtle }}>
          Nenhuma atividade vencida no momento.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {urgentActivities.map((activity) => {
            const dueDate = formatDashboardDueDate(activity.dueDate);
            const priority = priorityStyles[activity.priority] ?? priorityStyles.normal;

            return (
              <li key={activity.id}>
                <Link
                  href={`/app/atividades?dueLate=1&open=${activity.id}`}
                  className={`block rounded-[10px] p-4 transition-colors hover:bg-[rgba(4,9,32,0.02)] ${focusRingClass}`}
                  style={{ backgroundColor: surfaceMuted, border: `1px solid ${hairline}` }}
                >
                  <p className="text-sm leading-snug font-semibold [overflow-wrap:anywhere]">
                    {activity.title}
                  </p>
                  <div
                    className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs"
                    style={{ color: textMuted }}
                  >
                    <span style={{ color: priority.fg }}>
                      {priority.label ?? activity.priority}
                    </span>
                    <span>Responsável: {activity.assigneeName ?? 'Sem responsável'}</span>
                    {dueDate && <span>Venceu em {dueDate}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
