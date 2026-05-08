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
              <button className="btn btn-ghost">Cancelar</button>
            </form>
            <form action={logout}>
              <button type="submit" className="btn btn-error">Sair</button>
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
