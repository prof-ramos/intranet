'use client';

import { type CSSProperties, memo } from 'react';
import { AlertTriangle, Calendar, Check } from 'lucide-react';
import {
  borderMuted,
  borderSoft,
  buttonOutlineHoverBg,
  buttonPrimaryText,
  canvas,
  dangerText,
  hairline,
  navy,
  priorityStyles,
  slateText,
  successText,
  textStrong,
  warningText,
} from '@/lib/ui/tokens';
import { formatDueDate, initials } from './helpers';
import type { BoardActivity, BoardPerson } from './types';

// Memoized to prevent re-renders of identical avatars when board items are dragged
export const Avatar = memo(function Avatar({
  person,
  compact = false,
}: {
  person?: BoardPerson;
  compact?: boolean;
}) {
  if (!person)
    return (
      <span
        className="h-5 w-5 shrink-0 rounded-full"
        style={{ background: borderMuted }}
        aria-hidden="true"
      />
    );

  return (
    <span
      aria-label={person.name}
      role="img"
      className={`grid shrink-0 place-items-center rounded-full ${
        compact ? 'h-5 w-5 text-[8px]' : 'h-6 w-6 text-[9px]'
      }`}
      style={{ background: navy, color: buttonPrimaryText }}
    >
      {initials(person.name)}
    </span>
  );
});

// Memoized to drastically reduce re-renders when dragging items across the board
// since only the moving item needs to re-render, not the entire list.
export const ActivityCardContent = memo(function ActivityCardContent({
  activity,
  peopleById,
  compact,
}: {
  activity: BoardActivity;
  peopleById: Map<number, BoardPerson>;
  compact: boolean;
}) {
  const dueOffset = activity.dueOffset;
  const isLate = dueOffset !== null && dueOffset < 0 && activity.status !== 'concluido';
  const isUrgent = dueOffset === 0 && activity.status !== 'concluido';
  const isSoon =
    dueOffset !== null && dueOffset > 0 && dueOffset <= 3 && activity.status !== 'concluido';
  const priority = priorityStyles[activity.priority] ?? priorityStyles.normal;

  return (
    <div
      className={`relative flex cursor-pointer flex-col rounded-[8px] bg-white transition-colors hover:bg-[var(--card-hover-bg)] ${
        compact ? 'gap-2 p-3' : 'gap-2.5 p-3.5'
      }`}
      style={
        {
          border: `1px solid ${hairline}`,
          borderLeft:
            activity.status === 'concluido' ? '3px solid #94a3b8' : `3px solid ${priority.fg}`,
          '--card-hover-bg': buttonOutlineHoverBg,
        } as CSSProperties
      }
    >
      <p
        className={`m-0 text-left leading-snug font-semibold [overflow-wrap:anywhere] ${
          compact ? 'text-[13px]' : 'text-sm'
        }`}
        style={{
          color: activity.status === 'concluido' ? slateText : textStrong,
          ...(activity.status === 'concluido'
            ? { textDecoration: 'line-through', textDecorationColor: 'rgba(89,103,122,0.35)' }
            : {}),
        }}
      >
        {activity.title}
      </p>

      {!compact && activity.associateName && (
        <p className="m-0 text-[11px]" style={{ color: slateText }}>
          &#x21B3; {activity.associateName}
        </p>
      )}

      {!compact && activity.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activity.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
              style={{ color: slateText, borderColor: borderSoft, background: canvas }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div
        className="mt-1 flex items-center justify-between gap-2 border-t pt-2"
        style={{ borderColor: hairline }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {activity.priority !== 'normal' && activity.status !== 'concluido' && (
            <span
              className="inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold tracking-[0.08em] uppercase"
              style={{ color: priority.fg, background: priority.bg }}
            >
              {priority.label}
            </span>
          )}
          {activity.dueDate && !activity.completedAt && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium"
              style={{ color: isLate || isUrgent ? dangerText : isSoon ? warningText : slateText }}
            >
              {isUrgent ? (
                <AlertTriangle
                  size={14}
                  className="motion-safe:animate-pulse"
                  style={{ color: dangerText }}
                  aria-label="Vence hoje"
                />
              ) : (
                <Calendar size={14} aria-hidden="true" />
              )}
              {formatDueDate(activity.dueDate)}
            </span>
          )}
          {activity.completedAt && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: successText }}
            >
              <Check size={14} aria-hidden="true" />
              {formatDueDate(activity.completedAt)}
            </span>
          )}
        </div>
        <Avatar
          person={activity.assigneeId ? peopleById.get(activity.assigneeId) : undefined}
          compact={compact}
        />
      </div>
    </div>
  );
});
