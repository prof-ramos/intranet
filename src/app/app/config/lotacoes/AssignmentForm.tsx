'use client';

import { useActionState, useEffect } from 'react';
import { createAssignment, updateAssignment } from './actions';

interface AssignmentFormProps {
  mode: 'create' | 'edit';
  id?: number;
  defaultName?: string;
  defaultType?: 'domestic' | 'abroad';
  onSuccess?: () => void;
}

export function AssignmentForm({
  mode,
  id,
  defaultName = '',
  defaultType = 'domestic',
  onSuccess,
}: AssignmentFormProps) {
  const action = mode === 'create' ? createAssignment : updateAssignment;
  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success && onSuccess) {
      onSuccess();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === 'edit' && <input type="hidden" name="id" value={id} />}

      <fieldset className="fieldset">
        <legend className="fieldset-legend text-sm font-medium text-[#040920]">Nome</legend>
        <input
          name="name"
          type="text"
          defaultValue={defaultName}
          required
          minLength={2}
          placeholder="Ex: Embaixada em Washington"
          className="input w-full"
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend text-sm font-medium text-[#040920]">Tipo</legend>
        <select name="type" defaultValue={defaultType} className="select w-full">
          <option value="domestic">Secretaria de Estado</option>
          <option value="abroad">Exterior</option>
        </select>
      </fieldset>

      {state?.success === false && <p className="text-sm text-red-600">{state.message}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : mode === 'create' ? 'Criar lotação' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
