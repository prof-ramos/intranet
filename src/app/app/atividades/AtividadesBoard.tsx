'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, ChevronDown, Clock, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { compactActionClass, focusRingClass } from '@/lib/ui/tokens';
import { ActivityCardContent } from './_board/ActivityCard';
import { columns, defaultFilters } from './_board/constants';
import { Drawer } from './_board/Drawer';
import { FilterBar } from './_board/FilterBar';
import { QuickAdd } from './_board/QuickAdd';
import { SummaryStrip } from './_board/SummaryStrip';
import { daysFromToday, filterActivities, groupActivitiesByStatus, normalizeActivity } from './_board/helpers';
import type {
  BoardActivity,
  BoardAssociate,
  BoardPerson,
  Filters,
  PendingReassignment,
  Status,
} from '@/lib/activities/types';

export type { BoardActivity, BoardAssociate, BoardPerson } from '@/lib/activities/types';

const ReassignModal = dynamic(() =>
  import('./ReassignModal').then((mod) => ({ default: mod.ReassignModal })),
);

interface AtividadesBoardProps {
  initialActivities: BoardActivity[];
  people: BoardPerson[];
  associates: BoardAssociate[];
  currentUser: BoardPerson;
}

export function AtividadesBoard({
  initialActivities,
  people,
  associates,
  currentUser,
}: AtividadesBoardProps) {
  const searchParams = useSearchParams();
  const [items, setItems] = useState(() => initialActivities.map(normalizeActivity));
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [compact, setCompact] = useState(false);
  const [collapsedDone, setCollapsedDone] = useState(false);
  const [drawerId, setDrawerId] = useState<number | null>(() => {
    const openId = searchParams.get('open');
    if (openId) {
      const parsed = Number(openId);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return null;
  });

  const [reassignActivity, setReassignActivity] = useState<BoardActivity | null>(null);
  const [pendings, setPendings] = useState<PendingReassignment[]>([]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const pendingByActivity = useMemo(
    () => new Map(pendings.map((pending) => [pending.activityId, pending])),
    [pendings],
  );

  const filtered = useMemo(
    () => filterActivities(items, filters, currentUser.id),
    [currentUser.id, filters, items],
  );

  const grouped = useMemo(() => groupActivitiesByStatus(filtered), [filtered]);

  const drawerActivity = drawerId
    ? (items.find((activity) => activity.id === drawerId) ?? null)
    : null;

  function updateActivity(id: number, patch: Partial<BoardActivity>) {
    setItems((activities) =>
      activities.map((activity) => {
        if (activity.id !== id) return activity;
        const updated = { ...activity, ...patch };
        if ('dueDate' in patch) {
          updated.dueOffset = daysFromToday(updated.dueDate);
        }
        return updated;
      }),
    );
  }

  function handleDrawerChange(
    patch: Partial<BoardActivity> | { acceptReassign: string } | { rejectReassign: string },
  ) {
    if ('acceptReassign' in patch) {
      const pending = pendings.find((item) => item.id === patch.acceptReassign);
      if (pending) {
        updateActivity(pending.activityId, { assigneeId: pending.toUserId });
        setPendings((current) => current.filter((item) => item.id !== patch.acceptReassign));
      }
      return;
    }

    if ('rejectReassign' in patch) {
      setPendings((current) => current.filter((item) => item.id !== patch.rejectReassign));
      return;
    }

    if (!drawerId) return;
    const current = items.find((activity) => activity.id === drawerId);
    const nextPatch = { ...patch };
    if (nextPatch.status === 'concluido' && current?.status !== 'concluido') {
      nextPatch.completedAt = new Date().toISOString().slice(0, 10);
    }
    updateActivity(drawerId, nextPatch);
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const id = Number(result.draggableId);
    const newStatus = result.destination.droppableId as Status;
    if (result.source.droppableId === newStatus) return;
    const current = items.find((a) => a.id === id);
    if (!current) return;
    updateActivity(id, {
      status: newStatus,
      completedAt:
        newStatus === 'concluido'
          ? new Date().toISOString().slice(0, 10)
          : current?.status === 'concluido'
            ? null
            : current?.completedAt ?? null,
    });
  }

  function handleAdd(title: string, status: Status) {
    const id = Math.max(0, ...items.map((activity) => activity.id)) + 1;
    setItems((activities) => [
      ...activities,
      {
        id,
        title,
        status,
        priority: 'normal',
        dueDate: null,
        completedAt: null,
        assigneeId: currentUser.id,
        assigneeName: currentUser.name,
        associateId: null,
        associateName: null,
        tags: [],
        description: null,
        dueOffset: null,
      },
    ]);
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] min-w-0 px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[rgba(13,31,60,0.55)] m-0 text-[11px] tracking-[0.18em] whitespace-nowrap uppercase">
            Operação · Quadro de atividades
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-5xl">
            Atividades
          </h1>
        </div>
        <Link
          href="/app/atividades/nova"
          className={`inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-5 h-11 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] lg:h-10 lg:min-h-10 ${focusRingClass}`}
        >
          <Plus size={16} aria-hidden="true" />
          Nova atividade
        </Link>
      </div>

      <SummaryStrip
        activities={items}
        onLateClick={() => setFilters({ ...filters, dueLate: true, dueWeek: false })}
      />

      <FilterBar
        filters={filters}
        people={people}
        associates={associates}
        compact={compact}
        setCompact={setCompact}
        setFilters={setFilters}
      />

      {items.length === 0 && (
        <div className="rounded-[16px] border-[rgba(4,9,32,0.05)] text-[rgba(13,31,60,0.60)] mb-5 border border-dashed bg-white px-5 py-4 text-sm">
          Nenhuma atividade cadastrada ainda. Use o botão <strong>Nova atividade</strong> ou o
          quick-add das colunas para montar o quadro.
        </div>
      )}

      <div className="relative">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3 xl:grid-cols-4"
            style={{ scrollbarWidth: 'thin' as const }}
          >
            {columns.map((col) => {
              const colItems = grouped[col.key];
              const isCollapsed = col.key === 'concluido' && collapsedDone;
              return (
                <div
                  key={col.key}
                  className="snap-start min-w-[280px] md:min-w-0"
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
                        style={{ color: '#0d1f3c', fontFamily: "'Google Sans', system-ui, sans-serif" }}
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
                        className="flex min-w-0 flex-col"
                      >
                        {!isCollapsed &&
                          colItems.map((activity, index) => (
                            <Draggable
                              key={activity.id}
                              draggableId={String(activity.id)}
                              index={index}
                            >
                              {(dragProvided) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={{ marginBottom: 8, ...dragProvided.draggableProps.style }}
                                  onClick={() => setDrawerId(activity.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setDrawerId(activity.id);
                                    }
                                  }}
                                >
                                  <ActivityCardContent
                                    activity={activity}
                                    peopleById={peopleById}
                                    compact={compact}
                                    hasPending={pendingByActivity.has(activity.id)}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                  {col.key !== 'concluido' && (
                    <QuickAdd columnKey={col.key} onAdd={handleAdd} />
                  )}
                </div>
              );
            })}
          </div>
        </DragDropContext>
        <div className="pointer-events-none absolute top-0 right-0 bottom-4 w-10 bg-gradient-to-l from-[#f8fafc] to-transparent md:hidden" />
      </div>

      <div className="text-[rgba(13,31,60,0.55)] mt-5 flex items-center gap-2 text-xs">
        <Clock size={14} aria-hidden="true" />
        Reatribuições aparecem como pendentes até o destinatário aceitar.
        <ArrowRight size={14} aria-hidden="true" />
      </div>

      <Drawer
        activity={drawerActivity}
        people={people}
        peopleById={peopleById}
        pending={
          drawerActivity && pendingByActivity.get(drawerActivity.id)?.toUserId === currentUser.id
            ? pendingByActivity.get(drawerActivity.id)
            : undefined
        }
        onClose={() => setDrawerId(null)}
        onChange={handleDrawerChange}
        onRequestReassign={() => {
          if (drawerActivity) setReassignActivity(drawerActivity);
        }}
      />

      {reassignActivity && (
        <ReassignModal
          activity={reassignActivity}
          people={people}
          onClose={() => setReassignActivity(null)}
          onSubmit={(toUserId, message) => {
            setPendings((current) => [
              ...current,
              {
                id: `pending-${Date.now()}`,
                activityId: reassignActivity.id,
                fromUserId: currentUser.id,
                toUserId,
                message,
              },
            ]);
            setReassignActivity(null);
          }}
        />
      )}
    </main>
  );
}
