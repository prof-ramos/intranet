'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { officialLetterFormSchema, type OfficialLetterFormValues } from '@/lib/oficios/validations';
import { saveOfficialLetterAction, updateOfficialLetterAction, generateAiTextAction } from '../actions';
import { Sparkles, Save, X, Loader2 } from 'lucide-react';
import { PremiumLoader } from '@/components/PremiumLoader';
import { navy, primaryContainerHover, hairline, focusRingClass } from '@/lib/ui/tokens';
import { CSSProperties } from 'react';

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

export function OficioForm({ initialData, id }: OficioFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!isAiModalOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsAiModalOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAiModalOpen]);

  const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<OfficialLetterFormValues>({
    resolver: zodResolver(officialLetterFormSchema),
    defaultValues: { ...defaultFormValues, ...initialData },
  });

  const onSubmit = async (values: OfficialLetterFormValues) => {
    setIsPending(true);
    try {
      const res = id 
        ? await updateOfficialLetterAction(id, values)
        : await saveOfficialLetterAction(values);
      
      if (res.success) {
        router.push('/app/secretaria/oficios');
      } else {
        alert(res.error);
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleGenerateAi = async () => {
    if (!aiInstruction) return;
    setIsAiLoading(true);
    const currentValues = getValues();
    const params = {
      recipient: currentValues.recipient,
      recipientRole: currentValues.recipientRole,
      subject: currentValues.subject,
      itamaratySector: currentValues.itamaratySector,
      instruction: aiInstruction,
    };

    const res = await generateAiTextAction(params);
    if (res.success && res.text) {
      setValue('bodyPlainText', res.text);
      setValue('bodyRichText', res.text); // Sync for now
      setIsAiModalOpen(false);
      setAiInstruction('');
    } else {
      alert(res.error);
    }
    setIsAiLoading(false);
  };

  const inputClass = `w-full rounded-lg border px-4 py-2.5 text-sm transition-colors ${focusRingClass}`;
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5";

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recipient Details */}
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border" style={{ borderColor: hairline }}>
          <h2 className="font-serif text-lg font-bold mb-4">Destinatário</h2>
          
          <div>
            <label htmlFor="recipient" className={labelClass}>Nome do Destinatário</label>
            <input id="recipient" {...register('recipient')} className={inputClass} placeholder="Ex: Ministro das Relações Exteriores" />
            {errors.recipient && <p className="mt-1 text-xs text-error">{errors.recipient.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="recipientRole" className={labelClass}>Cargo</label>
              <input id="recipientRole" {...register('recipientRole')} className={inputClass} placeholder="Ex: Ministro de Estado" />
              {errors.recipientRole && <p className="mt-1 text-xs text-error">{errors.recipientRole.message}</p>}
            </div>
            <div>
              <label htmlFor="vocativo" className={labelClass}>Vocativo</label>
              <input id="vocativo" {...register('vocativo')} className={inputClass} placeholder="Ex: Senhor Ministro" />
              {errors.vocativo && <p className="mt-1 text-xs text-error">{errors.vocativo.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="itamaratySector" className={labelClass}>Setor Itamaraty</label>
            <input id="itamaratySector" {...register('itamaratySector')} className={inputClass} placeholder="Ex: SGPR / SGP" />
            {errors.itamaratySector && <p className="mt-1 text-xs text-error">{errors.itamaratySector.message}</p>}
          </div>
        </div>

        {/* Document Details */}
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border" style={{ borderColor: hairline }}>
          <h2 className="font-serif text-lg font-bold mb-4">Informações do Ofício</h2>
          
          <div>
            <label htmlFor="subject" className={labelClass}>Assunto</label>
            <input id="subject" {...register('subject')} className={inputClass} placeholder="Ex: Solicitação de dados funcionais" />
            {errors.subject && <p className="mt-1 text-xs text-error">{errors.subject.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="letterDate" className={labelClass}>Data do Documento</label>
              <input id="letterDate" {...register('letterDate')} className={inputClass} />
              {errors.letterDate && <p className="mt-1 text-xs text-error">{errors.letterDate.message}</p>}
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
              {errors.signatoryName && <p className="mt-1 text-xs text-error">{errors.signatoryName.message}</p>}
            </div>
            <div>
              <label htmlFor="signatoryRole" className={labelClass}>Cargo do Signatário</label>
              <input id="signatoryRole" {...register('signatoryRole')} className={inputClass} />
              {errors.signatoryRole && <p className="mt-1 text-xs text-error">{errors.signatoryRole.message}</p>}
            </div>
          </div>
        </div>

        {/* Body Text */}
        <div className="lg:col-span-2 space-y-4 rounded-2xl bg-white p-6 shadow-sm border" style={{ borderColor: hairline }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-bold">Corpo do Ofício</h2>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className={`flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-navy hover:bg-slate-200 transition-colors ${focusRingClass}`}
            >
              <Sparkles size={14} className="text-purple-600" aria-hidden="true" /> Auxiliar com IA
            </button>
          </div>

          <textarea
            {...register('bodyPlainText')}
            className={`min-h-[300px] w-full rounded-lg border p-4 text-sm font-sans leading-relaxed ${focusRingClass}`}
            placeholder="Escreva aqui o conteúdo do ofício..."
            onChange={(e) => {
              register('bodyPlainText').onChange(e);
              setValue('bodyRichText', e.target.value);
            }}
          />
          {errors.bodyPlainText && <p className="mt-1 text-xs text-error">{errors.bodyPlainText.message}</p>}
        </div>

        <div className="lg:col-span-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className={`h-11 rounded-xl border px-8 text-sm font-semibold hover:bg-slate-50 transition-colors ${focusRingClass}`}
            style={{ borderColor: hairline }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={`flex h-11 items-center gap-2 rounded-xl px-10 text-sm font-bold text-white transition-all hover:bg-[var(--primary-hover)] disabled:opacity-50 ${focusRingClass}`}
            style={{ backgroundColor: navy, '--primary-hover': primaryContainerHover } as CSSProperties}
          >
            {isPending ? <Loader2 className="motion-safe:animate-spin" size={18} /> : <Save size={18} />}
            {id ? 'Atualizar Ofício' : 'Salvar Ofício'}
          </button>
        </div>
      </form>

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-modal-title"
            style={{ overscrollBehavior: 'contain' }}
            className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in motion-safe:duration-200"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 id="ai-modal-title" className="font-serif text-xl font-bold">Auxiliar com IA</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Sugestão Gemini 2.5 Flash</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setIsAiModalOpen(false)}
                className={`text-slate-400 hover:text-navy ${focusRingClass}`}
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-600">Diga em linguagem natural o que deseja comunicar neste ofício:</p>
            
            <textarea
              id="ai-instruction"
              aria-label="Instrução para IA"
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              className={`mb-6 min-h-[120px] w-full rounded-xl border p-4 text-sm ${focusRingClass}`}
              placeholder="Ex: Solicitar ao MRE a lista atualizada de associados lotados na Embaixada em Paris para fins de recadastramento..."
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className={`h-11 rounded-xl px-6 text-sm font-semibold hover:bg-slate-50 transition-colors ${focusRingClass}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateAi}
                disabled={isAiLoading || !aiInstruction}
                className={`flex min-w-[200px] h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-navy px-8 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 ${focusRingClass}`}
              >
                {isAiLoading ? (
                  <div className="scale-75 brightness-200">
                    <PremiumLoader />
                  </div>
                ) : (
                  <>
                    <Sparkles size={18} />
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
