import { parsePositiveIntParam } from '@/lib/routing/params';
import { ACTIVITY_PRIORITIES } from '@/lib/activities/types';
import { defaultFilters } from './constants';
import type { Filters } from './types';

const VALID_SCOPES = ['todas', 'minhas'] as const;
const VALID_PRIORITIES = ACTIVITY_PRIORITIES as readonly string[];

export function parseOpenActivityId(searchParams: {
  get(name: string): string | null;
}): number | null {
  const raw = searchParams.get('open');
  if (!raw) return null;

  return parsePositiveIntParam(raw);
}

export function parseFiltersFromUrl(searchParams: { get(name: string): string | null }): Filters {
  const scope = searchParams.get('scope');
  const assignee = searchParams.get('assignee');
  const priority = searchParams.get('priority');
  const associate = searchParams.get('associate');
  const dueWeek = searchParams.get('dueWeek');
  const dueLate = searchParams.get('dueLate');

  return {
    scope:
      scope && VALID_SCOPES.includes(scope as (typeof VALID_SCOPES)[number])
        ? (scope as Filters['scope'])
        : defaultFilters.scope,
    query: defaultFilters.query,
    assignee: assignee ?? defaultFilters.assignee,
    priority:
      priority && VALID_PRIORITIES.includes(priority)
        ? (priority as Filters['priority'])
        : defaultFilters.priority,
    associate: associate ?? defaultFilters.associate,
    dueWeek: dueWeek === '1',
    dueLate: dueLate === '1',
  };
}

export function serializeFiltersToUrl(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.scope !== defaultFilters.scope) params.set('scope', filters.scope);
  if (filters.assignee) params.set('assignee', filters.assignee);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.associate) params.set('associate', filters.associate);
  if (filters.dueWeek) params.set('dueWeek', '1');
  if (filters.dueLate) params.set('dueLate', '1');

  return params;
}

export function buildBoardUrl(
  pathname: string,
  searchParams: { toString(): string },
  openActivityId: number | null,
  filters?: Filters,
): string {
  const params = filters
    ? serializeFiltersToUrl(filters)
    : new URLSearchParams(searchParams.toString());

  if (openActivityId === null) {
    params.delete('open');
  } else {
    params.set('open', String(openActivityId));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function hasOpenActivity(
  openActivityId: number | null,
  activities: Array<{ id: number }>,
): boolean {
  return openActivityId === null || activities.some((activity) => activity.id === openActivityId);
}
