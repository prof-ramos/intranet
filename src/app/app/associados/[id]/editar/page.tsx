import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/authorization';
import { getAssociateForEdit } from '@/lib/associates/service';
import { EditarAssociadoForm } from './EditarAssociadoForm';

export default async function EditarAssociadoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(['admin', 'diretoria']);
  const { id } = await params;
  const associateId = Number(id);

  if (!Number.isInteger(associateId) || associateId < 1) {
    notFound();
  }

  const associate = await getAssociateForEdit(associateId, user.role, user.userId);
  if (!associate) {
    notFound();
  }

  return (
    <EditarAssociadoForm
      associate={associate}
      canEditInternalNotes={associate.canEditInternalNotes}
    />
  );
}
