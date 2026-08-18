import { requireAuth } from '@/lib/auth/require-auth';
import { getActivitiesBoardData } from '@/lib/activities/board-data';
import { AtividadesBoard } from './AtividadesBoard';
import { parsePositiveIntParam } from '@/lib/routing/params';

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string; dueLate?: string; openOnly?: string }>;
}) {
  const [user, params] = await Promise.all([requireAuth(), searchParams]);
  const dueLate = params.dueLate === '1';
  const openOnly = params.openOnly === '1';
  const boardData = await getActivitiesBoardData(user, {
    openActivityId: params.open ? parsePositiveIntParam(params.open) : null,
    dueLate,
    openOnly,
  });

  return (
    <AtividadesBoard
      key={`activities-${dueLate ? 'late' : 'all'}-${openOnly ? 'open' : 'all'}`}
      initialActivities={boardData.initialActivities}
      people={boardData.people}
      associates={boardData.associates}
      currentUser={boardData.currentUser}
    />
  );
}
