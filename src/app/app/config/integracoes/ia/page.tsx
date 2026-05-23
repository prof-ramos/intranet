import { Sparkles } from 'lucide-react';
import { requireRole } from '@/lib/auth/authorization';
import { getGeminiKeyMeta } from '@/lib/ai/settings';
import { GeminiApiKeyForm } from './GeminiApiKeyForm';

export default async function GeminiConfigPage() {
  await requireRole(['admin']);
  const meta = await getGeminiKeyMeta();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <p className="text-[11px] tracking-[0.18em] text-[rgba(13,31,60,0.55)] uppercase">
        Configurações · Integrações · IA
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
        Inteligência artificial
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgba(13,31,60,0.65)]">
        Configure a chave de API do Google Gemini utilizada pelo gerador de e-mails e pelo
        assistente de redigir ofícios. A chave é armazenada cifrada (AES-256-GCM) no banco de
        dados.
      </p>

      <section className="mt-8 rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white p-6">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles size={18} className="text-[#040920]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[#040920]">Chave da API Gemini</h2>
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
