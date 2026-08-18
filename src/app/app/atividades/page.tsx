import { requireAuth } from '@/lib/auth/require-auth';
import { getActivitiesBoardData } from '@/lib/activities/board-data';
import { AtividadesBoard } from './AtividadesBoard';
import { parsePositiveIntParam } from '@/lib/routing/params';
import { isActivityStatus } from '@/lib/activities/status';

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string; dueLate?: string; openOnly?: string; status?: string }>;
}) {
  const [user, params] = await Promise.all([requireAuth(), searchParams]);
  const dueLate = params.dueLate === '1';
  const openOnly = params.openOnly === '1';
  const status = params.status && isActivityStatus(params.status) ? params.status : undefined;
  const boardData = await getActivitiesBoardData(user, {
    openActivityId: params.open ? parsePositiveIntParam(params.open) : null,
    dueLate,
    openOnly,
    status,
  });

  return (
    <AtividadesBoard
      key={`activities-${dueLate ? 'late' : 'all'}-${openOnly ? 'open' : 'all'}-${status ?? 'all'}`}
      initialActivities={boardData.initialActivities}
      people={boardData.people}
      associates={boardData.associates}
      currentUser={boardData.currentUser}
    />
  );
}
