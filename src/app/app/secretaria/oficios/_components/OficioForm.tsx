'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { officialLetterFormSchema, type OfficialLetterFormValues } from '@/lib/oficios/validations';
import { saveOfficialLetterAction, updateOfficialLetterAction } from '../actions';
import { OficioAiModal } from './OficioAiModal';
import { OficioFormFields } from './OficioFormFields';

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
  recipientAddress: '',
  recipientCity: '',
  recipientZip: '',
};

export function OficioForm({ initialData, id }: OficioFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSubmitPending, startSubmitTransition] = useTransition();

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

  const onSubmit = (values: OfficialLetterFormValues) => {
    setSubmitError(null);
    startSubmitTransition(async () => {
      const result = id
        ? await updateOfficialLetterAction(id, values)
        : await saveOfficialLetterAction(values);

      if (result.success) {
        router.push('/app/secretaria/oficios');
        return;
      }

      setSubmitError(result.error ?? 'Falha ao salvar o ofício.');
    });
  };

  const openAiModal = () => {
    setAiError(null);
    setAiInstruction(bodyPlainText);
    setIsAiModalOpen(true);
  };

  const closeAiModal = () => {
    setIsAiModalOpen(false);
    setAiInstruction('');
    setAiError(null);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OficioFormFields
          register={register}
          errors={errors}
          setValue={setValue}
          bodyRichText={bodyRichText}
          bodyPlainText={bodyPlainText}
          onOpenAiModal={openAiModal}
          submitError={submitError}
          isSubmitPending={isSubmitPending}
          isEditing={Boolean(id)}
          onCancel={() => router.back()}
        />
      </form>

      <OficioAiModal
        isOpen={isAiModalOpen}
        onClose={closeAiModal}
        instruction={aiInstruction}
        onInstructionChange={setAiInstruction}
        error={aiError}
        onErrorChange={setAiError}
        getValues={getValues}
        setValue={setValue}
      />
    </div>
  );
}
