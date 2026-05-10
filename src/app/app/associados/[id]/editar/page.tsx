import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';
import { EditarAssociadoForm } from './EditarAssociadoForm';

export default async function EditarAssociadoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(['admin', 'diretoria']);
  const { id } = await params;
  const associateId = Number(id);

  if (!Number.isInteger(associateId) || associateId < 1) {
    notFound();
  }

  const columns = {
    id: associates.id,
    fullName: associates.fullName,
    cpf: associates.cpf,
    siape: associates.siape,
    primaryEmail: associates.primaryEmail,
    secondaryEmail: associates.secondaryEmail,
    phone: associates.phone,
    whatsapp: associates.whatsapp,
    birthDate: associates.birthDate,
    address: associates.address,
    locationCity: associates.locationCity,
    locationCountry: associates.locationCountry,
    assignment: associates.assignment,
    assignmentStartDate: associates.assignmentStartDate,
    classPattern: associates.classPattern,
    associationCategory: associates.associationCategory,
    functionalStatus: associates.functionalStatus,
    associationStatus: associates.associationStatus,
    contributionStatus: associates.contributionStatus,
  } as const;

  const selectCols = user.role === 'admin'
    ? { ...columns, internalNotes: associates.internalNotes }
    : columns;

  const [row] = await db
    .select(selectCols)
    .from(associates)
    .where(eq(associates.id, associateId))
    .limit(1);

  if (!row) {
    notFound();
  }

  return <EditarAssociadoForm associate={row} canEditInternalNotes={user.role === 'admin'} />;
}
