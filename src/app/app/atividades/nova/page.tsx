import { requireAuth } from '@/lib/auth/require-auth';
import { db } from '@/lib/db';
import { admins, associates } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { NovaAtividadeForm } from './NovaAtividadeForm';
import type { BoardPerson } from '../AtividadesBoard';

export default async function NovaAtividadePage() {
  const user = await requireAuth();

  const [adminRows, associateRows] = await Promise.all([
    db
      .select({
        id: admins.id,
        name: admins.name,
        role: admins.role,
      })
      .from(admins)
      .where(eq(admins.isActive, true))
      .orderBy(asc(admins.name)),
    db
      .select({
        id: associates.id,
        name: associates.fullName,
      })
      .from(associates)
      .orderBy(asc(associates.fullName))
      .limit(100),
  ]);

  const currentUser: BoardPerson = {
    id: user.userId,
    name: user.name,
    role: user.role,
  };

  const peopleById = new Map<number, BoardPerson>();
  peopleById.set(currentUser.id, currentUser);
  for (const admin of adminRows) {
    peopleById.set(admin.id, {
      id: admin.id,
      name: admin.name,
      role: admin.role,
    });
  }

  return (
    <NovaAtividadeForm
      people={[...peopleById.values()]}
      associates={associateRows}
      currentUser={currentUser}
    />
  );
}
