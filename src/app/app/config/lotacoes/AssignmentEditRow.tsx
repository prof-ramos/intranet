'use client';

import { useActionState, useEffect, useState } from 'react';
import { updateAssignment } from './actions';
import { Pencil } from 'lucide-react';

interface AssignmentEditRowProps {
  id: number;
  name: string;
  type: 'domestic' | 'abroad';
}

export function AssignmentEditRow({ id, name, type }: AssignmentEditRowProps) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateAssignment, null);

  useEffect(() => {
    if (state?.success) {
      setEditing(false);
    }
  }, [state]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(4,9,32,0.1)] bg-white px-3 py-1.5 text-xs font-medium text-[#040920] hover:bg-gray-50 transition-colors"
      >
        <Pencil size={13} />
        Editar
      </button>
    );
  }

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="name"
        type="text"
        defaultValue={name}
        required
        minLength={2}
        className="input input-sm w-48"
      />
      <select name="type" defaultValue={type} className="select select-sm w-40">
        <option value="domestic">Secretaria de Estado</option>
        <option value="abroad">Exterior</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#040920] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0d3260] transition-colors disabled:opacity-50"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="rounded-md border border-[rgba(4,9,32,0.1)] px-3 py-1.5 text-xs font-medium text-[rgba(13,31,60,0.6)] hover:bg-gray-50 transition-colors"
      >
        Cancelar
      </button>
      {state?.success === false && (
        <span className="text-xs text-red-600">{state.message}</span>
      )}
    </form>
  );
}
