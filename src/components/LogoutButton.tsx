'use client';

import { LogOut } from 'lucide-react';
import { logout } from '@/lib/auth/actions';

export function LogoutButton() {
  return (
    <>
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors duration-150"
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
          <h3 id="logout-modal-title" className="font-serif text-lg font-bold">Encerrar sessão</h3>
          <p className="py-4">Deseja realmente sair do sistema?</p>
          <div className="modal-action">
            <form method="dialog">
              <button className="inline-flex items-center justify-center rounded-[8px] text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2">Cancelar</button>
            </form>
            <form action={logout}>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#b91c1c] px-5 h-11 text-sm font-semibold text-white transition-colors hover:bg-[#991b1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2">Sair</button>
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
