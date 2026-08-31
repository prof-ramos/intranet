import Link from 'next/link';
import { Bot, KeyRound, Settings, Webhook } from 'lucide-react';
import type { CSSProperties } from 'react';
import { requireAuth } from '@/lib/auth/require-auth';
import { focusRingClass, skyBlue, borderFaint } from '@/lib/ui/tokens';

export default async function ConfigPage() {
  const actor = await requireAuth();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <p className="text-[11px] tracking-[0.18em] text-[rgba(13,31,60,0.55)] uppercase">
        Sistema · Preferências operacionais
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
        Configurações
      </h1>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/app/config/mcp"
          className={`rounded-[16px] border bg-white p-6 transition-colors hover:border-[var(--card-hover-border)] hover:bg-[rgba(118,174,234,0.05)] ${focusRingClass}`}
          style={{ borderColor: borderFaint, '--card-hover-border': skyBlue } as CSSProperties}
        >
          <Bot size={32} className="mb-4 text-[#0d3260]" aria-hidden="true" />
          <h2 className="font-serif text-xl font-bold text-[#040920]">Tokens MCP</h2>
          <p className="mt-2 text-sm leading-6 text-[rgba(13,31,60,0.55)]">
            Conecte Claude ou Cursor à intranet com uma credencial pessoal e revogável.
          </p>
        </Link>

        {actor.role !== 'secretaria' && (
          <>
            <Link
              href="/app/config/integracoes/webhooks"
              className={`rounded-[16px] border bg-white p-6 transition-colors hover:border-[var(--card-hover-border)] hover:bg-[rgba(118,174,234,0.05)] ${focusRingClass}`}
              style={{ borderColor: borderFaint, '--card-hover-border': skyBlue } as CSSProperties}
            >
              <Webhook size={32} className="mb-4 text-[#0d3260]" aria-hidden="true" />
              <h2 className="font-serif text-xl font-bold text-[#040920]">
                Integrações e webhooks
              </h2>
              <p className="mt-2 text-sm leading-6 text-[rgba(13,31,60,0.55)]">
                Gerencie destinos HTTP para automações externas e entregas outbound assinadas.
              </p>
            </Link>

            <Link
              href="/app/config/integracoes/api-keys"
              className={`rounded-[16px] border bg-white p-6 transition-colors hover:border-[var(--card-hover-border)] hover:bg-[rgba(118,174,234,0.05)] ${focusRingClass}`}
              style={{ borderColor: borderFaint, '--card-hover-border': skyBlue } as CSSProperties}
            >
              <KeyRound size={32} className="mb-4 text-[#0d3260]" aria-hidden="true" />
              <h2 className="font-serif text-xl font-bold text-[#040920]">Chaves de API</h2>
              <p className="mt-2 text-sm leading-6 text-[rgba(13,31,60,0.55)]">
                Crie e gerencie chaves de acesso para integrações externas com escopos restritos.
              </p>
            </Link>
          </>
        )}
      </div>

      {actor.role !== 'secretaria' && (
        <div className="mt-6 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-8 text-center">
          <Settings
            size={40}
            className="mx-auto mb-4 text-[rgba(13,31,60,0.25)]"
            aria-hidden="true"
          />
          <h2 className="font-serif text-xl font-bold text-[#040920]">Módulo em preparação</h2>
          <p className="mt-2 text-sm text-[rgba(13,31,60,0.55)]">
            Preferências operacionais da intranet serão configuráveis aqui em breve.
          </p>
        </div>
      )}
    </main>
  );
}
