import { requireRole } from '@/lib/auth/authorization';
import { CriarAssociadoForm } from './CriarAssociadoForm';

export default async function CriarAssociadoPage() {
  const user = await requireRole(['admin', 'secretaria']);
  return <CriarAssociadoForm canEditInternalNotes={user.role === 'admin'} />;
}