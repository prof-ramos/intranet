'use client';

import type { CSSProperties } from 'react';
import { canvas, dangerText, focusRingClass, hairline, textSubtle } from '@/lib/ui/tokens';
import { summarizeActivities } from './helpers';
import type { BoardActivity } from './types';

export function SummaryStrip({
  activities,
  onLateClick,
}: {
  activities: BoardActivity[];
  onLateClick: () => void;
}) {
  const counts = summarizeActivities(activities);

  const items = [
    { value: counts.total, label: 'total', topColor: '#040920' },
    { value: counts.byStatus.a_fazer, label: 'a fazer', topColor: '#94a3b8' },
    { value: counts.byStatus.em_andamento, label: 'em andamento', topColor: '#76aeea' },
    { value: counts.byStatus.aguardando_terceiros, label: 'aguardando', topColor: '#e7c16b' },
    { value: counts.byStatus.concluido, label: 'concluído', topColor: '#86efac' },
    {
      value: counts.late,
      label: 'atrasadas',
      action: onLateClick,
      danger: counts.late > 0,
      topColor: counts.late > 0 ? '#b91c1c' : '#94a3b8',
    },
  ];

  return (
    <section
      className="mb-4 grid overflow-hidden rounded-[16px] bg-white sm:grid-cols-3 xl:grid-cols-6"
      style={{ border: `1px solid ${hairline}` }}
      aria-label="Resumo de atividades"
    >
      {items.map((item, index) => {
        const content = (
          <>
            <span
              className="font-sans text-3xl leading-none font-bold tabular-nums"
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
              className={`flex flex-col px-5 py-4 text-left hover:bg-[var(--summary-hover-bg)] ${focusRingClass}`}
              style={
                {
                  borderTop: `3px solid ${item.topColor}`,
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
            style={{
              borderTop: `3px solid ${item.topColor}`,
              borderLeft: index === 0 ? 'none' : `1px solid ${hairline}`,
            }}
          >
            {content}
          </div>
        );
      })}
    </section>
  );
}
