import { Sparkles } from 'lucide-react';
import { requireRole } from '@/lib/auth/authorization';
import { getGeminiKeyMeta } from '@/lib/ai/settings';
import { GeminiApiKeyForm } from './GeminiApiKeyForm';
import { PageHeader } from '@/components/PageHeader';
import { navy, borderFaint } from '@/lib/ui/tokens';

export default async function GeminiConfigPage() {
  await requireRole(['admin']);
  const meta = await getGeminiKeyMeta();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Configurações · Integrações · IA"
        title="Inteligência artificial"
        description="Configure a chave de API do Google Gemini utilizada pelo gerador de e-mails e pelo assistente de redigir ofícios. A chave é armazenada cifrada (AES-256-GCM) no banco de dados."
        backHref="/app/config"
        backLabel="Voltar para configurações"
      />

      <section
        className="mt-8 rounded-[10px] border bg-white p-6"
        style={{ borderColor: borderFaint }}
      >
        <div className="mb-5 flex items-center gap-2">
          <Sparkles size={18} style={{ color: navy }} aria-hidden="true" />
          <h2 className="text-sm font-semibold" style={{ color: navy }}>
            Chave da API Gemini
          </h2>
        </div>

        <GeminiApiKeyForm
          isConfigured={meta?.configured ?? false}
          source={meta?.source ?? null}
          updatedAt={meta?.updatedAt ?? null}
        />
      </section>
    </main>
  );
}
