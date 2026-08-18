import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  borderFaint,
  borderSubtle,
  focusRingClass,
  hairline,
  iconMuted,
  linkText,
  priorityStyles,
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
      className="min-w-0 rounded-[16px] bg-white p-5 sm:p-6"
      style={{ border: `1px solid ${hairline}` }}
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl leading-tight font-bold">Atividades em curso</h2>
        <Link
          href="/app/atividades"
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-[8px] px-2 text-sm font-semibold hover:underline lg:min-h-8 ${focusRingClass}`}
          style={{ color: linkText }}
        >
          Abrir kanban <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {statusColumns.map((column) => (
          <article
            key={column.status}
            className="min-w-0 rounded-[16px] p-3"
            style={{ backgroundColor: surfaceMuted }}
          >
              <div className="mb-3 flex min-h-8 items-center justify-between gap-3 px-1">
              <Link
                href={`/app/atividades?status=${encodeURIComponent(column.status)}`}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-[6px] px-1 py-1 hover:underline ${focusRingClass}`}
                aria-label={`Abrir atividades com status ${column.label}`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: column.accent }}
                  aria-hidden="true"
                />
                <p className="truncate text-[11px] leading-tight font-bold tracking-[0.06em] uppercase">
                  {column.label}
                </p>
              </Link>
              <Link
                href={`/app/atividades?status=${encodeURIComponent(column.status)}`}
                className={`rounded-[6px] px-1 py-1 text-xs font-semibold hover:underline ${focusRingClass}`}
                aria-label={`${column.total} atividades com status ${column.label}`}
              >
                {column.total}
              </Link>
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
                    <Link
                      key={card.id}
                      href={`/app/atividades?status=${encodeURIComponent(column.status)}&open=${card.id}`}
                      className={`block rounded-[8px] bg-white p-3 shadow-[0_1px_0_rgba(4,9,32,0.04)] hover:bg-[rgba(4,9,32,0.02)] ${focusRingClass}`}
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
                      <div className="mt-3 flex items-center justify-between gap-2">
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
                    </Link>
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
