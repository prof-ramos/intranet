import { KeyRound } from 'lucide-react';
import { requireRole } from '@/lib/auth/authorization';
import { listOperatorMcpTokensAction } from './actions';
import { McpTokenActionsPanel } from './McpTokenActionsPanel';
import { McpTokenCreateForm } from './McpTokenCreateForm';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(date: Date): string {
  return dateTimeFormatter.format(date);
}

export default async function McpTokensPage() {
  const actor = await requireRole(['admin', 'diretoria', 'secretaria']);
  const result = await listOperatorMcpTokensAction();
  const tokens = 'data' in result && result.data ? result.data : [];
  const listError = 'error' in result ? result.error : null;
  const now = new Date();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <p className="text-[11px] tracking-[0.18em] text-[rgba(13,31,60,0.55)] uppercase">
        Configurações · Tokens MCP
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">Tokens MCP</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgba(13,31,60,0.65)]">
        Crie credenciais pessoais para conectar Claude ou Cursor à Intranet ASOF. O token em texto
        claro é exibido somente no momento da criação.
      </p>

      <section className="mt-8 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-[#040920]">Novo token MCP</h2>
        <McpTokenCreateForm />
      </section>

      {listError && (
        <p role="alert" className="mt-6 text-sm font-medium text-red-600">
          {listError}
        </p>
      )}

      <section className="mt-6 grid gap-4">
        {!listError && tokens.length === 0 ? (
          <div className="rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-8 text-center">
            <KeyRound
              size={40}
              className="mx-auto mb-4 text-[rgba(13,31,60,0.25)]"
              aria-hidden="true"
            />
            <h2 className="font-serif text-xl font-bold text-[#040920]">Nenhum token criado</h2>
            <p className="mt-2 text-sm text-[rgba(13,31,60,0.55)]">
              Crie um token pessoal para conectar seu cliente MCP à intranet.
            </p>
          </div>
        ) : (
          tokens.map((token) => {
            const isRevoked = token.revokedAt !== null;
            const isExpired = !isRevoked && token.expiresAt <= now;
            const status = isRevoked ? 'Revogado' : isExpired ? 'Expirado' : 'Ativo';
            const statusClass = isRevoked
              ? 'bg-red-50 text-red-600'
              : isExpired
                ? 'bg-amber-50 text-amber-700'
                : 'bg-green-50 text-green-700';

            return (
              <article
                key={token.id}
                className="rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-6"
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-2xl font-bold text-[#040920]">{token.name}</h2>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}
                      >
                        {status}
                      </span>
                    </div>

                    {actor.role === 'admin' && (
                      <p className="mt-1 text-xs text-[rgba(13,31,60,0.55)]">
                        Operador: {token.adminName}
                      </p>
                    )}

                    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[rgba(13,31,60,0.55)]">
                      <div className="flex gap-1">
                        <dt className="font-medium">Criado em:</dt>
                        <dd>
                          <time dateTime={token.createdAt.toISOString()}>
                            {formatDate(token.createdAt)}
                          </time>
                        </dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-medium">Expira em:</dt>
                        <dd>
                          <time dateTime={token.expiresAt.toISOString()}>
                            {formatDate(token.expiresAt)}
                          </time>
                        </dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-medium">Último uso:</dt>
                        <dd>
                          {token.lastUsedAt ? (
                            <time dateTime={token.lastUsedAt.toISOString()}>
                              {formatDate(token.lastUsedAt)}
                            </time>
                          ) : (
                            'Nunca usado'
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="lg:self-start">
                    <McpTokenActionsPanel id={token.id} isRevoked={isRevoked} />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
