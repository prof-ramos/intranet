'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { AlertCircle, AlertTriangle, Loader2, Save, Sparkles } from 'lucide-react';
import type { OfficialLetterFormValues } from '@/lib/oficios/validations';
import { checkImpersonality, type ImpersonalityWarning } from '@/lib/oficios/utils';
import {
  error,
  focusRingClass,
  hairline,
  navy,
  primaryContainerHover,
  warning,
  warningBg,
  warningBorder,
  warningText,
  textMuted,
  surfaceMuted,
  cardBorder,
} from '@/lib/ui/tokens';

const RichTextEditor = dynamic(() => import('./RichTextEditor').then((mod) => mod.RichTextEditor), {
  ssr: false,
  loading: () => (
    <div
      className="h-[300px] w-full animate-pulse rounded-lg"
      style={{ backgroundColor: surfaceMuted }}
    />
  ),
});

interface OficioFormFieldsProps {
  register: UseFormRegister<OfficialLetterFormValues>;
  errors: FieldErrors<OfficialLetterFormValues>;
  setValue: UseFormSetValue<OfficialLetterFormValues>;
  bodyRichText: string;
  bodyPlainText: string;
  onOpenAiModal: () => void;
  submitError: string | null;
  isSubmitPending: boolean;
  isEditing: boolean;
  onCancel: () => void;
}

interface FormSectionProps {
  register: UseFormRegister<OfficialLetterFormValues>;
  errors: FieldErrors<OfficialLetterFormValues>;
}

interface BodySectionProps extends FormSectionProps {
  setValue: UseFormSetValue<OfficialLetterFormValues>;
  bodyRichText: string;
  bodyPlainText: string;
  onOpenAiModal: () => void;
}

const labelClass = 'mb-1.5 block text-xs font-bold tracking-wider uppercase';
const labelStyle = { color: textMuted };
const inputClass = `w-full rounded-lg border px-4 py-2.5 text-sm transition-colors ${focusRingClass}`;
const sectionClass = 'space-y-4 rounded-2xl border bg-white p-6';

export function OficioFormFields({
  register,
  errors,
  setValue,
  bodyRichText,
  bodyPlainText,
  onOpenAiModal,
  submitError,
  isSubmitPending,
  isEditing,
  onCancel,
}: OficioFormFieldsProps) {
  return (
    <>
      <RecipientSection register={register} errors={errors} />
      <DocumentSection register={register} errors={errors} />
      <BodySection
        register={register}
        errors={errors}
        setValue={setValue}
        bodyRichText={bodyRichText}
        bodyPlainText={bodyPlainText}
        onOpenAiModal={onOpenAiModal}
      />
      <FormFooter
        submitError={submitError}
        isSubmitPending={isSubmitPending}
        isEditing={isEditing}
        onCancel={onCancel}
      />
    </>
  );
}

