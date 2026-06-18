import { requireRole } from '@/lib/auth/authorization';
import { getAssociateForEdit } from '@/lib/associates/service';
import { parsePositiveIntParam } from '@/lib/routing/params';
import { requireEntityById } from '@/lib/routing/require-entity';
import { EditarAssociadoForm } from './EditarAssociadoForm';

export default async function EditarAssociadoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(['admin', 'diretoria', 'secretaria']);
  const { id } = await params;
  const associateId = parsePositiveIntParam(id);
  const associate = await requireEntityById(associateId, (id) =>
    getAssociateForEdit(id, user.role, user.userId),
  );

  return (
    <EditarAssociadoForm
      associate={associate}
      canEditInternalNotes={associate.canEditInternalNotes}
    />
  );
}
