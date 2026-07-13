'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { hairline } from '@/lib/ui/tokens';
import { isDomainError } from '@/lib/errors';
import type { DependentViewItem, HealthAgreementViewItem } from '@/lib/associates/profile';

function getDisplayMessage(err: unknown, fallback: string): string {
  if (isDomainError(err)) return err.message;
  return fallback;
}
import {
  addDependentAction,
  editDependentAction,
  removeDependentAction,
  addHealthAgreementAction,
  editHealthAgreementAction,
  removeHealthAgreementAction,
} from './actions';

// ─── Shared styles ───────────────────────────────────────────────────────

const btnSmall =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-[rgba(13,31,60,0.55)] transition-opacity hover:bg-[#f8fafc] hover:text-[#76aeea] focus-visible:opacity-100';
const inputStyle = {
  border: `1px solid ${hairline}`,
  borderRadius: '8px',
  height: '2.25rem',
  padding: '0 0.5rem',
  fontSize: '0.8125rem',
  width: '100%',
};

// ─── Dependent Manager ───────────────────────────────────────────────────

interface DependentManagerProps {
  associateId: number;
  items: DependentViewItem[];
}

export function DependentManager({ associateId, items }: DependentManagerProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addDependentAction(fd);
        setAdding(false);
      } catch (err) {
        setError(getDisplayMessage(err, 'Erro ao adicionar dependente.'));
      }
    });
  }

  function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await editDependentAction(fd);
        setEditingId(null);
      } catch (err) {
        setError(getDisplayMessage(err, 'Erro ao editar dependente.'));
      }
    });
  }

  function handleDelete(id: number) {
    setError('');
    const fd = new FormData();
    fd.set('id', String(id));
    fd.set('associateId', String(associateId));
    startTransition(async () => {
      try {
        await removeDependentAction(fd);
      } catch (err) {
        setError(getDisplayMessage(err, 'Erro ao remover dependente.'));
      }
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {items.map((dep) =>
        editingId === dep.id ? (
          <form key={dep.id} onSubmit={handleEdit} className="flex items-center gap-2">
            <input type="hidden" name="id" value={dep.id} />
            <input type="hidden" name="associateId" value={associateId} />
            <input name="name" aria-label="Nome do dependente" defaultValue={dep.name} required style={inputStyle} className="max-w-[180px]" />
            <input name="relationship" aria-label="Parentesco" defaultValue={dep.relationship} required style={inputStyle} className="max-w-[120px]" />
            <button type="submit" disabled={pending} className={btnSmall} aria-label="Salvar">
              <Check size={14} />
            </button>
            <button type="button" onClick={() => setEditingId(null)} className={btnSmall} aria-label="Cancelar">
              <X size={14} />
            </button>
          </form>
        ) : (
          <div key={dep.id} className="group flex items-center gap-2">
            <span className="text-sm">{dep.name}</span>
            <span className="text-xs" style={{ color: 'rgba(13,31,60,0.55)' }}>{dep.relationship}</span>
            <button type="button" onClick={() => setEditingId(dep.id)} className={`${btnSmall} opacity-0 group-hover:opacity-100`} aria-label="Editar dependente">
              <Pencil size={13} />
            </button>
            <button type="button" onClick={() => handleDelete(dep.id)} className={`${btnSmall} opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700`} aria-label="Remover dependente">
              <Trash2 size={13} />
            </button>
          </div>
        ),
      )}

      {adding && (
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input type="hidden" name="associateId" value={associateId} />
          <input name="name" aria-label="Nome do dependente" placeholder="Nome" required style={inputStyle} className="max-w-[180px]" />
          <input name="relationship" aria-label="Parentesco" placeholder="Parentesco" required style={inputStyle} className="max-w-[120px]" />
          <button type="submit" disabled={pending} className={btnSmall} aria-label="Adicionar">
            <Check size={14} />
          </button>
          <button type="button" onClick={() => setAdding(false)} className={btnSmall} aria-label="Cancelar">
            <X size={14} />
          </button>
        </form>
      )}

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#76aeea] hover:underline"
        >
          <Plus size={14} />
          Adicionar dependente
        </button>
      )}
    </div>
  );
}

