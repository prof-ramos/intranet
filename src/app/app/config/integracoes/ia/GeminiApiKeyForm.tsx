'use client';

import { useActionState, useEffect, useRef } from 'react';
import { KeyRound, Trash2, Save } from 'lucide-react';
import { saveGeminiApiKeyAction, deleteGeminiApiKeyAction } from './actions';
import { focusRingClass } from '@/lib/ui/tokens';

type Props = {
  isConfigured: boolean;
  source: 'env' | 'database' | null;
  updatedAt: Date | null;
};

const baseInputClass = `w-full rounded-md border border-[rgba(4,9,32,0.12)] bg-white px-3 py-2 text-sm text-[#040920] placeholder:text-[rgba(4,9,32,0.35)] ${focusRingClass}`;
const btnPrimary = `inline-flex items-center gap-2 rounded-md bg-[#040920] px-4 py-2 text-sm font-medium text-white hover:bg-[#06284f] disabled:opacity-50 ${focusRingClass}`;
const btnDanger = `inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 ${focusRingClass}`;

export function GeminiApiKeyForm({ isConfigured, source, updatedAt }: Props) {
  const [saveState, saveAction, savePending] = useActionState(saveGeminiApiKeyAction, null);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteGeminiApiKeyAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (saveState?.success) {
      formRef.current?.reset();
    }
  }, [saveState]);

  const envLocked = source === 'env';

  return (
    <div className="space-y-6">
      {/* Current status */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-2 w-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-red-400'}`}
          aria-hidden="true"
        />
        <span className="text-sm text-[rgba(13,31,60,0.75)]">
          {isConfigured ? (
            <>
              Chave configurada via{' '}
              <strong>{source === 'env' ? 'variável de ambiente' : 'banco de dados'}</strong>
              {updatedAt && (
                <> · atualizada em {new Date(updatedAt).toLocaleDateString('pt-BR')}</>
              )}
            </>
          ) : (
            'Nenhuma chave configurada'
          )}
        </span>
      </div>

      {envLocked ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          A chave está definida via variável de ambiente <code>GEMINI_API_KEY</code>. Para
          gerenciá-la aqui, remova a variável de ambiente e salve uma nova chave abaixo.
        </p>
      ) : (
        <form ref={formRef} action={saveAction} className="space-y-4">
          <div>
            <label htmlFor="gemini-api-key" className="mb-1 block text-sm font-medium text-[#040920]">
              Nova chave da API
            </label>
            <div className="relative">
              <KeyRound
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-[rgba(4,9,32,0.35)]"
                aria-hidden="true"
              />
              <input
                id="gemini-api-key"
                name="apiKey"
                type="password"
                className={`${baseInputClass} pl-9`}
                placeholder="AIzaSy..."
                autoComplete="off"
                spellCheck={false}
                required
              />
            </div>
            <p className="mt-1 text-xs text-[rgba(4,9,32,0.45)]">
              Obtenha sua chave em{' '}
              <span className="font-mono text-[#040920]">aistudio.google.com</span>. A chave é
              armazenada cifrada no banco de dados.
            </p>
          </div>

          {saveState && (
            <p
              role={saveState.success ? 'status' : 'alert'}
              aria-live="polite"
              className={`text-sm ${saveState.success ? 'text-green-700' : 'text-red-600'}`}
            >
              {saveState.message}
            </p>
          )}

          <button type="submit" className={btnPrimary} disabled={savePending}>
            <Save size={14} aria-hidden="true" />
            {savePending ? 'Salvando...' : 'Salvar chave'}
          </button>
        </form>
      )}

      {/* Remove button — only shown when key is in DB */}
      {isConfigured && source === 'database' && (
        <div className="border-t border-[rgba(4,9,32,0.06)] pt-5">
          <h3 className="mb-2 text-sm font-medium text-[#040920]">Remover chave</h3>
          <p className="mb-3 text-sm text-[rgba(13,31,60,0.65)]">
            Remove a chave do banco de dados. As funcionalidades de IA ficarão indisponíveis até
            que uma nova chave seja salva.
          </p>

          {deleteState && (
            <p
              role={deleteState.success ? 'status' : 'alert'}
              aria-live="polite"
              className={`mb-3 text-sm ${deleteState.success ? 'text-green-700' : 'text-red-600'}`}
            >
              {deleteState.message}
            </p>
          )}

          <form action={deleteAction}>
            <button type="submit" className={btnDanger} disabled={deletePending}>
              <Trash2 size={14} aria-hidden="true" />
              {deletePending ? 'Removendo...' : 'Remover chave'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
