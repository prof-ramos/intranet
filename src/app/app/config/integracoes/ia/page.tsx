import { Sparkles } from 'lucide-react';
import { requireRole } from '@/lib/auth/authorization';
import { getGeminiKeyMeta } from '@/lib/ai/settings';
import { GeminiApiKeyForm } from './GeminiApiKeyForm';
import { textMuted, textSubtle, navy, borderFaint } from '@/lib/ui/tokens';

export default async function GeminiConfigPage() {
  await requireRole(['admin']);
  const meta = await getGeminiKeyMeta();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textSubtle }}>
        Configurações · Integrações · IA
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]" style={{ color: navy }}>
        Inteligência artificial
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: textMuted }}>
        Configure a chave de API do Google Gemini utilizada pelo gerador de e-mails e pelo
        assistente de redigir ofícios. A chave é armazenada cifrada (AES-256-GCM) no banco de
        dados.
      </p>

      <section className="mt-8 rounded-[10px] border bg-white p-6" style={{ borderColor: borderFaint }}>
        <div className="mb-5 flex items-center gap-2">
          <Sparkles size={18} style={{ color: navy }} aria-hidden="true" />
          <h2 className="text-sm font-semibold" style={{ color: navy }}>Chave da API Gemini</h2>
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
