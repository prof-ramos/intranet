import { KeyRound } from 'lucide-react';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/authorization';
import { PageHeader } from '@/components/PageHeader';
import { focusRingClass, navy, primaryContainerHover } from '@/lib/ui/tokens';
import type { CSSProperties } from 'react';
import { listMcpTokensAction } from './actions';
import { McpTokenActionsPanel } from './McpTokenActionsPanel';
import { McpTokenCreateForm } from './McpTokenCreateForm';

const dtf = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default async function McpTokensPage() {
  await requireRole(['admin']);
  const result = await listMcpTokensAction();
  const tokens = 'data' in result && result.data ? result.data : [];

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Configurações · Integrações · MCP"
        title="Tokens MCP"
        description="Crie, renove e revogue tokens Bearer asof_mcp_ para clientes como Cursor e Claude. O valor em texto claro aparece só na criação ou na renovação."
        backHref="/app/config"
        backLabel="Voltar para configurações"
      />

      <section className="mt-8 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-[#040920]">Novo token</h2>
        <McpTokenCreateForm />
      </section>

      <section className="mt-6 grid gap-4">
        {tokens.length === 0 ? (
          <div className="rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-8 text-center">
            <KeyRound size={40} className="mx-auto mb-4 text-[rgba(13,31,60,0.25)]" aria-hidden="true" />
            <h2 className="font-serif text-xl font-bold text-[#040920]">Nenhum token MCP</h2>
            <p className="mt-2 text-sm text-[rgba(13,31,60,0.55)]">
              Crie um token para um agente operar o cadastro fora do navegador.
            </p>
          </div>
        ) : (
          tokens.map((token) => (
            <article
              key={token.id}
              className="rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-6"
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-2xl font-bold text-[#040920]">{token.name}</h2>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        token.revokedAt
                          ? 'bg-red-50 text-red-600'
                          : token.expiresAt.getTime() <= Date.now()
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {token.revokedAt
                        ? 'Revogado'
                        : token.expiresAt.getTime() <= Date.now()
                          ? 'Expirado'
                          : 'Ativo'}
                    </span>
                  </div>
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[rgba(13,31,60,0.55)]">
                    <div className="flex gap-1">
                      <dt>Operador:</dt>
                      <dd>{token.adminName}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>Expira em:</dt>
                      <dd>
                        <time dateTime={token.expiresAt.toISOString()}>{dtf.format(token.expiresAt)}</time>
                      </dd>
                    </div>
                  </dl>
                </div>
                <McpTokenActionsPanel id={token.id} revoked={token.revokedAt !== null} />
              </div>
            </article>
          ))
        )}
      </section>

      <p className="mt-6 text-xs text-[rgba(13,31,60,0.55)]">
        As chaves HMAC de <Link href="/app/config/integracoes/api-keys" className={focusRingClass}>API</Link>{' '}
        continuam servindo `/api/v1`. O endpoint MCP é `/api/mcp` e só aceita estes tokens.
      </p>
      <Link
        href="/app/config/integracoes/api-keys"
        className={`mt-3 inline-flex h-10 items-center rounded-[8px] px-5 text-sm font-semibold text-white ${focusRingClass}`}
        style={{ backgroundColor: navy, '--primary-hover': primaryContainerHover } as CSSProperties}
      >
        Ir para chaves de API
      </Link>
    </main>
  );
}
