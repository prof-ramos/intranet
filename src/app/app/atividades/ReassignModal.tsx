'use client';

import { useEffect, useRef, useState } from 'react';
import { focusRingClass } from '@/lib/ui/tokens';

export interface ReassignModalPerson {
  id: number;
  name: string;
  role: string;
}

export interface ReassignModalActivity {
  id: number;
  title: string;
  assigneeId: number | null;
}

interface ReassignModalProps {
  activity: ReassignModalActivity;
  people: ReassignModalPerson[];
  onClose: () => void;
  onSubmit: (toUserId: number, message: string) => void;
}

export function ReassignModal({ activity, people, onClose, onSubmit }: ReassignModalProps) {
  const candidates = people.filter((person) => person.id !== activity.assigneeId);
  // Apenas o primeiro candidato válido, ou null
  const [toUserId, setToUserId] = useState<number | null>(candidates[0]?.id ?? null);
  const [message, setMessage] = useState('');
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      <button
        aria-label="Fechar modal"
        className="fixed inset-0 z-[60] cursor-default"
        style={{ backgroundColor: 'rgba(4,9,32,0.45)' }}
        type="button"
        onClick={onClose}
      />
      <div
        className="rounded-[16px] fixed top-1/2 left-1/2 z-[61] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2"
        style={{ background: '#ffffff', boxShadow: '0 24px 60px #04092040' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassign-modal-title"
      >
        <header className="border-b border-[rgba(4,9,32,0.05)] px-6 py-5">
          <p className="text-[rgba(13,31,60,0.55)] m-0 text-[11px] tracking-[0.16em] uppercase">
            Reatribuir atividade
          </p>
          <h3 id="reassign-modal-title" className="mt-1.5 font-serif text-xl leading-tight font-bold">
            {activity.title}
          </h3>
        </header>
        <div className="flex flex-col gap-4 p-6">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Atribuir a
            <select
              value={toUserId?.toString() ?? ''}
              onChange={(event) => setToUserId(event.target.value ? Number(event.target.value) : null)}
              className={`h-10 w-full rounded-[8px] border border-[#e2e8f0] bg-white px-3 text-sm ${focusRingClass}`}
            >
              {candidates.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} - {person.role}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Mensagem opcional
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              placeholder="Por que você está repassando?"
              className={`w-full rounded-[8px] border border-[#e2e8f0] bg-white p-3 text-sm ${focusRingClass}`}
            />
          </label>
          <p className="bg-[#f8fafc] text-[rgba(13,31,60,0.70)] m-0 rounded-[8px] p-3 text-xs leading-relaxed">
            A pessoa precisa aceitar antes da atribuição mudar. A atividade fica marcada até a
            confirmação.
          </p>
        </div>
        <footer className="flex justify-end gap-2 px-6 pb-5">
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className={`inline-flex items-center justify-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 h-11 text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] lg:h-8 ${focusRingClass}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => toUserId !== null && onSubmit(toUserId, message)}
            className={`inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-5 h-11 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] lg:h-8 ${focusRingClass}`}
            disabled={toUserId === null || !candidates.some((c) => c.id === toUserId)}
          >
            Solicitar
          </button>
        </footer>
      </div>
    </>
  );
}
