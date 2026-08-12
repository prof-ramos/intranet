import { requireAuth } from '@/lib/auth/require-auth';
import { getActivitiesBoardData } from '@/lib/activities/board-data';
import { AtividadesBoard } from './AtividadesBoard';
import { parsePositiveIntParam } from '@/lib/routing/params';

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const [user, params] = await Promise.all([requireAuth(), searchParams]);
  const boardData = await getActivitiesBoardData(user, {
    openActivityId: params.open ? parsePositiveIntParam(params.open) : null,
  });

  return (
    <AtividadesBoard
      initialActivities={boardData.initialActivities}
      people={boardData.people}
      associates={boardData.associates}
      currentUser={boardData.currentUser}
    />
  );
}
