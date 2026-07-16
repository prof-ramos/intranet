import { ChevronDown } from 'lucide-react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { compactActionClass, focusRingClass } from '@/lib/ui/tokens';
import { ActivityCardContent } from './ActivityCard';
import { QuickAdd } from './QuickAdd';
import type { BoardActivity, BoardPerson, Status } from './types';
import type { columns } from './constants';

interface BoardColumnProps {
  col: (typeof columns)[number];
  colItems: BoardActivity[];
  isCollapsed: boolean;
  compact: boolean;
  collapsedDone: boolean;
  peopleById: Map<number, BoardPerson>;
  setCollapsedDone: React.Dispatch<React.SetStateAction<boolean>>;
  openDrawer: (id: number) => void;
  handleAdd: (title: string, status: Status) => void;
}

export function BoardColumn({
  col,
  colItems,
  isCollapsed,
  compact,
  collapsedDone,
  peopleById,
  setCollapsedDone,
  openDrawer,
  handleAdd,
}: BoardColumnProps) {
  return (
    <div
      className="min-w-[280px] snap-start md:min-w-0"
      style={{
        background: '#eef1f6',
        borderRadius: 16,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <header className="flex items-center justify-between gap-2 px-1 pt-1 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="shrink-0 rounded-[2px]"
            style={{ width: 8, height: 8, background: col.accent }}
            aria-hidden="true"
          />
          <h2
            className="truncate text-[11px] font-bold tracking-[0.1em] uppercase"
            style={{
              color: '#0d1f3c',
              fontFamily: "'Google Sans', system-ui, sans-serif",
            }}
          >
            {col.title}
          </h2>
          <span
            className="shrink-0 rounded-full px-1.5 text-[11px] font-semibold"
            style={{ color: '#59677a', background: 'rgba(4,9,32,0.06)' }}
          >
            {colItems.length}
          </span>
        </div>
        {col.key === 'concluido' && (
          <button
            type="button"
            onClick={() => setCollapsedDone((current) => !current)}
            className={[
              'grid place-items-center rounded hover:bg-white',
              compactActionClass,
              focusRingClass,
            ].join(' ')}
            aria-label={collapsedDone ? 'Expandir concluídas' : 'Recolher concluídas'}
          >
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={collapsedDone ? '-rotate-90 transition-transform' : 'transition-transform'}
              style={{ color: '#59677a' }}
            />
          </button>
        )}
      </header>
      <Droppable droppableId={col.key}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            role="list"
            className="flex min-w-0 flex-col"
          >
            {!isCollapsed &&
              colItems.map((activity, index) => (
                <Draggable key={activity.id} draggableId={String(activity.id)} index={index}>
                  {(dragProvided) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      role="listitem"
                      aria-roledescription="atividade arrastável"
                      aria-label={activity.title}
                      style={{ marginBottom: 8, ...dragProvided.draggableProps.style }}
                      onClick={() => openDrawer(activity.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDrawer(activity.id);
                        }
                      }}
                    >
                      <ActivityCardContent
                        activity={activity}
                        peopleById={peopleById}
                        compact={compact}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      {col.key !== 'concluido' && <QuickAdd columnKey={col.key} onAdd={handleAdd} />}
    </div>
  );
}
