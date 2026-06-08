'use client';

import { useState, useMemo, useTransition } from 'react';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { officialLetterFormSchema, type OfficialLetterFormValues } from '@/lib/oficios/validations';
import {
  saveOfficialLetterAction,
  updateOfficialLetterAction,
  generateAiTextAction,
} from '../actions';
import { Sparkles, Save, X, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { checkImpersonality, type ImpersonalityWarning } from '@/lib/oficios/utils';
import { navy, primaryContainerHover, hairline, focusRingClass, error, warning, warningBg, warningBorder, warningText } from '@/lib/ui/tokens';
import { CSSProperties } from 'react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(
  () => import('./RichTextEditor').then((mod) => mod.RichTextEditor),
  { ssr: false, loading: () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-slate-100" /> }
);

interface OficioFormProps {
  initialData?: Partial<OfficialLetterFormValues>;
  id?: number;
}

const defaultFormValues: Partial<OfficialLetterFormValues> = {
  letterDate: new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  closure: 'Atenciosamente,',
  bodyRichText: '',
  bodyPlainText: '',
};

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

export function OficioForm({ initialData, id }: OficioFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiError, setAiError]           = useState<string | null>(null);
  const [isAiPending, startAiTransition] = useTransition();
  const [isSubmitPending, startSubmitTransition] = useTransition();

  const closeAiModal = () => {
    setIsAiModalOpen(false);
    setAiInstruction('');
    setAiError(null);
  };
  useEscapeKey(closeAiModal, isAiModalOpen);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<OfficialLetterFormValues>({
    resolver: zodResolver(officialLetterFormSchema),
    defaultValues: { ...defaultFormValues, ...initialData },
  });
  const bodyRichText = useWatch({ control, name: 'bodyRichText' }) ?? '';
  const bodyPlainText = useWatch({ control, name: 'bodyPlainText' }) ?? '';

  const impersonalityWarnings = useMemo<ImpersonalityWarning[]>(
    () => (bodyPlainText.trim() ? checkImpersonality(bodyPlainText) : []),
    [bodyPlainText],
  );

  const onSubmit = (values: OfficialLetterFormValues) => {
    setSubmitError(null);
    startSubmitTransition(async () => {
      const res = id
        ? await updateOfficialLetterAction(id, values)
        : await saveOfficialLetterAction(values);

      if (res.success) {
        router.push('/app/secretaria/oficios');
      } else {
        setSubmitError(res.error ?? 'Falha ao salvar o ofício.');
      }
    });
  };

  const handleGenerateAi = () => {
    if (!aiInstruction.trim()) return;
    setAiError(null);
    const currentValues = getValues();
    startAiTransition(async () => {
      const res = await generateAiTextAction({
        recipient:       currentValues.recipient,
        recipientRole:   currentValues.recipientRole,
        subject:         currentValues.subject,
        itamaratySector: currentValues.itamaratySector,
        instruction:     aiInstruction,
      });
      if (res.success && res.text) {
        setValue('bodyPlainText', res.text, { shouldDirty: true, shouldValidate: true });
        setValue('bodyRichText', textToParagraphHtml(res.text), {
          shouldDirty: true,
          shouldValidate: true,
        });
        closeAiModal();
      } else {
        setAiError(res.error ?? 'Falha ao gerar sugestão.');
      }
    });
  };

  const handleAiKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerateAi();
    }
  };

  const inputClass = `w-full rounded-lg border px-4 py-2.5 text-sm transition-colors ${focusRingClass}`;
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5';

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Destinatário */}
        <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: hairline }}>
          <h2 className="mb-4 font-serif text-lg font-bold">Destinatário</h2>

          <div>
            <label htmlFor="recipient" className={labelClass}>Nome do Destinatário</label>
            <input
              id="recipient"
              {...register('recipient')}
              className={inputClass}
              placeholder="Ex: Ministro das Relações Exteriores"
            />
            {errors.recipient && (
              <p className="mt-1 text-xs" style={{ color: error }}>{errors.recipient.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="recipientRole" className={labelClass}>Cargo</label>
              <input
                id="recipientRole"
                {...register('recipientRole')}
                className={inputClass}
                placeholder="Ex: Ministro de Estado"
              />
              {errors.recipientRole && (
                <p className="mt-1 text-xs" style={{ color: error }}>{errors.recipientRole.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="vocativo" className={labelClass}>Vocativo</label>
              <input
                id="vocativo"
                {...register('vocativo')}
                className={inputClass}
                placeholder="Ex: Senhor Ministro"
              />
              {errors.vocativo && (
                <p className="mt-1 text-xs" style={{ color: error }}>{errors.vocativo.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="itamaratySector" className={labelClass}>Setor Itamaraty</label>
            <input
              id="itamaratySector"
              {...register('itamaratySector')}
              className={inputClass}
              placeholder="Ex: SGPR / SGP"
            />
            {errors.itamaratySector && (
              <p className="mt-1 text-xs" style={{ color: error }}>{errors.itamaratySector.message}</p>
            )}
          </div>
        </div>

        {/* Informações do Ofício */}
        <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: hairline }}>
          <h2 className="mb-4 font-serif text-lg font-bold">Informações do Ofício</h2>

          <div>
            <label htmlFor="subject" className={labelClass}>Assunto</label>
            <input
              id="subject"
              {...register('subject')}
              className={inputClass}
              placeholder="Ex: Solicitação de dados funcionais"
            />
            {errors.subject && (
              <p className="mt-1 text-xs" style={{ color: error }}>{errors.subject.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="letterDate" className={labelClass}>Data do Documento</label>
              <input id="letterDate" {...register('letterDate')} className={inputClass} />
              {errors.letterDate && (
                <p className="mt-1 text-xs" style={{ color: error }}>{errors.letterDate.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="closure" className={labelClass}>Fecho</label>
              <select id="closure" {...register('closure')} className={inputClass}>
                <option value="Atenciosamente,">Atenciosamente,</option>
                <option value="Respeitosamente,">Respeitosamente,</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="signatoryName" className={labelClass}>Nome do Signatário</label>
              <input id="signatoryName" {...register('signatoryName')} className={inputClass} />
              {errors.signatoryName && (
                <p className="mt-1 text-xs" style={{ color: error }}>{errors.signatoryName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="signatoryRole" className={labelClass}>Cargo do Signatário</label>
              <input id="signatoryRole" {...register('signatoryRole')} className={inputClass} />
              {errors.signatoryRole && (
                <p className="mt-1 text-xs" style={{ color: error }}>{errors.signatoryRole.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Corpo do Ofício */}
        <div
          className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2"
          style={{ borderColor: hairline }}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-serif text-lg font-bold">Corpo do Ofício</h2>
            <button
              type="button"
              onClick={() => { setAiError(null); setIsAiModalOpen(true); }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors ${focusRingClass}`}
              style={{
                background: 'rgba(4,9,32,0.06)',
                color: navy,
              }}
            >
              <Sparkles size={13} aria-hidden="true" />
              Auxiliar com IA
            </button>
          </div>

          <input type="hidden" {...register('bodyRichText')} />
          <input type="hidden" {...register('bodyPlainText')} />
          <RichTextEditor
            valueHtml={bodyRichText}
            error={errors.bodyPlainText?.message ?? errors.bodyRichText?.message}
            onChange={({ html, text }) => {
              setValue('bodyRichText', html, { shouldDirty: true, shouldValidate: true });
              setValue('bodyPlainText', text, { shouldDirty: true, shouldValidate: true });
            }}
          />
          {errors.bodyRichText && (
            <p className="mt-1 text-xs" style={{ color: error }}>{errors.bodyRichText.message}</p>
          )}
          {errors.bodyPlainText && (
            <p className="mt-1 text-xs" style={{ color: error }}>{errors.bodyPlainText.message}</p>
          )}
          {impersonalityWarnings.length > 0 && (
            <div className="mt-3 rounded-lg border px-4 py-3" style={{ backgroundColor: warningBg, borderColor: warningBorder }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="flex-shrink-0" style={{ color: warning }} aria-hidden="true" />
                <p className="text-xs font-semibold" style={{ color: warningText }}>Linguagem pessoal/coloquial detectada</p>
              </div>
              <ul className="space-y-1">
                {impersonalityWarnings.map((w) => (
                  <li key={w.term} className="text-xs" style={{ color: warningText }}>
                    <span className="font-medium">{w.term}</span> — {w.suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Rodapé do formulário */}
        <div className="flex flex-col items-end gap-3 lg:col-span-2">
          {submitError && (
            <div
              role="alert"
              className="flex w-full items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              {submitError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className={`h-11 rounded-xl border px-8 text-sm font-semibold transition-colors hover:bg-slate-50 ${focusRingClass}`}
              style={{ borderColor: hairline }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitPending}
              className={`flex h-11 items-center gap-2 rounded-xl px-10 text-sm font-bold text-white transition-all hover:bg-[var(--primary-hover)] disabled:opacity-50 ${focusRingClass}`}
              style={{ backgroundColor: navy, '--primary-hover': primaryContainerHover } as CSSProperties}
            >
              {isSubmitPending ? (
                <Loader2 className="motion-safe:animate-spin" size={17} aria-hidden="true" />
              ) : (
                <Save size={17} aria-hidden="true" />
              )}
              {id ? 'Atualizar Ofício' : 'Salvar Ofício'}
            </button>
          </div>
        </div>
      </form>

      {/* Modal IA */}
      {isAiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeAiModal(); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-modal-title"
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl motion-safe:duration-200"
            style={{ overscrollBehavior: 'contain' }}
          >
            {/* Cabeçalho do modal */}
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
                    Gemini 2.5 Flash
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={closeAiModal}
                className={`rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700 ${focusRingClass}`}
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            <p className="mb-3 text-sm leading-relaxed text-slate-600">
              Descreva em linguagem natural o que o ofício deve comunicar. Os campos de destinatário
              e assunto já preenchidos serão usados como contexto.
            </p>

            <textarea
              id="ai-instruction"
              aria-label="Instrução para a IA"
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              onKeyDown={handleAiKeyDown}
              className={`mb-1 min-h-[120px] w-full rounded-xl border px-4 py-3 text-sm leading-relaxed resize-none ${focusRingClass}`}
              style={{ borderColor: hairline }}
              placeholder="Ex: Solicitar ao MRE a lista atualizada de associados lotados na Embaixada em Paris para fins de recadastramento..."
              disabled={isAiPending}
            />

            <p className="mb-4 text-right text-[11px] text-slate-400">
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px]">Ctrl</kbd>
              {' + '}
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px]">Enter</kbd>
              {' para gerar'}
            </p>

            {/* Erro inline */}
            {aiError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                {aiError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeAiModal}
                className={`h-11 rounded-xl px-6 text-sm font-semibold transition-colors hover:bg-slate-50 ${focusRingClass}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={isAiPending || !aiInstruction.trim()}
                className={`flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-xl px-8 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 ${focusRingClass}`}
                style={{ backgroundColor: navy }}
                aria-busy={isAiPending}
              >
                {isAiPending ? (
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
      )}
    </div>
  );
}
