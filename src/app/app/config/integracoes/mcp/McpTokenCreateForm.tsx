'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { focusRingClass } from '@/lib/ui/tokens';
import { createMcpTokenAction } from './actions';

export function McpTokenCreateForm() {
  const [name, setName] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!acknowledged) {
      setError('Confirme a ciência sobre o tratamento de dados via MCP.');
      return;
    }

    startTransition(async () => {
      const result = await createMcpTokenAction(name, true);
      if ('error' in result) {
        setError(result.error ?? 'Erro ao criar token.');
        return;
      }
      setToken(result.data.token);
    });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="grid gap-5">
        <div className="grid gap-1.5">
          <label htmlFor="mcp-token-name" className="text-xs font-semibold text-[#040920]">
            Nome do token
          </label>
          <input
            id="mcp-token-name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Cursor da secretaria"
            spellCheck={false}
            autoComplete="off"
            className={`w-full rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#040920] ${focusRingClass}`}
          />
        </div>

        <label className="flex items-start gap-2.5 text-xs text-[#040920]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className={`mt-0.5 h-4 w-4 ${focusRingClass}`}
          />
          <span>
            Entendo que este token acessa dados operacionais da intranet, inclusive dados pessoais
            quando a ferramenta pedir, e que o valor só será exibido agora.
          </span>
        </label>

        {error && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={isPending || !name.trim() || !acknowledged}
            className={`inline-flex items-center gap-2 rounded-md bg-[#040920] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${focusRingClass}`}
          >
            <KeyRound size={15} aria-hidden="true" />
            {isPending ? 'Criando...' : 'Criar token'}
          </button>
        </div>
      </form>

      {token && (
        <div role="alert" className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">
            Este token só aparece agora. Guarde-o no cliente MCP como Bearer.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 rounded-md border border-amber-200 bg-white px-3 py-2 font-mono text-xs break-all">
              {token}
            </code>
            <button
              type="button"
              aria-label={copied ? 'Copiado' : 'Copiar token'}
              onClick={async () => {
                await navigator.clipboard.writeText(token);
                setCopied(true);
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-medium ${focusRingClass}`}
            >
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setToken(null);
                setName('');
                setAcknowledged(false);
                setCopied(false);
              }}
              className={`text-xs font-medium text-amber-800 underline ${focusRingClass}`}
            >
              Entendido, fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
