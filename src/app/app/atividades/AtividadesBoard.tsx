'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, Clock, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { focusRingClass } from '@/lib/ui/tokens';
import {
  createQuickActivityAction,
  getActivityTimelineAction,
  updateActivityAction,
} from './actions';
import { columns } from './_board/constants';
import { Drawer } from './_board/Drawer';
import { FilterBar } from './_board/FilterBar';
import { BoardColumn } from './_board/BoardColumn';
import { SummaryStrip } from './_board/SummaryStrip';
import {
  daysFromToday,
  deriveCompletedAt,
  filterActivities,
  groupActivitiesByStatus,
  normalizeActivity,
} from './_board/helpers';
import {
  buildBoardUrl,
  hasOpenActivity,
  parseFiltersFromUrl,
  parseOpenActivityId,
} from './_board/url-state';
import { useBoardPreferences } from './_board/useBoardPreferences';
import { parsePositiveIntParam } from '@/lib/routing/params';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import type {
  ActivityTimelineItem,
  BoardActivity,
  BoardAssociate,
  BoardPerson,
  Filters,
  Status,
} from '@/lib/activities/types';

const logger = createLogger('atividades-board');

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openFromUrl = parseOpenActivityId(searchParams);
  const [items, setItems] = useState(() => initialActivities.map(normalizeActivity));
  const [filters, setFilters] = useState<Filters>(() => parseFiltersFromUrl(searchParams));
  const { compact, collapsedDone, setCompact, setCollapsedDone } = useBoardPreferences();
  const [isPersisting, startPersistTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const drawerId = openFromUrl;

  const [reassignActivity, setReassignActivity] = useState<BoardActivity | null>(null);
  const [drawerTimeline, setDrawerTimeline] = useState<ActivityTimelineItem[]>([]);
  const [loadedDrawerTimelineId, setLoadedDrawerTimelineId] = useState<number | null>(null);
  const [drawerTimelineError, setDrawerTimelineError] = useState<string | null>(null);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

  const filtered = useMemo(
    () => filterActivities(items, filters, currentUser.id),
    [currentUser.id, filters, items],
  );

  const grouped = useMemo(() => groupActivitiesByStatus(filtered), [filtered]);

  const drawerActivity = drawerId
    ? (items.find((activity) => activity.id === drawerId) ?? null)
    : null;
  const drawerTimelineLoading =
    drawerId !== null &&
    drawerActivity !== null &&
    loadedDrawerTimelineId !== drawerId &&
    !drawerTimelineError;

  const syncDrawerUrl = useCallback(
    (nextDrawerId: number | null) => {
      router.replace(buildBoardUrl(pathname, searchParams, nextDrawerId, filters), {
        scroll: false,
      });
    },
    [filters, pathname, router, searchParams],
  );

  useEffect(() => {
    const url = buildBoardUrl(pathname, new URLSearchParams(), null, filters);
    router.replace(url, { scroll: false });
  }, [filters, pathname, router]);

  async function loadDrawerTimeline(activityId: number) {
    try {
      const timeline = await getActivityTimelineAction(activityId);
      setDrawerTimeline(timeline);
      setLoadedDrawerTimelineId(activityId);
      setDrawerTimelineError(null);
    } catch (err) {
      logger.error('Failed to load drawer timeline', { activityId, error: toSafeErrorLog(err) });
      setDrawerTimeline([]);
      setLoadedDrawerTimelineId(activityId);
      setDrawerTimelineError('Não foi possível carregar o histórico desta atividade.');
    }
  }

  function openDrawer(activityId: number) {
    setDrawerTimeline([]);
    setLoadedDrawerTimelineId(null);
    setDrawerTimelineError(null);
    syncDrawerUrl(activityId);
  }

  useEffect(() => {
    if (
      drawerActivity &&
      drawerTimelineLoading &&
      drawerTimeline.length === 0 &&
      !drawerTimelineError
    ) {
      queueMicrotask(() => {
        void loadDrawerTimeline(drawerActivity.id);
      });
    }
  }, [drawerActivity, drawerTimelineError, drawerTimelineLoading, drawerTimeline.length]);

  useEffect(() => {
    if (hasOpenActivity(drawerId, items)) return;

    syncDrawerUrl(null);
  }, [drawerId, items, syncDrawerUrl]);

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

  function persistActivityPatch(
    id: number,
    previous: Pick<BoardActivity, 'status' | 'priority' | 'dueDate' | 'completedAt' | 'assigneeId'>,
    patch: {
      status?: Status;
      priority?: BoardActivity['priority'];
      dueDate?: string | null;
      assigneeId?: number | null;
      reassignmentMessage?: string | null;
    },
  ) {
    setErrorMessage(null);
    startPersistTransition(() => {
      void updateActivityAction({
        id,
        status: patch.status,
        priority: patch.priority,
        dueDate: patch.dueDate,
        assigneeId: patch.assigneeId,
        reassignmentMessage: patch.reassignmentMessage,
      })
        .then((persisted) => {
          updateActivity(id, {
            ...persisted,
            assigneeName:
              persisted.assigneeId != null
                ? (peopleById.get(persisted.assigneeId)?.name ?? null)
                : null,
          });
          if (drawerId === id) {
            setDrawerTimeline([]);
            setLoadedDrawerTimelineId(null);
            setDrawerTimelineError(null);
          }
        })
        .catch(() => {
          updateActivity(id, previous);
          setErrorMessage('Não foi possível salvar a atividade. Tente novamente.');
        });
    });
  }

  function handleDrawerChange(patch: Partial<BoardActivity>) {
    if (!drawerId) return;
    const current = items.find((activity) => activity.id === drawerId);
    if (!current) return;
    const nextPatch = { ...patch };
    if (nextPatch.status) {
      nextPatch.completedAt = deriveCompletedAt(
        nextPatch.status,
        current.status,
        current.completedAt,
      );
    }
    updateActivity(drawerId, nextPatch);
    persistActivityPatch(
      drawerId,
      {
        status: current.status,
        priority: current.priority,
        dueDate: current.dueDate,
        completedAt: current.completedAt,
        assigneeId: current.assigneeId,
      },
      {
        status: nextPatch.status,
        priority: nextPatch.priority,
        dueDate: nextPatch.dueDate,
        assigneeId: nextPatch.assigneeId,
      },
    );
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const id = parsePositiveIntParam(result.draggableId);
    if (id == null) return;
    const newStatus = result.destination.droppableId as Status;
    if (result.source.droppableId === newStatus) return;
    const current = items.find((a) => a.id === id);
    if (!current) return;
    const nextPatch = {
      status: newStatus,
      completedAt: deriveCompletedAt(newStatus, current.status, current.completedAt),
    } satisfies Partial<BoardActivity>;
    updateActivity(id, nextPatch);
    persistActivityPatch(
      id,
      {
        status: current.status,
        priority: current.priority,
        dueDate: current.dueDate,
        completedAt: current.completedAt,
        assigneeId: current.assigneeId,
      },
      { status: newStatus },
    );
  }

  const handleAdd = useCallback(async (title: string, status: Status) => {
    setErrorMessage(null);
    try {
      const created = await createQuickActivityAction({ title, status });
      setItems((activities) => [...activities, normalizeActivity(created)]);
    } catch (error) {
      logger.error('Failed to create quick activity', {
        hasTitle: !!title,
        titleLength: title.length,
        status,
        error: toSafeErrorLog(error),
      });
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível criar a atividade.',
      );
    }
  }, []);

  const handleLateClick = useCallback(() => {
    setFilters((current) => ({ ...current, dueLate: true, dueWeek: false }));
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1180px] min-w-0 px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-[11px] tracking-[0.18em] whitespace-nowrap text-[rgba(13,31,60,0.55)] uppercase">
            Operação · Quadro de atividades
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-5xl">
            Atividades
          </h1>
        </div>
        <Link
          href="/app/atividades/nova"
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] lg:h-10 lg:min-h-10 ${focusRingClass}`}
        >
          <Plus size={16} aria-hidden="true" />
          Nova atividade
        </Link>
      </div>

      <SummaryStrip activities={filtered} onLateClick={handleLateClick} />

      <FilterBar
        filters={filters}
        people={people}
        associates={associates}
        compact={compact}
        setCompact={setCompact}
        setFilters={setFilters}
      />

      {items.length === 0 && (
        <div className="mb-5 rounded-[16px] border border-dashed border-[rgba(4,9,32,0.05)] bg-white px-5 py-4 text-sm text-[rgba(13,31,60,0.60)]">
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
                <BoardColumn
                  key={col.key}
                  col={col}
                  colItems={colItems}
                  isCollapsed={isCollapsed}
                  compact={compact}
                  collapsedDone={collapsedDone}
                  peopleById={peopleById}
                  setCollapsedDone={setCollapsedDone}
                  openDrawer={openDrawer}
                  handleAdd={handleAdd}
                />
              );
            })}
          </div>
        </DragDropContext>
        <div className="pointer-events-none absolute top-0 right-0 bottom-4 w-10 bg-gradient-to-l from-[#f8fafc] to-transparent md:hidden" />
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs text-[rgba(13,31,60,0.55)]">
        <Clock size={14} aria-hidden="true" />
        Alterações no quadro são salvas imediatamente e entram no histórico da atividade.
        <ArrowRight size={14} aria-hidden="true" />
      </div>

      {(isPersisting || errorMessage) && (
        <div className="mt-3 text-xs">
          {isPersisting && !errorMessage && (
            <p className="m-0 text-[rgba(13,31,60,0.55)]">Salvando alterações da atividade...</p>
          )}
          {errorMessage && <p className="m-0 text-[#b42318]">{errorMessage}</p>}
        </div>
      )}

      <Drawer
        activity={drawerActivity}
        people={people}
        peopleById={peopleById}
        timeline={drawerTimeline}
        timelineLoading={drawerTimelineLoading}
        timelineError={drawerTimelineError}
        onClose={() => {
          setDrawerTimeline([]);
          setLoadedDrawerTimelineId(null);
          setDrawerTimelineError(null);
          syncDrawerUrl(null);
        }}
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
          onSubmit={async (toUserId, message) => {
            const activity = reassignActivity;
            if (!activity) return;
            setErrorMessage(null);
            const previous = {
              status: activity.status,
              priority: activity.priority,
              dueDate: activity.dueDate,
              completedAt: activity.completedAt,
              assigneeId: activity.assigneeId,
            } satisfies Pick<
              BoardActivity,
              'status' | 'priority' | 'dueDate' | 'completedAt' | 'assigneeId'
            >;

            updateActivity(activity.id, {
              assigneeId: toUserId,
              assigneeName: peopleById.get(toUserId)?.name ?? null,
            });
            setReassignActivity(null);
            persistActivityPatch(activity.id, previous, {
              assigneeId: toUserId,
              reassignmentMessage: message,
            });
          }}
        />
      )}
    </main>
  );
}
