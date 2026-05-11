'use client';

import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { canvas, dangerText, hairline, textSubtle } from '@/lib/ui/tokens';
import type { BoardActivity, Status } from './types';

export function SummaryStrip({
  activities,
  onLateClick,
}: {
  activities: BoardActivity[];
  onLateClick: () => void;
}) {
  const counts = useMemo(() => {
    const byStatus: Record<Status, number> = {
      a_fazer: 0,
      em_andamento: 0,
      aguardando_terceiros: 0,
      concluido: 0,
    };
    let late = 0;

    for (const activity of activities) {
      byStatus[activity.status] += 1;
      const offset = activity.dueOffset;
      if (offset !== null && offset < 0 && activity.status !== 'concluido') late += 1;
    }

    return { byStatus, late, total: activities.length };
  }, [activities]);

  const items = [
    { value: counts.total, label: 'total' },
    { value: counts.byStatus.a_fazer, label: 'a fazer' },
    { value: counts.byStatus.em_andamento, label: 'em andamento' },
    { value: counts.byStatus.aguardando_terceiros, label: 'aguardando' },
    { value: counts.byStatus.concluido, label: 'concluído' },
    { value: counts.late, label: 'atrasadas', action: onLateClick, danger: counts.late > 0 },
  ];

  return (
    <section
      className="rounded-[16px] mb-4 grid overflow-hidden bg-white sm:grid-cols-3 xl:grid-cols-6"
      style={{ border: `1px solid ${hairline}` }}
      aria-label="Resumo de atividades"
    >
      {items.map((item, index) => {
        const content = (
          <>
            <span
              className="font-serif text-3xl leading-none font-bold"
              style={{ color: item.danger ? dangerText : undefined }}
            >
              {item.value}
            </span>
            <span
              className="mt-1 text-[11px] font-semibold tracking-[0.08em] uppercase"
              style={{ color: textSubtle }}
            >
              {item.label}
            </span>
          </>
        );

        if (item.action) {
          return (
            <button
              type="button"
              key={item.label}
              onClick={item.action}
              className="hover:bg-[var(--summary-hover-bg)] flex flex-col px-5 py-4 text-left"
              style={
                {
                  borderLeft: index === 0 ? 'none' : `1px solid ${hairline}`,
                  '--summary-hover-bg': canvas,
                } as CSSProperties
              }
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={item.label}
            className="flex flex-col px-5 py-4"
            style={{ borderLeft: index === 0 ? 'none' : `1px solid ${hairline}` }}
          >
            {content}
          </div>
        );
      })}
    </section>
  );
}
