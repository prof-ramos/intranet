import { requireAuth } from '@/lib/auth/require-auth';
import { getActivitiesFormData } from '@/lib/activities/queries';
import { NovaAtividadeForm } from './NovaAtividadeForm';

export default async function NovaAtividadePage() {
  const user = await requireAuth();
  const formData = await getActivitiesFormData(user);

  return (
    <NovaAtividadeForm
      people={formData.people}
      associates={formData.associates}
      currentUser={formData.currentUser}
    />
  );
}