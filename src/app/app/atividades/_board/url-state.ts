import { parsePositiveIntParam } from '@/lib/routing/params';

export function parseOpenActivityId(searchParams: { get(name: string): string | null }): number | null {
  const raw = searchParams.get('open');
  if (!raw) return null;

  return parsePositiveIntParam(raw);
}

export function buildBoardUrl(
  pathname: string,
  searchParams: { toString(): string },
  openActivityId: number | null,
): string {
  const params = new URLSearchParams(searchParams.toString());

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
