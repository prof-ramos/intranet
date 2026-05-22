import { KeyRound } from 'lucide-react';
import { requireRole } from '@/lib/auth/authorization';
import { listApiKeysAction } from './actions';
import { ApiKeyCreateForm } from './ApiKeyCreateForm';
import { ApiKeyActionsPanel } from './ApiKeyActionsPanel';

const scopeLabels: Record<string, string> = {
  'events:read': 'events:read',
  'events:write': 'events:write',
  'webhooks:manage': 'webhooks:manage',
  admin: 'admin',
};

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function ApiKeysPage() {
  await requireRole(['admin']);
  const result = await listApiKeysAction();
  const apiKeys = 'data' in result && result.data ? result.data : [];

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <p className="text-[11px] tracking-[0.18em] text-[rgba(13,31,60,0.55)] uppercase">
        Configurações · Integrações · API Keys
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
        Chaves de API
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgba(13,31,60,0.65)]">
        Gerencie chaves de acesso para integrações externas. Cada chave possui escopos restritos e é
        exibida em texto claro somente no momento da criação ou rotação.
      </p>

      <section className="mt-8 rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-[#040920]">Nova chave de API</h2>
        <ApiKeyCreateForm />
      </section>

      <section className="mt-6 grid gap-4">
        {apiKeys.length === 0 ? (
          <div className="rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white p-8 text-center">
            <KeyRound
              size={40}
              className="mx-auto mb-4 text-[rgba(13,31,60,0.25)]"
              aria-hidden="true"
            />
            <h2 className="font-serif text-xl font-bold text-[#040920]">Nenhuma chave criada</h2>
            <p className="mt-2 text-sm text-[rgba(13,31,60,0.55)]">
              Crie uma chave de API para começar a integrar sistemas externos com a intranet.
            </p>
          </div>
        ) : (
          apiKeys.map((key) => (
            <article
              key={key.id}
              className="rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white p-6"
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-2xl font-bold text-[#040920]">{key.name}</h2>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        key.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {key.isActive ? 'Ativa' : 'Revogada'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {key.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="rounded-full bg-[rgba(13,31,60,0.06)] px-2.5 py-1 font-mono text-xs font-medium text-[#0d1f3c]"
                      >
                        {scopeLabels[scope] ?? scope}
                      </span>
                    ))}
                  </div>

                  <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[rgba(13,31,60,0.55)]">
                    <div className="flex gap-1">
                      <dt className="font-medium">Criada em:</dt>
                      <dd>
                        <time dateTime={key.createdAt.toISOString()}>
                          {formatDate(key.createdAt)}
                        </time>
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-medium">Último uso:</dt>
                      <dd>
                        {key.lastUsedAt ? (
                          <time dateTime={key.lastUsedAt.toISOString()}>
                            {formatDate(key.lastUsedAt)}
                          </time>
                        ) : (
                          'Nunca usada'
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="lg:self-start">
                  <ApiKeyActionsPanel id={key.id} isActive={key.isActive} />
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
