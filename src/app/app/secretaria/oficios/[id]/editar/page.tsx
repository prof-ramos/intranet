import { OficioForm } from '../../_components/OficioForm';
import { getOfficialLetterAction } from '../../actions';
import { textMuted } from '@/lib/ui/tokens';
import { parsePositiveIntParam } from '@/lib/routing/params';
import { requireEntityById } from '@/lib/routing/require-entity';

export default async function EditarOficioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const officialLetterId = parsePositiveIntParam(id);
  const oficio = await requireEntityById(officialLetterId, getOfficialLetterAction);
  const closure = oficio.closure === 'Respeitosamente,' ? 'Respeitosamente,' : 'Atenciosamente,';

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-8">
        <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textMuted }}>
          Ofícios
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
          <h1 className="font-serif text-4xl font-bold md:text-[3rem]">Editar Ofício</h1>
          <span className="font-serif text-xl font-medium text-slate-400">{oficio.number}</span>
        </div>
      </div>

      <OficioForm
        id={oficio.id}
        initialData={{
          recipient: oficio.recipient,
          recipientRole: oficio.recipientRole,
          vocativo: oficio.vocativo,
          letterDate: oficio.letterDate,
          subject: oficio.subject,
          itamaratySector: oficio.itamaratySector,
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
