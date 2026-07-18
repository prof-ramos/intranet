'use client';

import { useTransition } from 'react';
import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { AlertCircle, Loader2, Sparkles, X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import type { OfficialLetterFormValues } from '@/lib/oficios/validations';
import { hairline, focusRingClass, navy } from '@/lib/ui/tokens';
import { generateAiTextAction } from '../actions';

interface OficioAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  instruction: string;
  onInstructionChange: (value: string) => void;
  error: string | null;
  onErrorChange: (value: string | null) => void;
  getValues: UseFormGetValues<OfficialLetterFormValues>;
  setValue: UseFormSetValue<OfficialLetterFormValues>;
}

function textToParagraphHtml(text: string) {
  const escapeHtml = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function OficioAiModal({
  isOpen,
  onClose,
  instruction,
  onInstructionChange,
  error,
  onErrorChange,
  getValues,
  setValue,
}: OficioAiModalProps) {
  const [isPending, startTransition] = useTransition();

  useEscapeKey(onClose, isOpen);

  const handleGenerate = () => {
    if (!instruction.trim()) return;
    onErrorChange(null);
    const currentValues = getValues();
    startTransition(async () => {
      const result = await generateAiTextAction({
        recipient: currentValues.recipient,
        recipientRole: currentValues.recipientRole,
        subject: currentValues.subject,
        itamaratySector: currentValues.itamaratySector,
        signatory: currentValues.signatoryName,
        signatoryRole: currentValues.signatoryRole,
        instruction,
      });

      if (result.success && result.text) {
        setValue('bodyPlainText', result.text, { shouldDirty: true, shouldValidate: true });
        setValue('bodyRichText', textToParagraphHtml(result.text), {
          shouldDirty: true,
          shouldValidate: true,
        });
        onClose();
        return;
      }

      onErrorChange(result.error ?? 'Falha ao gerar sugestão.');
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl motion-safe:duration-200"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'rgba(4,9,32,0.06)' }}
            >
              <Sparkles size={20} style={{ color: navy }} aria-hidden="true" />
            </div>
            <div>
              <h3 id="ai-modal-title" className="font-serif text-xl font-bold">
                Auxiliar com IA
              </h3>
              <p className="mt-0.5 text-[10px] tracking-widest text-slate-400 uppercase">
                Gemini 3.5 Flash
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar modal"
            onClick={onClose}
            className={`rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700 ${focusRingClass}`}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <p className="mb-3 text-sm leading-relaxed text-slate-600">
          O conteúdo atual do corpo do ofício foi carregado abaixo como referência. Edite ou
          substitua para orientar a IA. Os campos de destinatário e assunto já preenchidos serão
          usados como contexto.
        </p>

        <textarea
          id="ai-instruction"
          aria-label="Instrução para a IA"
          value={instruction}
          onChange={(event) => onInstructionChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              handleGenerate();
            }
          }}
          className={`mb-1 min-h-[120px] w-full resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed ${focusRingClass}`}
          style={{ borderColor: hairline }}
          placeholder="Ex: Solicitar ao MRE a lista atualizada de associados lotados na Embaixada em Paris para fins de recadastramento..."
          disabled={isPending}
        />

        <p className="mb-4 text-right text-[11px] text-slate-400">
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px]">
            Ctrl
          </kbd>
          {' + '}
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px]">
            Enter
          </kbd>
          {' para gerar'}
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`h-11 rounded-xl px-6 text-sm font-semibold transition-colors hover:bg-slate-50 ${focusRingClass}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending || !instruction.trim()}
            className={`flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-xl px-8 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 ${focusRingClass}`}
            style={{ backgroundColor: navy }}
            aria-busy={isPending}
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />
                <span>Gerando…</span>
              </>
            ) : (
              <>
                <Sparkles size={16} aria-hidden="true" />
                <span>Gerar Sugestão</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
