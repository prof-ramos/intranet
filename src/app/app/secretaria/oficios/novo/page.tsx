import { OficioForm } from '../_components/OficioForm';
import { textMuted } from '@/lib/ui/tokens';

export default function NovoOficioPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-8">
        <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textMuted }}>
          Ofícios
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold md:text-[3rem]">
          Gerar Novo Ofício
        </h1>
      </div>

      <OficioForm />
    </main>
  );
}
