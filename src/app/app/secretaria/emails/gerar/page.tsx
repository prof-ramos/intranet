import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/authorization';
import { EmailGeneratorClient } from './EmailGeneratorClient';

export const metadata: Metadata = {
  title: 'Gerador de E-mails com IA — ASOF',
  description: 'Gere e-mails institucionais no padrão ASOF usando Inteligência Artificial (Gemini 3.5 Flash).',
};

export default async function EmailGeneratorPage() {
  // Apenas admin e secretaria podem acessar esta página
  await requireRole(['admin', 'secretaria']);

  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-6">
        <p className="text-[11px] tracking-[0.18em] uppercase text-slate-500">
          Secretaria
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-slate-900 md:text-[2.5rem]">
          Gerador de E-mails com IA
        </h1>
      </div>

      <EmailGeneratorClient />
    </main>
  );
}