function RecipientSection({ register, errors }: FormSectionProps) {
  return (
    <div className={sectionClass} style={{ border: cardBorder }}>
      <h2 className="mb-4 font-serif text-lg font-bold">Destinatário</h2>

      <div>
        <label htmlFor="recipient" className={labelClass} style={labelStyle}>
          Nome do Destinatário
        </label>
        <input
          id="recipient"
          {...register('recipient')}
          className={inputClass}
          placeholder="Ex: Ministro das Relações Exteriores"
        />
        {errors.recipient && <FieldError message={errors.recipient.message} />}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="recipientRole" className={labelClass} style={labelStyle}>
            Cargo
          </label>
          <input
            id="recipientRole"
            {...register('recipientRole')}
            className={inputClass}
            placeholder="Ex: Ministro de Estado"
          />
          {errors.recipientRole && <FieldError message={errors.recipientRole.message} />}
        </div>
        <div>
          <label htmlFor="vocativo" className={labelClass} style={labelStyle}>
            Vocativo
          </label>
          <input
            id="vocativo"
            {...register('vocativo')}
            className={inputClass}
            placeholder="Ex: Senhor Ministro"
          />
          {errors.vocativo && <FieldError message={errors.vocativo.message} />}
        </div>
      </div>

      <div>
        <label htmlFor="itamaratySector" className={labelClass} style={labelStyle}>
          Setor Itamaraty
        </label>
        <input
          id="itamaratySector"
          {...register('itamaratySector')}
          className={inputClass}
          placeholder="Ex: SGPR / SGP"
        />
        {errors.itamaratySector && <FieldError message={errors.itamaratySector.message} />}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="recipientAddress" className={labelClass} style={labelStyle}>
            Endereço
          </label>
          <input
            id="recipientAddress"
            {...register('recipientAddress')}
            className={inputClass}
            placeholder="Ex: Palácio Itamaraty"
          />
          {errors.recipientAddress && <FieldError message={errors.recipientAddress.message} />}
        </div>
        <div>
          <label htmlFor="recipientCity" className={labelClass} style={labelStyle}>
            Cidade
          </label>
          <input
            id="recipientCity"
            {...register('recipientCity')}
            className={inputClass}
            placeholder="Ex: Brasília/DF"
          />
          {errors.recipientCity && <FieldError message={errors.recipientCity.message} />}
        </div>
      </div>

      <div>
        <label htmlFor="recipientZip" className={labelClass} style={labelStyle}>
          CEP
        </label>
        <input
          id="recipientZip"
          {...register('recipientZip')}
          className={inputClass}
          placeholder="Ex: 70170-900"
        />
        {errors.recipientZip && <FieldError message={errors.recipientZip.message} />}
      </div>
    </div>
  );
}

function DocumentSection({ register, errors }: FormSectionProps) {
  return (
    <div className={sectionClass} style={{ border: cardBorder }}>
      <h2 className="mb-4 font-serif text-lg font-bold">Informações do Ofício</h2>

      <div>
        <label htmlFor="subject" className={labelClass} style={labelStyle}>
          Assunto
        </label>
        <input
          id="subject"
          {...register('subject')}
          className={inputClass}
          placeholder="Ex: Solicitação de dados funcionais"
        />
        {errors.subject && <FieldError message={errors.subject.message} />}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="letterDate" className={labelClass} style={labelStyle}>
            Data do Documento
          </label>
          <input id="letterDate" {...register('letterDate')} className={inputClass} />
          {errors.letterDate && <FieldError message={errors.letterDate.message} />}
        </div>
        <div>
          <label htmlFor="closure" className={labelClass} style={labelStyle}>
            Fecho
          </label>
          <select id="closure" {...register('closure')} className={inputClass}>
            <option value="Atenciosamente,">Atenciosamente,</option>
            <option value="Respeitosamente,">Respeitosamente,</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="signatoryName" className={labelClass} style={labelStyle}>
            Nome do Signatário
          </label>
          <input id="signatoryName" {...register('signatoryName')} className={inputClass} />
          {errors.signatoryName && <FieldError message={errors.signatoryName.message} />}
        </div>
        <div>
          <label htmlFor="signatoryRole" className={labelClass} style={labelStyle}>
            Cargo do Signatário
          </label>
          <input id="signatoryRole" {...register('signatoryRole')} className={inputClass} />
          {errors.signatoryRole && <FieldError message={errors.signatoryRole.message} />}
        </div>
      </div>
    </div>
  );
}

