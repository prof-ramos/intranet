import { requireAuth } from '@/lib/auth/require-auth';
import { getActivitiesBoardData } from '@/lib/activities/board-data';
import { AtividadesBoard } from './AtividadesBoard';

export default async function AtividadesPage() {
  const user = await requireAuth();
  const boardData = await getActivitiesBoardData(user);

  return (
    <AtividadesBoard
      initialActivities={boardData.initialActivities}
      people={boardData.people}
      associates={boardData.associates}
      currentUser={boardData.currentUser}
    />
  );
}
