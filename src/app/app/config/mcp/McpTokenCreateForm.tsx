'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { AlertCircle, AlertTriangle, Check, Copy, KeyRound } from 'lucide-react';
import { desktopDenseControlClass, focusRingClass, mobileTouchTargetClass } from '@/lib/ui/tokens';
import { createOperatorMcpTokenAction } from './actions';

interface NewTokenDisplayProps {
  token: string;
  onDismiss: () => void;
}

function NewTokenDisplay({ token, onDismiss }: NewTokenDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setCopyFailed(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div role="alert" className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            Este token será exibido somente uma vez. Copie-o e guarde-o com segurança.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 rounded-md border border-amber-200 bg-white px-3 py-2 font-mono text-xs break-all text-[#040920] select-all">
              {token}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Token copiado' : 'Copiar token MCP'}
              className={`${mobileTouchTargetClass} ${desktopDenseControlClass} inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 ${focusRingClass}`}
            >
              {copied ? (
                <Check size={13} aria-hidden="true" />
              ) : (
                <Copy size={13} aria-hidden="true" />
              )}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          {copyFailed && (
            <p className="mt-2 flex items-center gap-1 text-xs text-red-700">
              <AlertCircle size={13} aria-hidden="true" />
              Não foi possível copiar automaticamente. Selecione e copie o código acima manualmente.
            </p>
          )}
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

export function McpTokenCreateForm() {
  const [name, setName] = useState('');
  const [lgpdAcknowledged, setLgpdAcknowledged] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await createOperatorMcpTokenAction({ name, lgpdAcknowledged });
        if ('error' in result) {
          setError(result.error ?? 'Erro ao criar token MCP.');
          return;
        }
        setNewToken(result.data.token);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Erro ao criar token MCP.');
      }
    });
  }

  function handleDismiss() {
    setNewToken(null);
    setName('');
    setLgpdAcknowledged(false);
  }

  if (newToken) {
    return <NewTokenDisplay token={newToken} onDismiss={handleDismiss} />;
  }

  return (
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
          placeholder="Ex.: Cursor no computador institucional"
          spellCheck={false}
          autoComplete="off"
          className={`w-full rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#040920] transition-colors placeholder:text-[rgba(13,31,60,0.35)] hover:border-[rgba(4,9,32,0.2)] ${focusRingClass}`}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-[rgba(4,9,32,0.08)] bg-[rgba(13,31,60,0.02)] p-4 text-sm leading-6 text-[#0d1f3c]">
        <input
          type="checkbox"
          required
          checked={lgpdAcknowledged}
          onChange={(event) => setLgpdAcknowledged(event.target.checked)}
          className={`mt-1 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#040920] ${focusRingClass}`}
        />
        <span>
          Estou ciente de que conectar Claude ou Cursor pode enviar dados pessoais de Oficiais ao
          provedor de LLM utilizado, e assumo a responsabilidade pelo tratamento desses dados
          conforme a LGPD.
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
          disabled={isPending || name.trim().length < 2 || !lgpdAcknowledged}
          className={`${mobileTouchTargetClass} ${desktopDenseControlClass} inline-flex items-center justify-center gap-2 rounded-md bg-[#040920] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] disabled:opacity-50 ${focusRingClass}`}
        >
          <KeyRound size={15} aria-hidden="true" />
          {isPending ? 'Criando...' : 'Criar token MCP'}
        </button>
      </div>
    </form>
  );
}
