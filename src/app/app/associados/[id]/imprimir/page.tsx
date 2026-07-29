import { getAssociateProfile } from '@/lib/associates/service';
import { requireAuth } from '@/lib/auth/require-auth';
import { parsePositiveIntParam } from '@/lib/routing/params';
import { requireEntityById } from '@/lib/routing/require-entity';
import { PrintableFicha } from './PrintableFicha';
import { PrintToolbar } from './PrintToolbar';

export default async function ImprimirFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const associateId = parsePositiveIntParam(id);
  const profile = await requireEntityById(associateId, (associateId) =>
    getAssociateProfile(associateId, user.role),
  );

  return (
    <>
      <PrintToolbar associateId={id} />
      <PrintableFicha profile={profile} />
    </>
  );
}
