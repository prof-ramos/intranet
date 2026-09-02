import { OficioForm } from '../../_components/OficioForm';
import { getOfficialLetterAction } from '../../actions';
import { PageHeader } from '@/components/PageHeader';
import { parsePositiveIntParam } from '@/lib/routing/params';
import { requireEntityById } from '@/lib/routing/require-entity';

export default async function EditarOficioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const officialLetterId = parsePositiveIntParam(id);
  const oficio = await requireEntityById(officialLetterId, getOfficialLetterAction);
  const closure = oficio.closure === 'Respeitosamente,' ? 'Respeitosamente,' : 'Atenciosamente,';

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Ofícios"
        title="Editar Ofício"
        description={oficio.number}
        backHref="/app/secretaria/oficios"
        backLabel="Voltar para ofícios"
      />

      <OficioForm
        id={oficio.id}
        initialData={{
          recipient: oficio.recipient,
          recipientRole: oficio.recipientRole,
          vocativo: oficio.vocativo,
          letterDate: oficio.letterDate,
          subject: oficio.subject,
          itamaratySector: oficio.itamaratySector,
          recipientAddress: oficio.recipientAddress ?? undefined,
          recipientCity: oficio.recipientCity ?? undefined,
          recipientZip: oficio.recipientZip ?? undefined,
          signatoryName: oficio.signatoryName,
          signatoryRole: oficio.signatoryRole,
          closure,
          bodyRichText: oficio.bodyRichText,
          bodyPlainText: oficio.bodyPlainText,
        }}
      />
    </main>
  );
}
