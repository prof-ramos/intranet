'use client';

import { useState, useTransition } from 'react';
import { KeyRound, Copy, Check, AlertTriangle } from 'lucide-react';
import { focusRingClass } from '@/lib/ui/tokens';
import { createApiKeyAction } from './actions';

const VALID_SCOPES = ['events:read', 'events:write', 'webhooks:manage', 'admin'] as const;

const scopeLabels: Record<string, string> = {
  'events:read': 'events:read — leitura de eventos',
  'events:write': 'events:write — envio de eventos',
  'webhooks:manage': 'webhooks:manage — gerenciar webhooks',
  admin: 'admin — acesso completo',
};

interface NewKeyDisplayProps {
  rawKey: string;
  onDismiss: () => void;
}

function NewKeyDisplay({ rawKey, onDismiss }: NewKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div role="alert" className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            Esta chave só será exibida uma vez. Guarde-a com segurança.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 rounded-md border border-amber-200 bg-white px-3 py-2 font-mono text-xs break-all text-[#040920] select-all">
              {rawKey}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copiado' : 'Copiar chave'}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 ${focusRingClass}`}
            >
              {copied ? (
                <Check size={13} aria-hidden="true" />
              ) : (
                <Copy size={13} aria-hidden="true" />
              )}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onDismiss}
          className={`text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 ${focusRingClass}`}
        >
          Entendido, fechar
        </button>
      </div>
    </div>
  );
}

export function ApiKeyCreateForm() {
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  function handleDismissKey() {
    setNewKey(null);
    setName('');
    setSelectedScopes([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedScopes.length === 0) {
      setError('Selecione ao menos um escopo.');
      return;
    }

    startTransition(async () => {
      const result = await createApiKeyAction(name, selectedScopes);
      if ('error' in result) {
        setError(result.error ?? 'Erro ao criar chave.');
      } else {
        setNewKey(result.data.key);
      }
    });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="grid gap-5">
        <div className="grid gap-1.5">
          <label htmlFor="api-key-name" className="text-xs font-semibold text-[#040920]">
            Nome da chave
          </label>
          <input
            id="api-key-name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Sistema de automação financeira"
            spellCheck={false}
            autoComplete="off"
            className={`w-full rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#040920] transition-colors placeholder:text-[rgba(13,31,60,0.35)] hover:border-[rgba(4,9,32,0.2)] ${focusRingClass}`}
          />
        </div>

        <fieldset>
          <legend className="text-xs font-semibold text-[#040920]">Escopos de acesso</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {VALID_SCOPES.map((scope) => (
              <label
                key={scope}
                className="flex cursor-pointer items-center gap-2.5 rounded-md border border-[rgba(4,9,32,0.08)] bg-[rgba(13,31,60,0.02)] px-3 py-2.5 text-xs font-medium text-[#040920] transition-colors hover:border-[rgba(4,9,32,0.15)] hover:bg-[rgba(13,31,60,0.04)]"
              >
                <input
                  type="checkbox"
                  checked={selectedScopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                  className={`h-4 w-4 rounded border-gray-300 text-[#040920] accent-[#040920] ${focusRingClass}`}
                />
                <span className="font-mono">{scopeLabels[scope] ?? scope}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className={`inline-flex items-center gap-2 rounded-md bg-[#040920] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] disabled:opacity-50 ${focusRingClass}`}
          >
            <KeyRound size={15} aria-hidden="true" />
            {isPending ? 'Criando...' : 'Criar chave'}
          </button>
        </div>
      </form>

      {newKey && <NewKeyDisplay rawKey={newKey} onDismiss={handleDismissKey} />}
    </div>
  );
}
