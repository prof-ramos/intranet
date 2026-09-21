'use client';

import { useState, useTransition } from 'react';
import { Ban, Check, Copy, RotateCcw } from 'lucide-react';
import { focusRingClass } from '@/lib/ui/tokens';
import { revokeMcpTokenAction, rotateMcpTokenAction } from './actions';

export function McpTokenActionsPanel({ id, revoked }: { id: number; revoked: boolean }) {
  const [isRevoked, setIsRevoked] = useState(revoked);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRevokePending, startRevoke] = useTransition();
  const [isRotatePending, startRotate] = useTransition();

  if (isRevoked && !token) {
    return <span className="text-xs font-medium text-[rgba(13,31,60,0.40)]">Revogado</span>;
  }

  return (
    <div className="grid gap-2">
      {!isRevoked && (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isRotatePending}
          onClick={() => {
            setError(null);
            startRotate(async () => {
              const result = await rotateMcpTokenAction(id);
              if ('error' in result) {
                setError(result.error ?? 'Erro ao renovar token.');
                return;
              }
              setToken(result.data.token);
              setIsRevoked(true);
            });
          }}
          className={`inline-flex items-center gap-1.5 rounded-md border border-[rgba(4,9,32,0.1)] bg-white px-3 py-1.5 text-xs font-medium ${focusRingClass}`}
        >
          <RotateCcw size={13} aria-hidden="true" />
          {isRotatePending ? 'Renovando...' : 'Renovar'}
        </button>
        {!confirmRevoke ? (
          <button
            type="button"
            onClick={() => setConfirmRevoke(true)}
            className={`inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 ${focusRingClass}`}
          >
            <Ban size={13} aria-hidden="true" />
            Revogar
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={isRevokePending}
              onClick={() => {
                setError(null);
                startRevoke(async () => {
                  const result = await revokeMcpTokenAction(id);
                  if ('error' in result) {
                    setError(result.error ?? 'Erro ao revogar token.');
                    return;
                  }
                  setIsRevoked(true);
                });
              }}
              className={`rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white ${focusRingClass}`}
            >
              {isRevokePending ? 'Revogando...' : 'Sim, revogar'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRevoke(false)}
              className={`rounded-md border px-2.5 py-1 text-[11px] ${focusRingClass}`}
            >
              Cancelar
            </button>
          </>
        )}
      </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      {token && (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Novo token. Esta é a única exibição.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 font-mono text-[11px] break-all">{token}</code>
            <button
              type="button"
              aria-label={copied ? 'Copiado' : 'Copiar token'}
              onClick={async () => {
                await navigator.clipboard.writeText(token);
                setCopied(true);
              }}
              className={`inline-flex items-center gap-1 text-[11px] ${focusRingClass}`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
