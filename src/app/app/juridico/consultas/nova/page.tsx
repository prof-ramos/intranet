import { requireAuth } from '@/lib/auth/require-auth';
import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { NovaConsultaForm } from './NovaConsultaForm';

export default async function NovaConsultaPage() {
  await requireAuth();

  const associateRows = await db
    .select({ id: associates.id, name: associates.fullName })
    .from(associates)
    .where(eq(associates.associationStatus, 'ativo'))
    .orderBy(asc(associates.fullName))
    .limit(200);

  return (
    <NovaConsultaForm
      associates={associateRows}
    />
  );
}
