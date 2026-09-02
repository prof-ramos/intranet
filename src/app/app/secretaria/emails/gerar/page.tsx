import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/authorization';
import { PageHeader } from '@/components/PageHeader';
import { EmailGeneratorClient } from './EmailGeneratorClient';

export const metadata: Metadata = {
  title: 'Gerador de E-mails com IA — ASOF',
  description:
    'Gere e-mails institucionais no padrão ASOF usando Inteligência Artificial (Gemini 3.5 Flash).',
};

export default async function EmailGeneratorPage() {
  await requireRole(['admin', 'secretaria']);

  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Secretaria"
        title="Gerador de E-mails com IA"
        description="Redija comunicações institucionais com assistência de IA, no tom formal da ASOF."
      />

      <EmailGeneratorClient />
    </main>
  );
}
