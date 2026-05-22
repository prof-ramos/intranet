'use client';

import { useState, useTransition } from 'react';
import { RotateCcw, Ban, Copy, Check, AlertTriangle } from 'lucide-react';
import { focusRingClass } from '@/lib/ui/tokens';
import { revokeApiKeyAction, rotateApiKeyAction } from './actions';

interface NewKeyAfterRotationProps {
  rawKey: string;
  onDismiss: () => void;
}

function NewKeyAfterRotation({ rawKey, onDismiss }: NewKeyAfterRotationProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div role="alert" className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-900">
            Nova chave gerada. Esta é a única vez que ela será exibida.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 rounded-md border border-amber-200 bg-white px-2.5 py-1.5 font-mono text-[11px] break-all text-[#040920] select-all">
              {rawKey}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copiado' : 'Copiar nova chave'}
              className={`inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-amber-900 transition-colors hover:bg-amber-100 ${focusRingClass}`}
            >
              {copied ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                <Copy size={12} aria-hidden="true" />
              )}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onDismiss}
          className={`text-[11px] font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 ${focusRingClass}`}
        >
          Entendido, fechar
        </button>
      </div>
    </div>
  );
}

interface ApiKeyActionsPanelProps {
  id: number;
  isActive: boolean;
}

export function ApiKeyActionsPanel({ id, isActive: initialIsActive }: ApiKeyActionsPanelProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const [isRevokePending, startRevokeTransition] = useTransition();
  const [isRotatePending, startRotateTransition] = useTransition();

  function handleRevoke() {
    setRevokeError(null);
    startRevokeTransition(async () => {
      const result = await revokeApiKeyAction(id);
      if ('error' in result) {
        setRevokeError(result.error ?? 'Erro ao revogar chave.');
      } else {
        setIsActive(false);
        setConfirmRevoke(false);
      }
    });
  }

  function handleRotate() {
    setRotateError(null);
    setRotatedKey(null);
    startRotateTransition(async () => {
      const result = await rotateApiKeyAction(id);
      if ('error' in result) {
        setRotateError(result.error ?? 'Erro ao rotacionar chave.');
      } else {
        setRotatedKey(result.data.key);
      }
    });
  }

  if (!isActive) {
    return <span className="text-xs font-medium text-[rgba(13,31,60,0.40)]">Revogada</span>;
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRotate}
          disabled={isRotatePending}
          className={`inline-flex items-center gap-1.5 rounded-md border border-[rgba(4,9,32,0.1)] bg-white px-3 py-1.5 text-xs font-medium text-[#040920] transition-colors hover:bg-[rgba(13,31,60,0.04)] disabled:opacity-50 ${focusRingClass}`}
        >
          <RotateCcw size={13} aria-hidden="true" />
          {isRotatePending ? 'Rotacionando...' : 'Rotacionar'}
        </button>

        {!confirmRevoke ? (
          <button
            type="button"
            onClick={() => setConfirmRevoke(true)}
            className={`inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 ${focusRingClass}`}
          >
            <Ban size={13} aria-hidden="true" />
            Revogar
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[rgba(13,31,60,0.65)]">Confirmar?</span>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={isRevokePending}
              className={`inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 ${focusRingClass}`}
            >
              {isRevokePending ? 'Revogando...' : 'Sim, revogar'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRevoke(false)}
              className={`rounded-md border border-[rgba(4,9,32,0.1)] bg-white px-2.5 py-1 text-[11px] font-medium text-[#040920] transition-colors hover:bg-[rgba(13,31,60,0.04)] ${focusRingClass}`}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {revokeError && (
        <p role="alert" className="text-xs text-red-600">
          {revokeError}
        </p>
      )}
      {rotateError && (
        <p role="alert" className="text-xs text-red-600">
          {rotateError}
        </p>
      )}

      {rotatedKey && (
        <NewKeyAfterRotation rawKey={rotatedKey} onDismiss={() => setRotatedKey(null)} />
      )}
    </div>
  );
}
