import Link from 'next/link';
import { Settings, Webhook } from 'lucide-react';

export default async function ConfigPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <p className="text-[rgba(13,31,60,0.55)] text-[11px] tracking-[0.18em] uppercase">
        Sistema · Preferências operacionais
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
        Configurações
      </h1>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/app/config/integracoes/webhooks"
          className="rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white p-6 transition-colors hover:border-[#76AEEA] hover:bg-[rgba(118,174,234,0.05)]"
        >
          <Webhook size={32} className="mb-4 text-[#0d3260]" aria-hidden="true" />
          <h2 className="font-serif text-xl font-bold text-[#040920]">Integrações e webhooks</h2>
          <p className="mt-2 text-sm leading-6 text-[rgba(13,31,60,0.55)]">
            Gerencie destinos HTTP para automações externas e entregas outbound assinadas.
          </p>
        </Link>
      </div>

      <div className="mt-6 rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white p-8 text-center">
        <Settings size={40} className="mx-auto mb-4 text-[rgba(13,31,60,0.25)]" aria-hidden="true" />
        <h2 className="font-serif text-xl font-bold text-[#040920]">Módulo em preparação</h2>
        <p className="mt-2 text-sm text-[rgba(13,31,60,0.55)]">
          Preferências operacionais da intranet serão configuráveis aqui em breve.
        </p>
      </div>
    </main>
  );
}