function BodySection({
  register,
  errors,
  setValue,
  bodyRichText,
  bodyPlainText,
  onOpenAiModal,
}: BodySectionProps) {
  const [editorOpen, setEditorOpen] = useState(() => Boolean(bodyRichText?.trim()));
  const impersonalityWarnings = useMemo<ImpersonalityWarning[]>(
    () => (bodyPlainText.trim() ? checkImpersonality(bodyPlainText) : []),
    [bodyPlainText],
  );

  return (
    <div className={`${sectionClass} lg:col-span-2`} style={{ border: cardBorder }}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-serif text-lg font-bold">Corpo do Ofício</h2>
        <button
          type="button"
          onClick={onOpenAiModal}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors ${focusRingClass}`}
          style={{ background: 'rgba(4,9,32,0.06)', color: navy }}
        >
          <Sparkles size={13} aria-hidden="true" />
          Auxiliar com IA
        </button>
      </div>

      <input type="hidden" {...register('bodyRichText')} />
      <input type="hidden" {...register('bodyPlainText')} />
      {editorOpen ? (
        <RichTextEditor
          valueHtml={bodyRichText}
          error={errors.bodyPlainText?.message ?? errors.bodyRichText?.message}
          onChange={({ html, text }) => {
            setValue('bodyRichText', html, { shouldDirty: true, shouldValidate: true });
            setValue('bodyPlainText', text, { shouldDirty: true, shouldValidate: true });
          }}
        />
      ) : (
        <button
          type="button"
          className={`flex min-h-[160px] w-full flex-col items-start justify-center rounded-lg border border-dashed px-4 py-6 text-left transition-colors hover:bg-[rgba(4,9,32,0.02)] ${focusRingClass}`}
          style={{ borderColor: hairline, color: textMuted }}
          onClick={() => setEditorOpen(true)}
        >
          <span className="text-sm font-medium" style={{ color: navy }}>
            Editar formatação
          </span>
          <span className="mt-1 text-xs">
            Carrega o editor rico sob demanda (~126 KiB). Clique para começar.
          </span>
          {bodyPlainText ? (
            <span className="mt-3 line-clamp-4 text-sm whitespace-pre-wrap" style={{ color: navy }}>
              {bodyPlainText}
            </span>
          ) : null}
        </button>
      )}
      {errors.bodyRichText && <FieldError message={errors.bodyRichText.message} />}
      {errors.bodyPlainText && <FieldError message={errors.bodyPlainText.message} />}

      {impersonalityWarnings.length > 0 && (
        <div
          className="mt-3 rounded-lg border px-4 py-3"
          style={{ backgroundColor: warningBg, borderColor: warningBorder }}
        >
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle
              size={14}
              className="flex-shrink-0"
              style={{ color: warning }}
              aria-hidden="true"
            />
            <p className="text-xs font-semibold" style={{ color: warningText }}>
              Linguagem pessoal/coloquial detectada
            </p>
          </div>
          <ul className="space-y-1">
            {impersonalityWarnings.map((warningItem) => (
              <li key={warningItem.term} className="text-xs" style={{ color: warningText }}>
                <span className="font-medium">{warningItem.term}</span> — {warningItem.suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FormFooter({
  submitError,
  isSubmitPending,
  isEditing,
  onCancel,
}: Pick<OficioFormFieldsProps, 'submitError' | 'isSubmitPending' | 'isEditing' | 'onCancel'>) {
  return (
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
          onClick={onCancel}
          className={`h-11 rounded-xl border px-8 text-sm font-semibold transition-colors duration-150 hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
          style={{ borderColor: hairline }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitPending}
          className={`flex h-11 items-center gap-2 rounded-xl px-10 text-sm font-bold text-white transition-all hover:bg-[var(--primary-hover)] disabled:opacity-50 ${focusRingClass}`}
          style={
            { backgroundColor: navy, '--primary-hover': primaryContainerHover } as CSSProperties
          }
        >
          {isSubmitPending ? (
            <Loader2 className="motion-safe:animate-spin" size={17} aria-hidden="true" />
          ) : (
            <Save size={17} aria-hidden="true" />
          )}
          {isEditing ? 'Atualizar Ofício' : 'Salvar Ofício'}
        </button>
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return (
    <p className="mt-1 text-xs" style={{ color: error }}>
      {message}
    </p>
  );
}
