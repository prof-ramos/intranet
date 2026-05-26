'use client';

import { useActionState, useState } from 'react';
import { updateAssignment } from './actions';
import { Pencil } from 'lucide-react';
import { focusRingClass } from '@/lib/ui/tokens';

interface AssignmentEditRowProps {
  id: number;
  name: string;
  type: 'nacional' | 'exterior';
}

export function AssignmentEditRow({ id, name, type }: AssignmentEditRowProps) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateAssignment, null);

  // Correctly handle state transitions during render
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.success) {
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`inline-flex items-center gap-1.5 rounded-md border border-[rgba(4,9,32,0.1)] bg-white px-3 py-1.5 text-xs font-medium text-[#040920] transition-colors hover:bg-gray-50 ${focusRingClass}`}
      >
        <Pencil size={13} aria-hidden="true" />
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
        <option value="nacional">Secretaria de Estado</option>
        <option value="exterior">Exterior</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className={`rounded-md bg-[#040920] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0d3260] disabled:opacity-50 ${focusRingClass}`}
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className={`rounded-md border border-[rgba(4,9,32,0.1)] px-3 py-1.5 text-xs font-medium text-[rgba(13,31,60,0.6)] transition-colors hover:bg-gray-50 ${focusRingClass}`}
      >
        Cancelar
      </button>
      {state?.success === false && <span className="text-xs text-red-600">{state.message}</span>}
    </form>
  );
}