// ─── Health Agreement Manager ───────────────────────────────────────────

interface HealthAgreementManagerProps {
  associateId: number;
  items: HealthAgreementViewItem[];
}

// ⚡ Bolt: Cache Intl.DateTimeFormat instance to avoid expensive object creation on every render cycle.
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return shortDateFormatter.format(d);
}

export function HealthAgreementManager({ associateId, items }: HealthAgreementManagerProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addHealthAgreementAction(fd);
        setAdding(false);
      } catch (err) {
        setError(getDisplayMessage(err, 'Erro ao adicionar convênio.'));
      }
    });
  }

  function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await editHealthAgreementAction(fd);
        setEditingId(null);
      } catch (err) {
        setError(getDisplayMessage(err, 'Erro ao editar convênio.'));
      }
    });
  }

  function handleDelete(id: number) {
    setError('');
    const fd = new FormData();
    fd.set('id', String(id));
    fd.set('associateId', String(associateId));
    startTransition(async () => {
      try {
        await removeHealthAgreementAction(fd);
      } catch (err) {
        setError(getDisplayMessage(err, 'Erro ao remover convênio.'));
      }
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {items.map((ha) =>
        editingId === ha.id ? (
          <form key={ha.id} onSubmit={handleEdit} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={ha.id} />
            <input type="hidden" name="associateId" value={associateId} />
            <input name="provider" aria-label="Nome do convênio" defaultValue={ha.provider} required style={inputStyle} className="max-w-[180px]" />
            <input name="startDate" aria-label="Data de início" type="date" defaultValue={ha.startDate ?? ''} style={inputStyle} className="max-w-[140px]" />
            <input name="endDate" aria-label="Data de fim" type="date" defaultValue={ha.endDate ?? ''} style={inputStyle} className="max-w-[140px]" />
            <button type="submit" disabled={pending} className={btnSmall} aria-label="Salvar">
              <Check size={14} />
            </button>
            <button type="button" onClick={() => setEditingId(null)} className={btnSmall} aria-label="Cancelar">
              <X size={14} />
            </button>
          </form>
        ) : (
          <div key={ha.id} className="group flex items-center gap-2">
            <span className="text-sm">{ha.provider}</span>
            {(ha.startDate || ha.endDate) && (
              <span className="text-xs" style={{ color: 'rgba(13,31,60,0.55)' }}>
                {ha.startDate && ha.endDate
                  ? `${formatDateShort(ha.startDate)} – ${formatDateShort(ha.endDate)}`
                  : ha.startDate
                    ? `Desde ${formatDateShort(ha.startDate)}`
                    : `Até ${formatDateShort(ha.endDate!)}`}
              </span>
            )}
            <button type="button" onClick={() => setEditingId(ha.id)} className={`${btnSmall} opacity-0 group-hover:opacity-100`} aria-label="Editar convênio">
              <Pencil size={13} />
            </button>
            <button type="button" onClick={() => handleDelete(ha.id)} className={`${btnSmall} opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700`} aria-label="Remover convênio">
              <Trash2 size={13} />
            </button>
          </div>
        ),
      )}

      {adding && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="associateId" value={associateId} />
          <input name="provider" aria-label="Nome do convênio" placeholder="Convênio" required style={inputStyle} className="max-w-[180px]" />
          <input name="startDate" aria-label="Data de início" type="date" style={inputStyle} className="max-w-[140px]" />
          <input name="endDate" aria-label="Data de fim" type="date" style={inputStyle} className="max-w-[140px]" />
          <button type="submit" disabled={pending} className={btnSmall} aria-label="Adicionar">
            <Check size={14} />
          </button>
          <button type="button" onClick={() => setAdding(false)} className={btnSmall} aria-label="Cancelar">
            <X size={14} />
          </button>
        </form>
      )}

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#76aeea] hover:underline"
        >
          <Plus size={14} />
          Adicionar convênio
        </button>
      )}
    </div>
  );
}
