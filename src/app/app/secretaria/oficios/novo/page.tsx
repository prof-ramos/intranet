import { OficioForm } from '../_components/OficioForm';
import { PageHeader } from '@/components/PageHeader';

export default function NovoOficioPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Ofícios"
        title="Gerar Novo Ofício"
        backHref="/app/secretaria/oficios"
        backLabel="Voltar para ofícios"
      />

      <OficioForm />
    </main>
  );
}
