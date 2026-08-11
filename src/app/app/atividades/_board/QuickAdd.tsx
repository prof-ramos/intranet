'use client';

import { Plus } from 'lucide-react';
import { memo, useEffect, useRef, useState, useTransition } from 'react';
import {
  borderMuted,
  buttonPrimaryText,
  focusRingClass,
  inputBg,
  mobileTouchTargetClass,
  navy,
  slateText,
  textStrong,
} from '@/lib/ui/tokens';
import type { Status } from './types';

export const QuickAdd = memo(function QuickAdd({
  columnKey,
  onAdd,
}: {
  columnKey: Status;
  onAdd: (title: string, status: Status) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || isPending) return;
    startTransition(async () => {
      try {
        await onAdd(trimmed, columnKey);
        setTitle('');
        setOpen(false);
      } catch {
        // Parent surface renders the error feedback; keep the editor open for retry.
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          'mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-dashed text-xs font-medium',
          mobileTouchTargetClass,
          focusRingClass,
        ].join(' ')}
        style={{ color: slateText, borderColor: borderMuted }}
      >
        <Plus size={14} aria-hidden="true" />
        Adicionar
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-[8px] border bg-white p-2" style={{ borderColor: borderMuted }}>
      <textarea
        ref={inputRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
          if (event.key === 'Escape') {
            setOpen(false);
            setTitle('');
          }
        }}
        placeholder="Título da atividade..."
        aria-label="Título da nova atividade"
        className={[
          'min-h-14 w-full resize-none rounded-[6px] bg-transparent text-[13px]',
          focusRingClass,
        ].join(' ')}
        style={{ color: textStrong }}
      />
      <div className="mt-1 flex gap-1.5">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isPending}
          className={[
            'min-h-10 flex-1 rounded-[8px] px-4 text-[13px] font-semibold',
            focusRingClass,
          ].join(' ')}
          style={{ background: navy, color: buttonPrimaryText }}
        >
          {isPending ? 'Salvando...' : 'Adicionar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle('');
          }}
          disabled={isPending}
          className={[
            'min-h-10 rounded-[8px] border px-4 text-[13px] font-semibold',
            focusRingClass,
          ].join(' ')}
          style={{ color: textStrong, borderColor: borderMuted, background: inputBg }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
});
