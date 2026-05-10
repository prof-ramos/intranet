'use client';

import { useEffect, useRef, useState } from 'react';

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
        className="rounded-box fixed top-1/2 left-1/2 z-[61] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2"
        style={{ background: '#ffffff', boxShadow: '0 24px 60px #04092040' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassign-modal-title"
      >
        <header className="border-base-300 border-b px-6 py-5">
          <p className="text-base-content/55 m-0 text-[11px] tracking-[0.16em] uppercase">
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
              className="select select-bordered select-sm bg-white"
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
              className="textarea textarea-bordered bg-white text-sm"
            />
          </label>
          <p className="bg-base-100 text-base-content/70 m-0 rounded-[8px] p-3 text-xs leading-relaxed">
            A pessoa precisa aceitar antes da atribuição mudar. A atividade fica marcada até a
            confirmação.
          </p>
        </div>
        <footer className="flex justify-end gap-2 px-6 pb-5">
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className="btn btn-outline min-h-11 lg:btn-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => toUserId !== null && onSubmit(toUserId, message)}
            className="btn btn-primary min-h-11 lg:btn-sm"
            disabled={toUserId === null || !candidates.some((c) => c.id === toUserId)}
          >
            Solicitar
          </button>
        </footer>
      </div>
    </>
  );
}
