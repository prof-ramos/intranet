'use client';

import { LogOut, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { logout } from '@/lib/auth/actions';


function SubmitLogoutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#b91c1c] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#991b1b] focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Saindo...
        </>
      ) : (
        'Sair'
      )}
    </button>
  );
}

export function LogoutButton() {
  return (
    <>
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-white/50 transition-colors duration-150 hover:text-white"
        onClick={() => {
          const dialog = document.getElementById('logout-modal') as HTMLDialogElement;
          dialog?.showModal();
        }}
      >
        <LogOut size={16} aria-hidden="true" />
        Sair
      </button>

      <dialog id="logout-modal" className="modal" aria-labelledby="logout-modal-title">
        <div className="modal-box">
          <h3 id="logout-modal-title" className="font-serif text-lg font-bold">
            Encerrar sessão
          </h3>
          <p className="py-4">Deseja realmente sair do sistema?</p>
          <div className="modal-action">
            <form method="dialog">
              <button className="inline-flex items-center justify-center rounded-[8px] text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 focus-visible:outline-none">
                Cancelar
              </button>
            </form>
            <form action={logout}>
              <SubmitLogoutButton />
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>fechar</button>
        </form>
      </dialog>
    </>
  );
}
