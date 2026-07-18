'use client';

import { LogOut, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { logout } from '@/lib/auth/actions';

export function LogoutButton() {
  return (
    <>
      <button
        type="button"
        className="flex items-center gap-2 rounded-[4px] text-sm text-white/50 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06284f]"
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
              <button className="inline-flex h-11 items-center justify-center rounded-[8px] px-5 text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 focus-visible:outline-none">
                Cancelar
              </button>
            </form>
            <form action={logout}>
              <LogoutSubmitButton />
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button tabIndex={-1} aria-label="Fechar modal">fechar</button>
        </form>
      </dialog>
    </>
  );
}


function LogoutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#b91c1c] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#991b1b] focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-80"
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
