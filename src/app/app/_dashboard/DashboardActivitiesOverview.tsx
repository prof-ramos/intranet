import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  borderFaint,
  borderSubtle,
  hairline,
  iconMuted,
  priorityStyles,
  skyBlue,
  surfaceMuted,
  textMuted,
  textSecondary,
} from '@/lib/ui/tokens';
import { formatDashboardDueDate, type DashboardStatusColumn } from '@/lib/dashboard/view-model';

interface DashboardActivitiesOverviewProps {
  statusColumns: DashboardStatusColumn[];
}

export function DashboardActivitiesOverview({ statusColumns }: DashboardActivitiesOverviewProps) {
  return (
    <div
      className="min-w-0 rounded-[10px] bg-white p-4 sm:p-5"
      style={{ border: `1px solid ${hairline}` }}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl font-bold">Atividades em curso</h2>
        <Link
          href="/app/atividades"
          className="inline-flex items-center gap-1 text-sm font-semibold"
          style={{ color: skyBlue }}
        >
          Abrir kanban <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {statusColumns.map((column) => (
          <article
            key={column.status}
            className="min-w-0 rounded-[10px] p-3"
            style={{ backgroundColor: surfaceMuted }}
          >
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: column.accent }}
                  aria-hidden="true"
                />
                <p className="truncate text-[11px] font-bold tracking-[0.06em] uppercase">
                  {column.label}
                </p>
              </div>
              <span className="text-xs font-semibold" style={{ color: textMuted }}>
                {column.total}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {column.cards.length === 0 ? (
                <div
                  className="rounded-[8px] border border-dashed bg-white px-3 py-4 text-center text-xs"
                  style={{ color: iconMuted, borderColor: borderSubtle }}
                >
                  Sem cards
                </div>
              ) : (
                column.cards.map((card) => {
                  const dueDate = formatDashboardDueDate(card.dueDate);
                  const priorityStyle = priorityStyles[card.priority] ?? priorityStyles.normal;
                  return (
                    <div
                      key={card.id}
                      className="rounded-[8px] bg-white p-3 shadow-[0_1px_0_rgba(4,9,32,0.04)]"
                      style={{ border: `1px solid ${hairline}` }}
                    >
                      <p className="text-sm leading-snug font-semibold [overflow-wrap:anywhere]">
                        {card.title}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className="text-[10px] font-bold tracking-[0.08em] uppercase"
                          style={{ color: priorityStyle.fg }}
                        >
                          {priorityStyle.label ?? card.priority}
                        </span>
                        {dueDate && (
                          <span className="text-[10px]" style={{ color: textMuted }}>
                            · vence {dueDate}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span
                          className="max-w-full truncate rounded-full border px-2 py-1 text-[10px] font-semibold"
                          style={{
                            backgroundColor: surfaceMuted,
                            borderColor: borderFaint,
                            color: textSecondary,
                          }}
                        >
                          {card.associateLabel ?? 'Sem associado'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
